/**
 * The dependency-aware task graph.
 *
 * One invariant above all others: **every task has exactly one accountable owner**, even when
 * thirty agents contribute to it. Contribution is plural; accountability is singular. Without
 * that, an organization degenerates into a group chat where everyone has an opinion and
 * nobody owns the result.
 */

import type { Domain, ResidentId } from "./residents.js";
import type { WorkClass } from "./routing.js";
import { violation, type Violation } from "./constitution.js";

export type TaskState =
  | "planned"
  | "assigned"
  | "working"
  | "waiting"
  | "blocked"
  | "submitted"
  | "verifying"
  | "repair"
  | "complete"
  | "failed";

/** States the operations view groups by, mirroring a live agent dashboard. */
export const OPERATIONS_BUCKETS = {
  working: ["assigned", "working"],
  verifying: ["submitted", "verifying"],
  blocked: ["blocked", "repair"],
  waiting: ["planned", "waiting"],
  failed: ["failed"],
  complete: ["complete"],
} as const satisfies Record<string, readonly TaskState[]>;

export type OperationsBucket = keyof typeof OPERATIONS_BUCKETS;

export interface AcceptanceCriterion {
  readonly id: string;
  readonly text: string;
  /** How this criterion will be checked. Prose with no method is not a criterion. */
  readonly method: string;
}

export interface Verdict {
  readonly verifier: ResidentId;
  readonly method: string;
  readonly passed: boolean;
  readonly summary: string;
  readonly evidenceIds: readonly string[];
  readonly at: number;
}

export interface Task {
  readonly id: string;
  readonly objectiveId: string;
  readonly title: string;
  readonly domain: Domain;
  readonly workClass: WorkClass;
  /** The single accountable resident. Never a list. */
  readonly owner: ResidentId;
  /** Residents who may render an independent verdict. Never includes `owner` (Article 6). */
  readonly verifiers: readonly ResidentId[];
  readonly dependsOn: readonly string[];
  readonly acceptance: readonly AcceptanceCriterion[];
  state: TaskState;
  artifactIds: string[];
  /** Current verdicts. A retest supersedes the verdict it replaces. */
  verdicts: Verdict[];
  /**
   * Every failed verdict this task ever received, including ones later superseded by a
   * passing retest. The current verdicts say whether the task is done; this says what it
   * cost — which is the evidence the Genesis Foundry reads when looking for a capability gap.
   */
  failureHistory: Verdict[];
  /** Repair cycles consumed. The owner never sees these; they are internal correction. */
  cycles: number;
  blockedReason?: string;
  failureReason?: string;
}

export interface TaskInput {
  readonly id: string;
  readonly objectiveId: string;
  readonly title: string;
  readonly domain: Domain;
  readonly workClass: WorkClass;
  readonly owner: ResidentId;
  readonly verifiers: readonly ResidentId[];
  readonly dependsOn?: readonly string[];
  readonly acceptance: readonly AcceptanceCriterion[];
}

export class TaskGraphError extends Error {
  constructor(
    message: string,
    readonly violation?: Violation,
  ) {
    super(message);
    this.name = "TaskGraphError";
  }
}

export class TaskGraph {
  readonly #tasks = new Map<string, Task>();

  add(input: TaskInput): Task {
    if (this.#tasks.has(input.id)) throw new TaskGraphError(`duplicate task id: ${input.id}`);
    if (input.verifiers.includes(input.owner)) {
      const v = violation("A6_BUILDER_IS_NOT_JUDGE", input.id, `${input.owner} is listed as both owner and verifier`);
      throw new TaskGraphError(`cannot create ${input.id}: ${v.detail}`, v);
    }
    if (input.acceptance.length === 0) {
      const v = violation(
        "A1_OWNER_BELIEF_IS_NOT_COMPLETION",
        input.id,
        "task created with no acceptance criteria; completion would be undefinable",
      );
      throw new TaskGraphError(`cannot create ${input.id}: ${v.detail}`, v);
    }
    for (const dep of input.dependsOn ?? []) {
      if (!this.#tasks.has(dep)) throw new TaskGraphError(`${input.id} depends on unknown task ${dep}`);
    }
    const task: Task = {
      id: input.id,
      objectiveId: input.objectiveId,
      title: input.title,
      domain: input.domain,
      workClass: input.workClass,
      owner: input.owner,
      verifiers: [...input.verifiers],
      dependsOn: [...(input.dependsOn ?? [])],
      acceptance: [...input.acceptance],
      state: "planned",
      artifactIds: [],
      verdicts: [],
      failureHistory: [],
      cycles: 0,
    };
    this.#tasks.set(task.id, task);
    return task;
  }

  get(id: string): Task {
    const t = this.#tasks.get(id);
    if (!t) throw new TaskGraphError(`unknown task: ${id}`);
    return t;
  }

  has(id: string): boolean {
    return this.#tasks.has(id);
  }

  get all(): readonly Task[] {
    return [...this.#tasks.values()];
  }

  get size(): number {
    return this.#tasks.size;
  }

  /** Tasks whose dependencies are all complete and which have not yet started. */
  ready(): readonly Task[] {
    return this.all.filter(
      (t) => t.state === "planned" && t.dependsOn.every((d) => this.get(d).state === "complete"),
    );
  }

  /** Tasks waiting on an unfinished dependency — genuinely idle, not pretending to work. */
  waiting(): readonly Task[] {
    return this.all.filter(
      (t) => t.state === "planned" && t.dependsOn.some((d) => this.get(d).state !== "complete"),
    );
  }

  unresolvedDeps(id: string): readonly string[] {
    return this.get(id).dependsOn.filter((d) => this.get(d).state !== "complete");
  }

  /** Detect a cycle. A task graph with a cycle can never complete and must never be run. */
  findCycle(): readonly string[] | null {
    const WHITE = 0, GREY = 1, BLACK = 2;
    const colour = new Map<string, number>(this.all.map((t) => [t.id, WHITE]));
    const stack: string[] = [];
    const visit = (id: string): string[] | null => {
      colour.set(id, GREY);
      stack.push(id);
      for (const dep of this.get(id).dependsOn) {
        const c = colour.get(dep) ?? WHITE;
        if (c === GREY) return [...stack.slice(stack.indexOf(dep)), dep];
        if (c === WHITE) {
          const found = visit(dep);
          if (found) return found;
        }
      }
      stack.pop();
      colour.set(id, BLACK);
      return null;
    };
    for (const t of this.all) {
      if ((colour.get(t.id) ?? WHITE) === WHITE) {
        const cycle = visit(t.id);
        if (cycle) return cycle;
      }
    }
    return null;
  }

  /**
   * Article 1. A task may complete only when every acceptance criterion has been checked by
   * an independent verifier and every verdict passed. Owner belief is not an input.
   */
  canComplete(id: string): { ok: true } | { ok: false; violation: Violation } {
    const t = this.get(id);
    if (t.verdicts.length === 0) {
      return {
        ok: false,
        violation: violation("A1_OWNER_BELIEF_IS_NOT_COMPLETION", id, "no independent verdict recorded"),
      };
    }
    const failing = t.verdicts.filter((v) => !v.passed);
    if (failing.length > 0) {
      return {
        ok: false,
        violation: violation(
          "A5_FAILURE_RETURNS_TO_REPAIR",
          id,
          `outstanding failed verdict(s) from ${failing.map((v) => v.verifier).join(", ")}`,
        ),
      };
    }
    const checked = new Set(t.verdicts.map((v) => v.method));
    const unchecked = t.acceptance.filter((a) => !checked.has(a.method));
    if (unchecked.length > 0) {
      return {
        ok: false,
        violation: violation(
          "A1_OWNER_BELIEF_IS_NOT_COMPLETION",
          id,
          `acceptance criteria never checked: ${unchecked.map((a) => a.id).join(", ")}`,
        ),
      };
    }
    return { ok: true };
  }

  /**
   * Article 5. A failed verdict sends the artifact back to repair. There is no path from
   * here that converts a failure into a pass without a *new* verdict backed by new evidence.
   */
  applyVerdict(id: string, verdict: Verdict): Task {
    const t = this.get(id);
    if (verdict.verifier === t.owner) {
      const v = violation("A6_BUILDER_IS_NOT_JUDGE", id, `${verdict.verifier} attempted to verify their own work`);
      throw new TaskGraphError(v.detail, v);
    }
    if (!t.verifiers.includes(verdict.verifier)) {
      throw new TaskGraphError(`${verdict.verifier} is not an assigned verifier for ${id}`);
    }
    // A new verdict from the same verifier on the same method supersedes the old one — that
    // is the retest. Verdicts from other verifiers stand untouched.
    t.verdicts = t.verdicts.filter((v) => !(v.verifier === verdict.verifier && v.method === verdict.method));
    t.verdicts.push(verdict);
    if (!verdict.passed) t.failureHistory.push(verdict);

    if (!verdict.passed) {
      t.state = "repair";
      t.cycles += 1;
      return t;
    }
    if (this.canComplete(id).ok) {
      t.state = "complete";
      return t;
    }
    // A pass does not clear someone else's failure. If any verdict is still failing, the
    // artifact is in repair however many other verifiers were satisfied — otherwise a task
    // could sit in `verifying` forever, which is a stall dressed up as progress.
    t.state = t.verdicts.some((v) => !v.passed) ? "repair" : "verifying";
    return t;
  }

  /** Bucket counts for the operations view. */
  operations(): Record<OperationsBucket, number> {
    const counts = { working: 0, verifying: 0, blocked: 0, waiting: 0, failed: 0, complete: 0 };
    for (const t of this.all) {
      for (const [bucket, states] of Object.entries(OPERATIONS_BUCKETS) as [OperationsBucket, readonly TaskState[]][]) {
        if (states.includes(t.state)) counts[bucket] += 1;
      }
    }
    return counts;
  }

  /**
   * Tasks that can never start because something they depend on failed.
   *
   * Left alone these sit in `planned` forever and the run stalls — which would report as a
   * hang rather than as the upstream failure it actually is. Blocking them makes the real
   * cause visible on the manifest.
   */
  cascadeBlock(failedId: string): readonly Task[] {
    const blocked: Task[] = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const t of this.all) {
        if (t.state !== "planned") continue;
        const cause = t.dependsOn.find((d) => {
          const dep = this.get(d);
          return dep.state === "failed" || dep.state === "blocked";
        });
        if (!cause) continue;
        t.state = "blocked";
        t.blockedReason = `${cause} did not complete (upstream of ${failedId})`;
        blocked.push(t);
        changed = true;
      }
    }
    return blocked;
  }

  get isSettled(): boolean {
    return this.all.every((t) => t.state === "complete" || t.state === "failed" || t.state === "blocked");
  }
}
