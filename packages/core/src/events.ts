/**
 * Structured events — the organization's only communication substrate.
 *
 * Agents do not converse in free text and they never publish raw chain of thought. They
 * publish typed events with explicit ownership, severity and artifact references. Two things
 * consume this stream: the orchestrator (which reacts) and the city renderer (which draws).
 * Because both read the same stream, the world on screen cannot drift from the world in
 * memory — that is Article 9 made structural rather than aspirational.
 */

import type { ResidentId } from "./residents.js";
import type { ArticleId } from "./constitution.js";

export type Severity = "info" | "notable" | "degraded" | "release_blocking";

/** Anything the city may draw must name the runtime entity it depicts. */
export type CorrespondenceKind =
  | "task"
  | "agent"
  | "artifact"
  | "swarm"
  | "worktree"
  | "gate"
  | "genome"
  | "evidence"
  | "release"
  | "objective";

export interface CorrespondenceRef {
  readonly kind: CorrespondenceKind;
  readonly id: string;
}

export function ref(kind: CorrespondenceKind, id: string): CorrespondenceRef {
  return { kind, id };
}

export type AgentActivity =
  | "idle"
  | "thinking"
  | "working"
  | "researching"
  | "reviewing"
  | "verifying"
  | "repairing"
  | "blocked"
  | "waiting"
  | "travelling"
  | "incubating"
  | "retired";

export interface EventBase {
  /** Monotonic sequence number. Gaps mean events were dropped and the city must say so. */
  readonly seq: number;
  readonly id: string;
  readonly at: number;
  /** The resident or ephemeral worker that emitted this. `system` only for bus-level events. */
  readonly from: ResidentId | string;
  readonly severity: Severity;
  /** Every runtime entity this event is evidence of. Empty is only legal for `run.*` events. */
  readonly refs: readonly CorrespondenceRef[];
}

type Ev<K extends string, P> = EventBase & { readonly kind: K } & P;

export type CityEvent =
  // ── run lifecycle ────────────────────────────────────────────────────────────────────
  | Ev<"run.started", { objectiveId: string; objective: string; mode: ExecutionMode }>
  | Ev<"run.finished", { objectiveId: string; outcome: "released" | "blocked" | "aborted"; elapsedMs: number }>
  // ── orchestration ────────────────────────────────────────────────────────────────────
  | Ev<"objective.interpreted", { objectiveId: string; successCriteria: readonly string[]; risks: readonly string[]; uncertainties: readonly string[] }>
  | Ev<"task.created", { taskId: string; title: string; owner: ResidentId; dependsOn: readonly string[]; workClass: string }>
  | Ev<"task.assigned", { taskId: string; owner: ResidentId; route: string; workers: number }>
  | Ev<"task.started", { taskId: string; owner: ResidentId }>
  | Ev<"task.blocked", { taskId: string; owner: ResidentId; reason: string; blockedBy: readonly string[] }>
  | Ev<"task.waiting", { taskId: string; owner: ResidentId; waitingOn: readonly string[] }>
  | Ev<"task.submitted", { taskId: string; owner: ResidentId; artifactIds: readonly string[] }>
  | Ev<"task.repair_requested", { taskId: string; owner: ResidentId; from: ResidentId; summary: string; cycle: number }>
  | Ev<"task.completed", { taskId: string; owner: ResidentId; cycles: number }>
  | Ev<"task.failed", { taskId: string; owner: ResidentId; reason: string }>
  // ── movement and presence (drawn, but only ever as a consequence of the above) ────────
  | Ev<"agent.state", { agent: ResidentId | string; activity: AgentActivity; taskId?: string; detail?: string }>
  | Ev<"agent.moved", { agent: ResidentId | string; fromDistrict: string; toDistrict: string; reason: string }>
  | Ev<"message.sent", { to: ResidentId | string; subject: string; body: string; taskId?: string }>
  // ── tools ────────────────────────────────────────────────────────────────────────────
  | Ev<"tool.invoked", { agent: ResidentId | string; tool: string; taskId?: string; summary: string }>
  | Ev<"tool.denied", { agent: ResidentId | string; tool: string; rule: string; taskId?: string }>
  | Ev<"tool.escalated", { agent: ResidentId | string; tool: string; reason: string; taskId?: string }>
  // ── research cloud ───────────────────────────────────────────────────────────────────
  | Ev<"swarm.spawned", { swarmId: string; lead: ResidentId; workers: number; question: string; model: string }>
  | Ev<"swarm.worker.reported", { swarmId: string; worker: string; findings: number; sources: number }>
  | Ev<"swarm.contradiction", { swarmId: string; claim: string; sources: readonly string[] }>
  | Ev<"swarm.synthesized", { swarmId: string; lead: ResidentId; claims: number; sources: number; contradictions: number }>
  | Ev<"swarm.dissolved", { swarmId: string; workers: number }>
  // ── build foundry ────────────────────────────────────────────────────────────────────
  | Ev<"worktree.created", { worktreeId: string; taskId: string; agent: ResidentId | string; branch: string }>
  | Ev<"worktree.integrated", { worktreeId: string; taskId: string; conflicts: number }>
  | Ev<"artifact.produced", { artifactId: string; taskId: string; artifactKind: string; producer: ResidentId | string; summary: string }>
  // ── verification ─────────────────────────────────────────────────────────────────────
  | Ev<"verification.started", { taskId: string; verifier: ResidentId; method: string }>
  | Ev<"verification.passed", { taskId: string; verifier: ResidentId; method: string; evidenceIds: readonly string[] }>
  | Ev<"verification.failed", { taskId: string; verifier: ResidentId; owner: ResidentId; method: string; summary: string; requiredAction: "repair_and_retest" | "redesign" | "escalate"; evidenceIds: readonly string[] }>
  | Ev<"evidence.recorded", { evidenceId: string; claim: string; status: string; pointers: readonly string[] }>
  // ── release ──────────────────────────────────────────────────────────────────────────
  | Ev<"gate.evaluated", { gateId: string; status: "pass" | "fail" | "unknown"; owner: ResidentId; detail: string }>
  | Ev<"release.blocked", { releaseId: string; blockingGates: readonly string[]; outstanding: readonly string[] }>
  | Ev<"release.approved", { releaseId: string; manifestId: string; gates: number }>
  // ── genesis foundry ──────────────────────────────────────────────────────────────────
  | Ev<"genesis.gap_detected", { gapId: string; domain: string; currentOwners: readonly ResidentId[]; observations: readonly string[] }>
  | Ev<"genesis.genome_created", { genomeId: string; proposedName: string; domain: string }>
  | Ev<"genesis.necessity", { genomeId: string; verdict: "pass" | "fail"; rationale: string; reuseCandidate?: ResidentId }>
  | Ev<"genesis.incubated", { genomeId: string; bay: string; mentor: ResidentId }>
  | Ev<"genesis.trial", { genomeId: string; trial: string; score: number; threshold: number; passed: boolean }>
  | Ev<"genesis.adversarial", { genomeId: string; reviewer: ResidentId; passed: boolean; findings: readonly string[] }>
  | Ev<"genesis.citizenship", { genomeId: string; agentId: string; name: string; rank: string; department: string; mentor: ResidentId; bay: string }>
  | Ev<"genesis.disposition", { agentId: string; disposition: "resident" | "template" | "retired"; rationale: string }>
  | Ev<"career.updated", { agent: string; assignments: number; firstPassRate: number; rank: string; earned: readonly string[] }>
  // ── honesty ──────────────────────────────────────────────────────────────────────────
  | Ev<"capability.degraded", { capability: string; requested: string; used: string; consequence: string }>
  | Ev<"constitution.violated", { article: ArticleId; subject: string; detail: string }>;

export type CityEventKind = CityEvent["kind"];

export type ExecutionMode = "live" | "rehearsal";

/**
 * Article 9 check. An event that draws something must say what it is drawing.
 *
 * Returns a list of problems rather than throwing: the bus records the violation and keeps
 * running, because losing the event stream would hide more than the bad event revealed.
 */
export function assertCorrespondence(event: CityEvent): string[] {
  const problems: string[] = [];
  const isRunLevel = event.kind === "run.started" || event.kind === "run.finished";
  if (!isRunLevel && event.refs.length === 0) {
    problems.push(`${event.kind} carries no correspondence ref; the city would have to invent a subject`);
  }
  for (const r of event.refs) {
    if (!r.id || r.id.trim() === "") {
      problems.push(`${event.kind} has an empty ${r.kind} ref`);
    }
  }
  if (!Number.isFinite(event.seq) || event.seq < 0) {
    problems.push(`${event.kind} has a non-monotonic seq (${event.seq})`);
  }
  return problems;
}

/** Human-readable one-line rendering, used by the CLI and the city's activity ticker. */
export function describeEvent(e: CityEvent): string {
  const t = new Date(e.at).toISOString().slice(11, 19);
  switch (e.kind) {
    case "run.started":
      return `${t}  ▶ RUN     objective "${e.objective}" (${e.mode})`;
    case "run.finished":
      return `${t}  ■ RUN     ${e.outcome.toUpperCase()} in ${(e.elapsedMs / 1000).toFixed(1)}s`;
    case "objective.interpreted":
      return `${t}  ATLAS     ${e.successCriteria.length} success criteria, ${e.risks.length} risks, ${e.uncertainties.length} uncertainties`;
    case "task.created":
      return `${t}  TASK+     ${e.taskId} "${e.title}" → ${e.owner}`;
    case "task.assigned":
      return `${t}  ROUTE     ${e.taskId} → ${e.owner} via ${e.route} (${e.workers} worker${e.workers === 1 ? "" : "s"})`;
    case "task.started":
      return `${t}  START     ${e.taskId} (${e.owner})`;
    case "task.blocked":
      return `${t}  BLOCKED   ${e.taskId} — ${e.reason}`;
    case "task.waiting":
      return `${t}  WAIT      ${e.taskId} on ${e.waitingOn.join(", ")}`;
    case "task.submitted":
      return `${t}  SUBMIT    ${e.taskId} → ${e.artifactIds.length} artifact(s)`;
    case "task.repair_requested":
      return `${t}  REPAIR    ${e.taskId} cycle ${e.cycle} — ${e.summary}`;
    case "task.completed":
      return `${t}  DONE      ${e.taskId} after ${e.cycles} cycle(s)`;
    case "task.failed":
      return `${t}  FAILED    ${e.taskId} — ${e.reason}`;
    case "agent.state":
      return `${t}  STATE     ${e.agent} → ${e.activity}${e.detail ? ` (${e.detail})` : ""}`;
    case "agent.moved":
      return `${t}  MOVE      ${e.agent} ${e.fromDistrict} → ${e.toDistrict} (${e.reason})`;
    case "message.sent":
      return `${t}  MSG       ${e.from} → ${e.to}: ${e.subject}`;
    case "tool.invoked":
      return `${t}  TOOL      ${e.agent} · ${e.tool} — ${e.summary}`;
    case "tool.denied":
      return `${t}  DENY      ${e.agent} · ${e.tool} — ${e.rule}`;
    case "tool.escalated":
      return `${t}  ESCALATE  ${e.agent} · ${e.tool} — ${e.reason}`;
    case "swarm.spawned":
      return `${t}  SWARM+    ${e.swarmId} ${e.workers} workers on ${e.model} — "${e.question}"`;
    case "swarm.worker.reported":
      return `${t}  SWARM     ${e.worker} → ${e.findings} finding(s) / ${e.sources} source(s)`;
    case "swarm.contradiction":
      return `${t}  CONFLICT  ${e.swarmId} — ${e.claim}`;
    case "swarm.synthesized":
      return `${t}  SYNTH     ${e.swarmId} ${e.claims} claims, ${e.sources} sources, ${e.contradictions} contradiction(s)`;
    case "swarm.dissolved":
      return `${t}  SWARM-    ${e.swarmId} released ${e.workers} worker(s)`;
    case "worktree.created":
      return `${t}  TREE+     ${e.worktreeId} for ${e.taskId} (${e.branch})`;
    case "worktree.integrated":
      return `${t}  MERGE     ${e.worktreeId} — ${e.conflicts} conflict(s)`;
    case "artifact.produced":
      return `${t}  ARTIFACT  ${e.artifactId} (${e.artifactKind}) — ${e.summary}`;
    case "verification.started":
      return `${t}  VERIFY    ${e.taskId} by ${e.verifier} via ${e.method}`;
    case "verification.passed":
      return `${t}  PASS      ${e.taskId} · ${e.method} (${e.verifier})`;
    case "verification.failed":
      return `${t}  FAIL      ${e.taskId} · ${e.method} — ${e.summary}`;
    case "evidence.recorded":
      return `${t}  EVIDENCE  ${e.evidenceId} [${e.status}] ${e.claim}`;
    case "gate.evaluated":
      return `${t}  GATE      ${e.gateId} = ${e.status.toUpperCase()} (${e.owner}) — ${e.detail}`;
    case "release.blocked":
      return `${t}  ⛔ RELEASE BLOCKED — ${e.blockingGates.join(", ")}`;
    case "release.approved":
      return `${t}  ✅ RELEASE APPROVED — manifest ${e.manifestId} (${e.gates} gates)`;
    case "genesis.gap_detected":
      return `${t}  GENESIS   capability gap: ${e.domain}`;
    case "genesis.genome_created":
      return `${t}  GENESIS   genome ${e.genomeId} → proposed "${e.proposedName}"`;
    case "genesis.necessity":
      return `${t}  GENESIS   necessity gate ${e.verdict.toUpperCase()} — ${e.rationale}`;
    case "genesis.incubated":
      return `${t}  GENESIS   incubating ${e.genomeId} in ${e.bay}, mentor ${e.mentor}`;
    case "genesis.trial":
      return `${t}  GENESIS   trial ${e.trial} ${e.score.toFixed(2)}/${e.threshold.toFixed(2)} ${e.passed ? "PASS" : "FAIL"}`;
    case "genesis.adversarial":
      return `${t}  GENESIS   adversarial ${e.reviewer} ${e.passed ? "PASS" : "FAIL"}${e.findings.length ? ` — ${e.findings.join("; ")}` : ""}`;
    case "genesis.citizenship":
      return `${t}  🜂 BIRTH   ${e.name} (${e.agentId}) → ${e.department}, mentor ${e.mentor}, bay ${e.bay}`;
    case "genesis.disposition":
      return `${t}  GENESIS   ${e.agentId} → ${e.disposition} (${e.rationale})`;
    case "career.updated":
      return `${t}  CAREER    ${e.agent} ${e.assignments} assignments, ${(e.firstPassRate * 100).toFixed(0)}% first-pass, rank ${e.rank}`;
    case "capability.degraded":
      return `${t}  ⚠ DEGRADED ${e.capability}: wanted ${e.requested}, used ${e.used} — ${e.consequence}`;
    case "constitution.violated":
      return `${t}  ⛔ VIOLATION ${e.article} on ${e.subject} — ${e.detail}`;
  }
}
