/**
 * Capability routing.
 *
 * "Maximum potential" is not "put the biggest model on everything and spawn as many workers
 * as the budget allows". Published production experience with multi-agent research systems
 * reports the advantage concentrating where a task decomposes into genuinely *independent*
 * branches, at roughly an order of magnitude more token usage than ordinary chat, with
 * dependency-heavy tasks turning out to be poor candidates — and with early orchestrators
 * failing by spawning dozens of unnecessary agents that duplicated one another.
 *
 * So allocation here is a reasoning step with a budget and a refusal, not a default.
 */

import type { ResidentId } from "./residents.js";

/** Abstract capability tiers. Task code names a tier; only this module names a model. */
export type ModelClass = "deep" | "standard" | "fast";

/** `output_config.effort`. Higher costs more and thinks longer; it is not a quality dial. */
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * How a model family takes its thinking configuration. This differs across families and
 * getting it wrong is a 400, not a warning: the current Opus/Sonnet generation rejects a
 * fixed `budget_tokens` outright and wants adaptive thinking plus an effort level, while
 * Haiku still takes a budget and rejects `effort`.
 */
export type ThinkingConfig =
  | { readonly type: "adaptive" }
  | { readonly type: "enabled"; readonly budget_tokens: number }
  | null;

export interface ModelRoute {
  readonly modelClass: ModelClass;
  /** Concrete model identifier. Never date-suffixed — the bare id is the complete id. */
  readonly model: string;
  readonly thinking: ThinkingConfig;
  /** Omitted for families that reject it. */
  readonly effort: Effort | null;
  readonly bestFor: string;
}

export const MODEL_ROUTES: Readonly<Record<ModelClass, ModelRoute>> = {
  deep: {
    modelClass: "deep",
    model: "claude-opus-5",
    thinking: { type: "adaptive" },
    effort: "xhigh",
    bestFor:
      "Orchestration, architecture, difficult synthesis, adversarial review, release adjudication — " +
      "work where answer quality matters more than latency.",
  },
  standard: {
    modelClass: "standard",
    model: "claude-sonnet-5",
    thinking: { type: "adaptive" },
    effort: "high",
    bestFor:
      "Bounded implementation, independent research investigators, verification runs, design work — " +
      "the workhorse tier, and the one parallelism is built out of.",
  },
  fast: {
    modelClass: "fast",
    model: "claude-haiku-4-5",
    // Haiku takes a fixed budget and rejects `effort`; mechanical work needs neither.
    thinking: null,
    effort: null,
    bestFor: "Mechanical extraction, classification, formatting, indexing, high-volume fan-out.",
  },
};

export type WorkClass =
  | "orchestration"
  | "deep_research"
  | "synthesis"
  | "product_definition"
  | "design"
  | "implementation"
  | "verification"
  | "adversarial_review"
  | "security_review"
  | "mechanical"
  | "audit_sweep";

/** Swarm configurations the Research Cloud offers. 16 is the deep-research configuration. */
export const SWARM_SIZES = [1, 4, 16] as const;
/** A normal build workflow's fan-out budget. */
export const WORKFLOW_DEFAULT_BUDGET = 128;
/** The ceiling for an exceptionally large audit. Above this, decompose the objective instead. */
export const WORKFLOW_MAX_BUDGET = 1024;

export interface ComplexitySignals {
  /** Sub-questions or work items that can genuinely proceed without each other. */
  readonly independentBranches: number;
  /** Longest chain of "B cannot start until A finishes". */
  readonly dependencyDepth: number;
  /** 0–1. How much of the answer is unknown at planning time. */
  readonly uncertainty: number;
  /** 0–1. Cost of getting this wrong, from cosmetic (0) to irreversible (1). */
  readonly consequence: number;
}

export interface Allocation {
  readonly workClass: WorkClass;
  readonly route: ModelRoute;
  /** Ephemeral workers beneath the accountable resident. 0 means the resident works alone. */
  readonly workers: number;
  /** Resident who stays accountable regardless of how many workers contribute. */
  readonly accountable: ResidentId;
  readonly rationale: string;
  /** Rough multiple of single-agent token usage, so the cost of parallelism is never hidden. */
  readonly tokenMultiplier: number;
}

/**
 * Decomposability: the fraction of the work that can proceed in parallel. Dependency depth is
 * the denominator because a deep chain cannot be shortened by adding agents to it.
 */
export function decomposability(s: ComplexitySignals): number {
  const branches = Math.max(0, s.independentBranches);
  const depth = Math.max(1, s.dependencyDepth);
  if (branches <= 1) return 0;
  return branches / (branches + depth * 2);
}

/** Choose the smallest swarm size that still covers the independent branches. */
function swarmFor(branches: number, decomp: number): number {
  if (decomp < 0.3 || branches <= 1) return 1;
  for (const size of SWARM_SIZES) {
    if (size >= branches) return size;
  }
  return 16;
}

const BASE_CLASS: Readonly<Record<WorkClass, ModelClass>> = {
  orchestration: "deep",
  deep_research: "standard",
  synthesis: "deep",
  product_definition: "deep",
  design: "standard",
  implementation: "standard",
  verification: "standard",
  adversarial_review: "deep",
  security_review: "deep",
  mechanical: "fast",
  audit_sweep: "fast",
};

/**
 * Plan an allocation. Article 10 lives here: an allocation whose worker count is not earned
 * by measured decomposability is refused, not quietly granted.
 */
export function planAllocation(
  workClass: WorkClass,
  accountable: ResidentId,
  signals: ComplexitySignals,
): Allocation {
  const decomp = decomposability(signals);
  let modelClass = BASE_CLASS[workClass];

  // Consequence escalates the tier, never de-escalates it. A downgrade would be a silent
  // capability reduction, which Article 8 forbids.
  if (signals.consequence >= 0.7 && modelClass === "fast") modelClass = "standard";
  if (signals.consequence >= 0.85 && modelClass === "standard") modelClass = "deep";

  let workers = 0;
  let rationale: string;

  switch (workClass) {
    case "deep_research": {
      workers = swarmFor(signals.independentBranches, decomp);
      rationale =
        workers === 1
          ? `Decomposability ${decomp.toFixed(2)} is below the parallel-research threshold; a single investigator avoids duplicated work.`
          : `${signals.independentBranches} independent branches at decomposability ${decomp.toFixed(2)} → ${workers}-investigator configuration with a deep-tier lead synthesising.`;
      break;
    }
    case "audit_sweep": {
      const wanted = Math.max(1, signals.independentBranches);
      workers = Math.min(wanted, WORKFLOW_DEFAULT_BUDGET);
      if (wanted > WORKFLOW_DEFAULT_BUDGET && wanted <= WORKFLOW_MAX_BUDGET) workers = wanted;
      rationale = `Mass-parallel sweep across ${workers} genuinely independent items (budget ${WORKFLOW_DEFAULT_BUDGET}, ceiling ${WORKFLOW_MAX_BUDGET}).`;
      break;
    }
    case "implementation": {
      workers = decomp >= 0.5 ? Math.min(signals.independentBranches, 8) : 0;
      rationale =
        workers > 0
          ? `${workers} isolated worktrees so parallel builders cannot overwrite one another.`
          : `Dependency depth ${signals.dependencyDepth} makes this sequential; parallel builders would conflict rather than help.`;
      break;
    }
    default: {
      workers = 0;
      rationale = `Single accountable specialist; ${workClass} does not decompose into independent branches here.`;
    }
  }

  const route = MODEL_ROUTES[modelClass];
  const tokenMultiplier = workers <= 1 ? 1 : Math.round(workers * 1.2 + 3);

  return { workClass, route, workers, accountable, rationale, tokenMultiplier };
}

export class AllocationRefused extends Error {
  constructor(
    readonly requested: number,
    readonly permitted: number,
    readonly reason: string,
  ) {
    super(`allocation refused: requested ${requested} workers, permitted ${permitted} — ${reason}`);
    this.name = "AllocationRefused";
  }
}

/**
 * Guard for a caller that names its own worker count. Refuses over-allocation outright: the
 * documented early failure mode is an orchestrator spawning fifty subagents for a job that
 * needed one.
 */
export function assertAllocationJustified(requested: number, signals: ComplexitySignals): void {
  if (requested > WORKFLOW_MAX_BUDGET) {
    throw new AllocationRefused(requested, WORKFLOW_MAX_BUDGET, "above the workflow ceiling; decompose the objective instead");
  }
  const decomp = decomposability(signals);
  if (requested > 1 && decomp < 0.3) {
    throw new AllocationRefused(requested, 1, `decomposability ${decomp.toFixed(2)} does not justify parallelism`);
  }
  if (requested > signals.independentBranches * 2) {
    throw new AllocationRefused(
      requested,
      Math.max(1, signals.independentBranches),
      "worker count exceeds twice the number of independent branches; workers would duplicate each other",
    );
  }
}

/**
 * A capability the organization wanted but could not have.
 *
 * The point of recording these is Article 8. The run may continue on a lesser route; what it
 * may never do is finish and call the result maximum-capability execution. Every degradation
 * recorded here becomes outstanding work on the release manifest.
 */
export interface Degradation {
  readonly capability: string;
  readonly requested: string;
  readonly used: string;
  readonly consequence: string;
  readonly at: number;
}

export class DegradationLedger {
  readonly #entries: Degradation[] = [];

  record(capability: string, requested: string, used: string, consequence: string, at = Date.now()): Degradation {
    const entry: Degradation = { capability, requested, used, consequence, at };
    this.#entries.push(entry);
    return entry;
  }

  get entries(): readonly Degradation[] {
    return this.#entries;
  }

  get isClean(): boolean {
    return this.#entries.length === 0;
  }

  /** Outstanding work, phrased for the release manifest rather than for a log file. */
  outstanding(): readonly string[] {
    return this.#entries.map((d) => `${d.capability}: ${d.consequence} (wanted ${d.requested}, used ${d.used})`);
  }
}
