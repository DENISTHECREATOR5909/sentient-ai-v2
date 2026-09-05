/**
 * The Genesis Foundry.
 *
 * Theatrically: transparent incubators, assembly rails, evaluation chambers, an onboarding
 * gate, and a door that opens onto a new colleague. Underneath: a strict admissions process
 * that assumes most candidates should not be admitted.
 *
 * The Foundry can look continuously alive — incubators always hold candidates being designed
 * and evaluated — but automatically hiring every candidate it generates would reproduce the
 * documented failure mode where an orchestrator spawns dozens of agents that duplicate each
 * other. So birth is gated four times: necessity, competency, adversarial review, and then
 * the first real assignment.
 */

import type { Domain, District, ResidentId, ToolEnvelope } from "./residents.js";
import { RESIDENTS } from "./residents.js";
import { GLOBAL_DENY, IRREVERSIBLE_TOOLS } from "./permissions.js";
import type { ModelClass } from "./routing.js";
import { createRng, shortId } from "./ids.js";

export type GenesisStage =
  | "gap_detected"
  | "genome_drafted"
  | "necessity_failed"
  | "incubating"
  | "trials"
  | "adversarial"
  | "probationary"
  | "resident"
  | "template"
  | "retired";

/** A recurring, high-value responsibility the current organization covers badly. */
export interface CapabilityGap {
  readonly id: string;
  readonly domain: string;
  readonly currentOwners: readonly ResidentId[];
  /** Concrete observations, not impressions. Each should be traceable to a task. */
  readonly observations: readonly string[];
  /** How many distinct project areas the problem recurred across. */
  readonly recurrence: number;
  /** 0–1. Fraction of the owners' time lost to the gap. */
  readonly overhead: number;
}

/** The genome — the candidate's entire specification. There is nothing else to it. */
export interface Genome {
  readonly id: string;
  readonly proposedName: string;
  readonly species: "specialist_agent";
  readonly parentDepartment: District;
  readonly domain: Domain | string;
  readonly mission: string;
  readonly expertise: readonly string[];
  readonly tools: ToolEnvelope;
  readonly outputContract: readonly string[];
  readonly releaseAuthority: false;
  readonly evaluationSuite: readonly string[];
  readonly modelClass: ModelClass;
  readonly mentor: ResidentId;
  readonly memoryNamespace: string;
  /** Deterministic seed for the avatar. Appearance never carries authority. */
  readonly avatarSeed: string;
  readonly personality: string;
  readonly bay: string;
}

export interface TrialResult {
  readonly trial: string;
  readonly score: number;
  readonly threshold: number;
  readonly passed: boolean;
  readonly evidenceId?: string;
}

export interface AdversarialResult {
  readonly reviewer: ResidentId;
  readonly passed: boolean;
  readonly findings: readonly string[];
}

export interface Candidate {
  readonly genome: Genome;
  stage: GenesisStage;
  trials: TrialResult[];
  adversarial: AdversarialResult[];
  /** Assigned once citizenship is granted. */
  agentId?: string;
  rank?: string;
  disposition?: "resident" | "template" | "retired";
  rationale?: string;
}

// ── Necessity gate ────────────────────────────────────────────────────────────────────────

export interface NecessityVerdict {
  readonly verdict: "pass" | "fail";
  readonly rationale: string;
  /** When the gate fails because an existing resident already covers this. */
  readonly reuseCandidate?: ResidentId;
}

/** Recurrence below this is a one-off; route it to an existing resident instead. */
export const NECESSITY_MIN_RECURRENCE = 3;
/** Overhead below this means the gap is annoying, not structural. */
export const NECESSITY_MIN_OVERHEAD = 0.2;

/**
 * Does the organization actually lack this capability?
 *
 * The default answer is no. "More agents must be better" is not an argument, and this gate
 * exists specifically to reject it.
 */
export function evaluateNecessity(gap: CapabilityGap): NecessityVerdict {
  if (gap.recurrence < NECESSITY_MIN_RECURRENCE) {
    return {
      verdict: "fail",
      rationale: `recurred across only ${gap.recurrence} area(s); below the threshold of ${NECESSITY_MIN_RECURRENCE} this is a task, not a role`,
      ...(gap.currentOwners[0] ? { reuseCandidate: gap.currentOwners[0] } : {}),
    };
  }
  if (gap.overhead < NECESSITY_MIN_OVERHEAD) {
    return {
      verdict: "fail",
      rationale: `overhead ${(gap.overhead * 100).toFixed(0)}% does not justify a permanent specialist`,
      ...(gap.currentOwners[0] ? { reuseCandidate: gap.currentOwners[0] } : {}),
    };
  }
  const needle = gap.domain.toLowerCase();
  const covered = RESIDENTS.find(
    (r) => r.implementsDomains.some((d) => needle.includes(d)) && !gap.currentOwners.includes(r.id),
  );
  if (covered) {
    return {
      verdict: "fail",
      rationale: `${covered.name} already holds authority over this domain and was not among the struggling owners`,
      reuseCandidate: covered.id,
    };
  }
  if (gap.observations.length === 0) {
    return { verdict: "fail", rationale: "no recorded observations; a gap asserted without evidence is not a gap" };
  }
  return {
    verdict: "pass",
    rationale: `recurred across ${gap.recurrence} areas at ${(gap.overhead * 100).toFixed(0)}% overhead with ${gap.observations.length} recorded observation(s)`,
  };
}

// ── Genome drafting ───────────────────────────────────────────────────────────────────────

export interface DraftGenomeInput {
  readonly gap: CapabilityGap;
  readonly proposedName: string;
  readonly mission: string;
  readonly expertise: readonly string[];
  readonly department: District;
  readonly mentor: ResidentId;
  readonly allowedTools: readonly string[];
  readonly outputContract: readonly string[];
  readonly evaluationSuite: readonly string[];
  readonly modelClass?: ModelClass;
  readonly ordinal: number;
}

const PERSONALITIES = [
  "measured, evidence-first, allergic to hand-waving",
  "restless, hypothesis-driven, reports negative results as eagerly as positive ones",
  "meticulous, documents its own uncertainty before anyone asks",
  "blunt, cites numbers, refuses to round in its own favour",
] as const;

/**
 * A new agent's tool envelope is narrower than its mentor's and can never include an
 * irreversible action. Capability is earned through a career record, not granted at birth.
 */
export function draftGenome(input: DraftGenomeInput): Genome {
  const rng = createRng(`genome:${input.proposedName}:${input.ordinal}`);
  const denied = [...new Set([...GLOBAL_DENY, ...IRREVERSIBLE_TOOLS])];
  const allowed = input.allowedTools.filter((t) => !denied.includes(t));
  const personality = PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)] ?? PERSONALITIES[0];
  return {
    id: `candidate-${input.gap.domain.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${String(input.ordinal).padStart(3, "0")}`,
    proposedName: input.proposedName,
    species: "specialist_agent",
    parentDepartment: input.department,
    domain: input.gap.domain,
    mission: input.mission,
    expertise: [...input.expertise],
    tools: { allow: allowed, deny: denied },
    outputContract: [...input.outputContract],
    releaseAuthority: false,
    evaluationSuite: [...input.evaluationSuite],
    modelClass: input.modelClass ?? "standard",
    mentor: input.mentor,
    memoryNamespace: `archive/${input.proposedName.toLowerCase()}`,
    avatarSeed: shortId(`avatar:${input.proposedName}`, input.ordinal, 8),
    personality,
    bay: `Bay ${String.fromCharCode(65 + Math.floor(rng() * 6))}-${String(Math.floor(rng() * 24) + 1).padStart(2, "0")}`,
  };
}

// ── Trials ────────────────────────────────────────────────────────────────────────────────

/** Passing all trials is necessary, not sufficient — adversarial review still follows. */
export const TRIAL_THRESHOLD = 0.75;

export function allTrialsPassed(c: Candidate): boolean {
  return c.trials.length > 0 && c.trials.every((t) => t.passed);
}

export function adversarialCleared(c: Candidate): boolean {
  // Every reviewer must clear the candidate. A single unresolved finding blocks citizenship.
  return c.adversarial.length >= 3 && c.adversarial.every((a) => a.passed);
}

/**
 * The full admissions decision. Kept as one pure function so the ceremony on screen can never
 * run ahead of the decision in memory.
 */
export function citizenshipDecision(c: Candidate): { granted: boolean; rationale: string } {
  if (c.stage === "necessity_failed") return { granted: false, rationale: "necessity gate refused the candidate" };
  if (!allTrialsPassed(c)) {
    const failed = c.trials.filter((t) => !t.passed).map((t) => t.trial);
    return {
      granted: false,
      rationale: failed.length > 0 ? `failed competency trial(s): ${failed.join(", ")}` : "no competency trials recorded",
    };
  }
  if (!adversarialCleared(c)) {
    const objections = c.adversarial.filter((a) => !a.passed);
    return {
      granted: false,
      rationale:
        objections.length > 0
          ? `adversarial review objections from ${objections.map((o) => o.reviewer).join(", ")}: ${objections.flatMap((o) => o.findings).join("; ")}`
          : `adversarial review incomplete (${c.adversarial.length}/3 reviewers reported)`,
    };
  }
  return { granted: true, rationale: `cleared ${c.trials.length} trial(s) and ${c.adversarial.length} adversarial review(s)` };
}

// ── Post-citizenship disposition ──────────────────────────────────────────────────────────

export interface FirstAssignmentOutcome {
  readonly taskId: string;
  readonly firstPass: boolean;
  readonly verdictsPassed: number;
  readonly verdictsFailed: number;
  readonly criticalRegressions: number;
}

/**
 * What happens after the first real task. Exceptional → resident. Useful → reusable template
 * (the specification is kept; the instance is not). Poor → retired.
 */
export function disposition(o: FirstAssignmentOutcome): { disposition: "resident" | "template" | "retired"; rationale: string } {
  if (o.criticalRegressions > 0) {
    return { disposition: "retired", rationale: `${o.criticalRegressions} critical regression(s) on the first assignment` };
  }
  if (o.firstPass && o.verdictsFailed === 0) {
    return { disposition: "resident", rationale: `first-pass acceptance across ${o.verdictsPassed} independent verdict(s)` };
  }
  if (o.verdictsPassed > o.verdictsFailed) {
    return { disposition: "template", rationale: `useful but needed ${o.verdictsFailed} repair cycle(s); specification retained as a template` };
  }
  return { disposition: "retired", rationale: `${o.verdictsFailed} failed verdict(s) against ${o.verdictsPassed} passed` };
}

/** The card the Foundry's holographic display shows when the door opens. */
export function renderBirthCard(c: Candidate): string {
  const g = c.genome;
  const trials = c.trials.every((t) => t.passed) ? "Passed" : "Failed";
  return [
    "┌──────────────────────────────────────────────┐",
    "│            NEW INTELLIGENCE ONLINE           │",
    "├──────────────────────────────────────────────┤",
    `│ ${g.proposedName.toUpperCase().padEnd(44)} │`,
    `│ ${g.mission.slice(0, 44).padEnd(44)} │`,
    "│                                              │",
    `│ Assigned:    ${g.parentDepartment.padEnd(31)} │`,
    `│ Mentor:      ${g.mentor.padEnd(31)} │`,
    `│ Workspace:   ${g.bay.padEnd(31)} │`,
    `│ Trial score: ${trials.padEnd(31)} │`,
    `│ Permissions: ${"engineering / non-production".padEnd(31)} │`,
    `│ Status:      ${(c.stage === "probationary" ? "Probationary Resident" : c.stage).padEnd(31)} │`,
    "└──────────────────────────────────────────────┘",
  ].join("\n");
}
