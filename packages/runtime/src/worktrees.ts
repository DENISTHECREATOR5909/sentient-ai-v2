/**
 * Worktree isolation for parallel builders.
 *
 * Two agents editing one checkout is not parallelism, it is a race. Each parallel builder
 * gets its own working copy; integration is an explicit step with an explicit conflict count,
 * so a merge that silently dropped half of someone's work is impossible to mistake for
 * success.
 *
 * The registry is deliberately abstract over git: it records the isolation contract, and
 * `GitWorktrees` is the implementation that actually creates directories. A run that never
 * touches a repository still gets the same accounting.
 */

import { ref, type EventBus, type ResidentId } from "@agent-city/core";

export interface Worktree {
  readonly id: string;
  readonly taskId: string;
  readonly agent: ResidentId | string;
  readonly branch: string;
  readonly path: string;
  integrated: boolean;
  conflicts: number;
}

export interface WorktreeBackend {
  create(branch: string): Promise<string>;
  integrate(branch: string): Promise<number>;
  remove(branch: string): Promise<void>;
}

/** The default backend: records the contract without touching a repository. */
export class VirtualWorktrees implements WorktreeBackend {
  async create(branch: string): Promise<string> {
    return `.worktrees/${branch}`;
  }
  async integrate(): Promise<number> {
    return 0;
  }
  async remove(): Promise<void> {}
}

export class WorktreeRegistry {
  readonly #trees = new Map<string, Worktree>();
  #n = 0;

  constructor(
    private readonly bus: EventBus,
    private readonly backend: WorktreeBackend = new VirtualWorktrees(),
  ) {}

  async open(taskId: string, agent: ResidentId | string): Promise<Worktree> {
    const id = `wt-${String(++this.#n).padStart(3, "0")}`;
    const branch = `foundry/${taskId}`;
    const path = await this.backend.create(branch);
    const tree: Worktree = { id, taskId, agent, branch, path, integrated: false, conflicts: 0 };
    this.#trees.set(id, tree);
    this.bus.publish({
      kind: "worktree.created",
      from: agent,
      severity: "info",
      refs: [ref("worktree", id), ref("task", taskId)],
      worktreeId: id,
      taskId,
      agent,
      branch,
    });
    return tree;
  }

  async integrate(id: string): Promise<Worktree> {
    const tree = this.#trees.get(id);
    if (!tree) throw new Error(`unknown worktree: ${id}`);
    tree.conflicts = await this.backend.integrate(tree.branch);
    tree.integrated = true;
    this.bus.publish({
      kind: "worktree.integrated",
      from: tree.agent,
      severity: tree.conflicts > 0 ? "notable" : "info",
      refs: [ref("worktree", id), ref("task", tree.taskId)],
      worktreeId: id,
      taskId: tree.taskId,
      conflicts: tree.conflicts,
    });
    return tree;
  }

  get all(): readonly Worktree[] {
    return [...this.#trees.values()];
  }

  get open_(): readonly Worktree[] {
    return this.all.filter((t) => !t.integrated);
  }
}
