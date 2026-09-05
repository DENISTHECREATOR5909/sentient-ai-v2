/**
 * Career records.
 *
 * Every number here is derived from recorded task outcomes. Nothing is self-assigned, nothing
 * is a model's estimate of its own quality, and there is no field an agent can write to
 * directly. An agent that repeatedly fails is reconfigured, narrowed or retired; an agent
 * that repeatedly discovers a new discipline can become the parent of a new department.
 *
 * That is what turns the "baby agent factory" from a visual gimmick into organizational
 * evolution: the org chart is downstream of measured outcomes.
 */

export type Rank = "Probationary" | "Specialist" | "Senior Specialist" | "Principal" | "Department Head";

export const RANK_ORDER: readonly Rank[] = [
  "Probationary",
  "Specialist",
  "Senior Specialist",
  "Principal",
  "Department Head",
];

export interface AssignmentOutcome {
  readonly taskId: string;
  readonly domain: string;
  /** Accepted with zero repair cycles. */
  readonly firstPass: boolean;
  readonly repairCycles: number;
  /** A defect that reached verification and would have shipped. */
  readonly criticalRegression: boolean;
  /** A verdict this agent rendered that a later independent check reversed. */
  readonly reviewOverturned: boolean;
  readonly skills: readonly string[];
  readonly at: number;
}

export interface CareerRecord {
  readonly agent: string;
  readonly outcomes: readonly AssignmentOutcome[];
  readonly assignments: number;
  readonly firstPassRate: number;
  readonly criticalRegressions: number;
  readonly reviewOverturnRate: number;
  readonly meanRepairCycles: number;
  /** Skills demonstrated on at least `SPECIALIZATION_THRESHOLD` accepted assignments. */
  readonly specializations: readonly string[];
  readonly rank: Rank;
  readonly promotionCandidacy: Rank | null;
  /** Set when the record indicates the agent should be reconfigured or retired. */
  readonly concern: string | null;
}

export const SPECIALIZATION_THRESHOLD = 3;

function rankFor(assignments: number, firstPassRate: number, regressions: number, overturnRate: number): Rank {
  if (regressions > 0 && assignments < 20) return "Probationary";
  if (assignments < 5) return "Probationary";
  if (assignments < 15 || firstPassRate < 0.7) return "Specialist";
  if (assignments < 40 || firstPassRate < 0.85 || overturnRate > 0.1) return "Senior Specialist";
  if (firstPassRate >= 0.9 && regressions === 0 && overturnRate <= 0.05) return "Principal";
  return "Senior Specialist";
}

export class CareerLedger {
  readonly #outcomes = new Map<string, AssignmentOutcome[]>();

  record(agent: string, outcome: AssignmentOutcome): void {
    const list = this.#outcomes.get(agent) ?? [];
    list.push(outcome);
    this.#outcomes.set(agent, list);
  }

  get agents(): readonly string[] {
    return [...this.#outcomes.keys()];
  }

  /** Compute the record. Pure derivation — call it as often as you like. */
  recordFor(agent: string): CareerRecord {
    const outcomes = this.#outcomes.get(agent) ?? [];
    const assignments = outcomes.length;
    const firstPass = outcomes.filter((o) => o.firstPass).length;
    const regressions = outcomes.filter((o) => o.criticalRegression).length;
    const overturns = outcomes.filter((o) => o.reviewOverturned).length;
    const firstPassRate = assignments === 0 ? 0 : firstPass / assignments;
    const overturnRate = assignments === 0 ? 0 : overturns / assignments;
    const meanRepairCycles =
      assignments === 0 ? 0 : outcomes.reduce((s, o) => s + o.repairCycles, 0) / assignments;

    const skillCounts = new Map<string, number>();
    for (const o of outcomes) {
      if (!o.firstPass && o.repairCycles > 2) continue; // barely-accepted work does not earn a badge
      for (const s of o.skills) skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
    }
    const specializations = [...skillCounts.entries()]
      .filter(([, n]) => n >= SPECIALIZATION_THRESHOLD)
      .map(([s]) => s)
      .sort();

    const rank = rankFor(assignments, firstPassRate, regressions, overturnRate);
    const idx = RANK_ORDER.indexOf(rank);
    const nextRank = RANK_ORDER[idx + 1] ?? null;
    const promotionCandidacy =
      nextRank && assignments >= 10 && firstPassRate >= 0.9 && regressions === 0 ? nextRank : null;

    let concern: string | null = null;
    if (assignments >= 5 && firstPassRate < 0.4) {
      concern = `first-pass rate ${(firstPassRate * 100).toFixed(0)}% over ${assignments} assignments — narrow the task envelope or revise the role contract`;
    } else if (regressions >= 2) {
      concern = `${regressions} critical regressions — reconfigure or retire`;
    } else if (overturnRate > 0.25 && assignments >= 8) {
      concern = `${(overturnRate * 100).toFixed(0)}% of this agent's verdicts were later overturned — its judgement is not yet trustworthy`;
    }

    return {
      agent,
      outcomes,
      assignments,
      firstPassRate,
      criticalRegressions: regressions,
      reviewOverturnRate: overturnRate,
      meanRepairCycles,
      specializations,
      rank,
      promotionCandidacy,
      concern,
    };
  }

  all(): readonly CareerRecord[] {
    return this.agents.map((a) => this.recordFor(a));
  }
}

/** The dossier the city shows when you click an agent's career tab. */
export function renderCareer(r: CareerRecord, displayName = r.agent): string {
  const lines = [
    displayName.toUpperCase(),
    "",
    `Assignments completed:      ${r.assignments}`,
    `Verified first-pass rate:   ${(r.firstPassRate * 100).toFixed(0)}%`,
    `Critical regressions:       ${r.criticalRegressions}`,
    `Review overturn rate:       ${(r.reviewOverturnRate * 100).toFixed(0)}%`,
    `Mean repair cycles:         ${r.meanRepairCycles.toFixed(2)}`,
    "",
    "Specializations earned:",
    ...(r.specializations.length > 0 ? r.specializations.map((s) => `  ✓ ${s}`) : ["  (none yet)"]),
    "",
    `Current rank:`,
    `  ${r.rank}`,
  ];
  if (r.promotionCandidacy) lines.push("", "Promotion candidacy:", `  ${r.promotionCandidacy}`);
  if (r.concern) lines.push("", "⚠ Concern:", `  ${r.concern}`);
  return lines.join("\n");
}
