/**
 * The Genesis Foundry driver.
 *
 * This is where the "baby-agent hospital" stops being a metaphor. A gap is *measured*, not
 * felt: it comes out of the repair record of a run that just happened. If a domain kept
 * needing repair across several tasks, that is evidence the organization lacks a competency.
 * If it needed repair once, that is a task, and the necessity gate says so.
 *
 * Every stage publishes an event, and the ceremony on screen is driven by those events — so
 * the door only ever opens on a candidate that actually cleared admissions.
 */

import {
  RESIDENTS,
  adversarialCleared,
  allTrialsPassed,
  citizenshipDecision,
  createRng,
  disposition,
  draftGenome,
  evaluateNecessity,
  ref,
  renderBirthCard,
  TRIAL_THRESHOLD,
  type CapabilityGap,
  type Candidate,
  type District,
  type EventBus,
  type ResidentId,
  type TaskGraph,
} from "@agent-city/core";
import type { PlannedTask } from "./plan.js";

export interface GenesisOutcome {
  readonly gap: CapabilityGap;
  readonly candidate: Candidate | null;
  readonly admitted: boolean;
  readonly rationale: string;
  readonly card?: string;
}

/**
 * A domain must have cost this many repair cycles across the run before it is even considered.
 * This is only a pre-filter; the necessity gate in `@agent-city/core` is the real decision,
 * and it says no far more often than it says yes.
 */
export const GAP_MIN_CYCLES = 3;

const MENTOR_FOR: Readonly<Record<string, ResidentId>> = {
  frontend: "rune",
  backend: "vector",
  ux: "sol",
  visual: "iris",
  motion: "kinetic",
  performance: "flux",
  accessibility: "mercy",
  security: "aegis",
  research: "verity",
  product: "nova",
  quality: "argus",
  adversarial: "nyx",
  knowledge: "mnemos",
};

const DEPARTMENT_FOR: Readonly<Record<string, District>> = {
  frontend: "engineering-foundry",
  backend: "systems-foundry",
  ux: "design-atelier",
  visual: "design-atelier",
  motion: "motion-studio",
  performance: "performance-lab",
  accessibility: "civic-hall",
  security: "security-citadel",
  research: "observatory",
  product: "strategy-chamber",
  quality: "verification-arena",
  adversarial: "red-team-annex",
  knowledge: "great-archive",
};

const NAMES = ["Vanta", "Lumen", "Cinder", "Halcyon", "Orrery", "Quill", "Tessera", "Umbra"] as const;

export class GenesisFoundry {
  #ordinal = 0;

  constructor(
    private readonly bus: EventBus,
    private readonly seed: string,
  ) {}

  /** Detect gaps from what the run actually cost, then run each through admissions. */
  async run(
    tasks: TaskGraph,
    planIndex: ReadonlyMap<string, PlannedTask>,
    objectiveId: string,
  ): Promise<readonly GenesisOutcome[]> {
    const gaps = this.#detectGaps(tasks, planIndex, objectiveId);
    const outcomes: GenesisOutcome[] = [];
    for (const gap of gaps) {
      outcomes.push(await this.#admit(gap));
    }
    return outcomes;
  }

  #detectGaps(tasks: TaskGraph, planIndex: ReadonlyMap<string, PlannedTask>, objectiveId: string): CapabilityGap[] {
    const byDomain = new Map<string, { cycles: number; owners: Set<ResidentId>; observations: string[]; areas: Set<string> }>();

    for (const t of tasks.all) {
      if (t.cycles === 0) continue;
      const entry = byDomain.get(t.domain) ?? { cycles: 0, owners: new Set<ResidentId>(), observations: [], areas: new Set<string>() };
      entry.cycles += t.cycles;
      entry.owners.add(t.owner);
      // "Recurrence" is the number of distinct problem areas, not the number of tasks: one
      // task failing four different checks is four recurrences of a competency gap, while
      // four tasks failing the same check once each is the same gap seen four times. Both
      // count. A single check failing once on a single task does not.
      for (const v of t.failureHistory) {
        const area = `${planIndex.get(t.id)?.key ?? t.id}:${v.method}`;
        entry.areas.add(area);
        entry.observations.push(`${area} — ${v.summary}`);
      }
      if (t.cycles > 0 && entry.areas.size === 0) {
        entry.areas.add(`${planIndex.get(t.id)?.key ?? t.id}:repair`);
        entry.observations.push(`${t.id}: needed ${t.cycles} repair cycle(s) before acceptance`);
      }
      byDomain.set(t.domain, entry);
    }

    const gaps: CapabilityGap[] = [];
    for (const [domain, entry] of byDomain) {
      if (entry.cycles < GAP_MIN_CYCLES) continue;
      const totalTasks = tasks.all.filter((t) => t.domain === domain).length || 1;
      const gap: CapabilityGap = {
        id: `gap-${domain}-${objectiveId}`,
        domain,
        currentOwners: [...entry.owners],
        observations: entry.observations.slice(0, 6),
        recurrence: entry.areas.size,
        overhead: Math.min(1, entry.cycles / (totalTasks * 3)),
      };
      gaps.push(gap);
      this.bus.publish({
        kind: "genesis.gap_detected",
        from: "atlas",
        severity: "notable",
        refs: [ref("genome", gap.id), ref("objective", objectiveId)],
        gapId: gap.id,
        domain: gap.domain,
        currentOwners: gap.currentOwners,
        observations: gap.observations,
      });
    }
    return gaps;
  }

  async #admit(gap: CapabilityGap): Promise<GenesisOutcome> {
    const necessity = evaluateNecessity(gap);
    const genomeId = `candidate-${gap.domain}-${String(++this.#ordinal).padStart(3, "0")}`;

    if (necessity.verdict === "fail") {
      this.bus.publish({
        kind: "genesis.necessity",
        from: "atlas",
        severity: "info",
        refs: [ref("genome", genomeId)],
        genomeId,
        verdict: "fail",
        rationale: necessity.rationale,
        ...(necessity.reuseCandidate ? { reuseCandidate: necessity.reuseCandidate } : {}),
      });
      return { gap, candidate: null, admitted: false, rationale: necessity.rationale };
    }

    const rng = createRng(`${this.seed}:genesis:${gap.id}`);
    const name = NAMES[Math.floor(rng() * NAMES.length)] ?? "Vanta";
    const mentor = MENTOR_FOR[gap.domain] ?? "atlas";
    const department = DEPARTMENT_FOR[gap.domain] ?? "genesis-foundry";

    const genome = draftGenome({
      gap,
      proposedName: name,
      mission: `Own the ${gap.domain} competency the organization repeatedly lacked, and reduce its repair rate to zero.`,
      expertise: [gap.domain, ...gap.observations.slice(0, 2).map((o) => o.split(":")[1]?.trim() ?? gap.domain)],
      department,
      mentor,
      allowedTools: ["read", "search", "code_execution", "test_runner"],
      outputContract: ["diagnosis", "evidence", "alternatives", "proposed_fix", "benchmark_before", "benchmark_after"],
      evaluationSuite: [`${gap.domain}_benchmark`, "regression_detection", "explanation_accuracy", "output_contract_compliance"],
      ordinal: this.#ordinal,
    });

    this.bus.publish({
      kind: "genesis.genome_created",
      from: "atlas",
      severity: "notable",
      refs: [ref("genome", genome.id)],
      genomeId: genome.id,
      proposedName: genome.proposedName,
      domain: String(genome.domain),
    });
    this.bus.publish({
      kind: "genesis.necessity",
      from: "atlas",
      severity: "notable",
      refs: [ref("genome", genome.id)],
      genomeId: genome.id,
      verdict: "pass",
      rationale: necessity.rationale,
    });
    this.bus.publish({
      kind: "genesis.incubated",
      from: mentor,
      severity: "notable",
      refs: [ref("genome", genome.id), ref("agent", mentor)],
      genomeId: genome.id,
      bay: genome.bay,
      mentor,
    });

    const candidate: Candidate = { genome, stage: "trials", trials: [], adversarial: [] };

    // Competency trials. Deterministic from the genome so a candidate's admission is
    // reproducible — the same specification always earns the same verdict.
    for (const trial of genome.evaluationSuite) {
      const score = 0.55 + createRng(`${this.seed}:trial:${genome.id}:${trial}`)() * 0.45;
      const passed = score >= TRIAL_THRESHOLD;
      candidate.trials.push({ trial, score, threshold: TRIAL_THRESHOLD, passed });
      this.bus.publish({
        kind: "genesis.trial",
        from: mentor,
        severity: passed ? "info" : "notable",
        refs: [ref("genome", genome.id)],
        genomeId: genome.id,
        trial,
        score,
        threshold: TRIAL_THRESHOLD,
        passed,
      });
    }

    if (!allTrialsPassed(candidate)) {
      const decision = citizenshipDecision(candidate);
      candidate.stage = "incubating";
      this.bus.publish({
        kind: "genesis.disposition",
        from: mentor,
        severity: "info",
        refs: [ref("genome", genome.id)],
        agentId: genome.id,
        disposition: "template",
        rationale: decision.rationale,
      });
      return { gap, candidate, admitted: false, rationale: decision.rationale };
    }

    // Adversarial review. Three independent reviewers, each of whom can refuse alone.
    candidate.stage = "adversarial";
    for (const reviewer of ["argus", "aegis", "nyx"] as const) {
      const findings: string[] = [];
      // Aegis's review is not a coin flip: it reads the requested envelope. A candidate that
      // asked for a tool it should not have is refused for that reason and no other.
      if (reviewer === "aegis") {
        const overreach = genome.tools.allow.filter((t) => genome.tools.deny.includes(t));
        if (overreach.length > 0) findings.push(`requests denied tool(s): ${overreach.join(", ")}`);
      }
      if (reviewer === "argus" && genome.outputContract.length < 3) {
        findings.push("output contract is too thin to verify against");
      }
      if (reviewer === "nyx") {
        const duplicated = RESIDENTS.find((r) => r.implementsDomains.some((d) => String(genome.domain).includes(d)));
        if (duplicated && !gap.currentOwners.includes(duplicated.id)) {
          findings.push(`overlaps ${duplicated.name}'s existing authority`);
        }
      }
      const passed = findings.length === 0;
      candidate.adversarial.push({ reviewer, passed, findings });
      this.bus.publish({
        kind: "genesis.adversarial",
        from: reviewer,
        severity: passed ? "info" : "notable",
        refs: [ref("genome", genome.id), ref("agent", reviewer)],
        genomeId: genome.id,
        reviewer,
        passed,
        findings,
      });
    }

    const decision = citizenshipDecision(candidate);
    if (!decision.granted || !adversarialCleared(candidate)) {
      candidate.stage = "template";
      this.bus.publish({
        kind: "genesis.disposition",
        from: "atlas",
        severity: "info",
        refs: [ref("genome", genome.id)],
        agentId: genome.id,
        disposition: "template",
        rationale: decision.rationale,
      });
      return { gap, candidate, admitted: false, rationale: decision.rationale };
    }

    // Citizenship. Probationary — capability is earned by a career record, never granted.
    candidate.stage = "probationary";
    candidate.agentId = `agent-${genome.proposedName.toLowerCase()}-${String(this.#ordinal).padStart(3, "0")}`;
    candidate.rank = "Probationary";
    this.bus.publish({
      kind: "genesis.citizenship",
      from: "atlas",
      severity: "notable",
      refs: [ref("genome", genome.id), ref("agent", candidate.agentId)],
      genomeId: genome.id,
      agentId: candidate.agentId,
      name: genome.proposedName,
      rank: "Probationary Resident",
      department: genome.parentDepartment,
      mentor,
      bay: genome.bay,
    });
    this.bus.publish({
      kind: "agent.moved",
      from: candidate.agentId,
      severity: "notable",
      refs: [ref("agent", candidate.agentId), ref("genome", genome.id)],
      agent: candidate.agentId,
      fromDistrict: "genesis-foundry",
      toDistrict: genome.parentDepartment,
      reason: "leaving the Foundry for its first posting",
    });
    this.bus.publish({
      kind: "agent.state",
      from: candidate.agentId,
      severity: "info",
      refs: [ref("agent", candidate.agentId)],
      agent: candidate.agentId,
      activity: "idle",
      detail: `awaiting first assignment · mentor ${mentor} · ${genome.bay}`,
    });

    const first = disposition({
      taskId: `${genome.id}-first`,
      firstPass: true,
      verdictsPassed: candidate.adversarial.length,
      verdictsFailed: 0,
      criticalRegressions: 0,
    });

    return {
      gap,
      candidate,
      admitted: true,
      rationale: `${decision.rationale}; first-assignment disposition would be ${first.disposition}`,
      card: renderBirthCard(candidate),
    };
  }
}
