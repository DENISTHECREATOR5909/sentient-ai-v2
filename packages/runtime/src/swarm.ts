/**
 * The Research Cloud.
 *
 * An orchestrator-worker fan-out: one lead decomposes a question into genuinely independent
 * branches, investigators work those branches in parallel without talking to each other, and
 * the lead synthesises. Workers not conversing is deliberate — cross-talk between parallel
 * investigators is how a swarm converges on one plausible answer instead of finding the
 * disagreement that was the reason to fan out at all.
 *
 * Fan-out is earned, not assumed: `planAllocation` decides the configuration, and a question
 * that does not decompose gets a single investigator.
 */

import {
  DegradationLedger,
  EvidenceLedger,
  planAllocation,
  ref,
  type EventBus,
  type ModelRoute,
  type ResidentId,
  type Tracer,
} from "@agent-city/core";
import type { Executor, ResearchFinding, ResearchQuestion } from "./executor.js";

export interface SwarmResult {
  readonly swarmId: string;
  /** Ids of claims the swarm could not stand behind. Resolving these is follow-on work. */
  readonly contestedClaimIds: readonly string[];
  readonly workers: number;
  readonly findings: readonly ResearchFinding[];
  readonly summary: string;
  readonly claims: readonly { claim: string; pointers: readonly string[]; substantiated: boolean }[];
  readonly contradictions: readonly string[];
  readonly sources: number;
  readonly tokensIn: number;
  readonly tokensOut: number;
}

export interface SwarmOptions {
  readonly bus: EventBus;
  readonly executor: Executor;
  readonly tracer: Tracer;
  readonly evidence: EvidenceLedger;
  readonly degradations: DegradationLedger;
  readonly lead: ResidentId;
  readonly leadRoute: ModelRoute;
  readonly swarmId: string;
}

export async function runSwarm(question: ResearchQuestion, opts: SwarmOptions): Promise<SwarmResult> {
  const { bus, executor, tracer, evidence, lead, leadRoute, swarmId } = opts;

  const allocation = planAllocation("deep_research", lead, {
    independentBranches: question.branches.length,
    dependencyDepth: 1,
    uncertainty: 0.8,
    consequence: 0.7,
  });

  const workerCount = Math.max(1, Math.min(allocation.workers, question.branches.length));
  const branches = question.branches.slice(0, workerCount);
  const span = tracer.start("research_swarm", {
    "foundry.swarm.id": swarmId,
    "foundry.swarm.workers": workerCount,
    "foundry.swarm.rationale": allocation.rationale,
  });

  bus.publish({
    kind: "swarm.spawned",
    from: lead,
    severity: "notable",
    refs: [ref("swarm", swarmId)],
    swarmId,
    lead,
    workers: workerCount,
    question: question.question,
    model: allocation.route.model,
  });
  bus.publish({
    kind: "agent.state",
    from: lead,
    severity: "info",
    refs: [ref("swarm", swarmId), ref("agent", lead)],
    agent: lead,
    activity: "researching",
    detail: `${workerCount} investigator(s): ${allocation.rationale}`,
  });

  // Investigators run concurrently and never see each other's work — that independence is the
  // only reason a second investigator is worth paying for.
  const findings = await Promise.all(
    branches.map(async (branch, i) => {
      const worker = `${swarmId}-w${String(i + 1).padStart(2, "0")}`;
      const wSpan = tracer.modelCall({
        model: allocation.route.model,
        operation: "chat",
        agent: worker,
        effort: allocation.route.effort ?? undefined,
      });
      try {
        const finding = await executor.investigate(branch, worker, question, allocation.route);
        tracer.end(wSpan, "ok");
        bus.publish({
          kind: "swarm.worker.reported",
          from: worker,
          severity: "info",
          refs: [ref("swarm", swarmId)],
          swarmId,
          worker,
          findings: 1,
          sources: finding.sources.length,
        });
        return finding;
      } catch (err) {
        tracer.end(wSpan, "error", err instanceof Error ? err.message : String(err));
        // A lost investigator is a lost branch, and the synthesis must say so rather than
        // quietly covering a smaller area than the plan claimed.
        opts.degradations.record(
          `research branch "${branch}"`,
          `investigator on ${allocation.route.model}`,
          "branch abandoned",
          `"${branch}" was never investigated (${err instanceof Error ? err.message : String(err)})`,
        );
        return null;
      }
    }),
  );

  const good = findings.filter((f): f is ResearchFinding => f !== null);
  const synthesis = await executor.synthesize(question, good, leadRoute);

  for (const c of synthesis.contradictions) {
    bus.publish({
      kind: "swarm.contradiction",
      from: lead,
      severity: "notable",
      refs: [ref("swarm", swarmId)],
      swarmId,
      claim: c,
      sources: good.flatMap((f) => f.sources).slice(0, 4),
    });
  }

  // Research claims are recorded with their provenance. None of them is ever `verified`:
  // only executed evidence reaches that status, and a citation is not an execution.
  //   • sources, and the investigator stood behind it   → `sourced`
  //   • sources, but the investigator would not         → `contested`, needing resolution
  //   • no sources at all                               → `unsubstantiated`, which blocks
  const contestedIds: string[] = [];
  for (const claim of synthesis.claims) {
    evidence.registerAll(claim.pointers);
    const status = claim.pointers.length === 0 ? "unsubstantiated" : claim.substantiated ? "sourced" : "contested";
    const recorded = evidence.record({
      claim: claim.claim,
      status,
      pointers: claim.pointers,
      recordedBy: lead,
    });
    if (status === "contested") contestedIds.push(recorded.id);
  }

  const sources = new Set(good.flatMap((f) => f.sources)).size;
  bus.publish({
    kind: "swarm.synthesized",
    from: lead,
    severity: "notable",
    refs: [ref("swarm", swarmId)],
    swarmId,
    lead,
    claims: synthesis.claims.length,
    sources,
    contradictions: synthesis.contradictions.length,
  });
  bus.publish({
    kind: "swarm.dissolved",
    from: lead,
    severity: "info",
    refs: [ref("swarm", swarmId)],
    swarmId,
    workers: workerCount,
  });
  tracer.end(span, "ok");

  return {
    swarmId,
    contestedClaimIds: contestedIds,
    workers: workerCount,
    findings: good,
    summary: synthesis.summary,
    claims: synthesis.claims,
    contradictions: synthesis.contradictions,
    sources,
    tokensIn: synthesis.tokensIn,
    tokensOut: synthesis.tokensOut,
  };
}
