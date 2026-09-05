/**
 * The Foundry at runtime.
 *
 * This is the class the whole design converges on: it owns the bus, the task graph, the
 * evidence ledger, the career records, the degradation ledger and the tracer, and it runs an
 * objective from an owner's sentence to a release decision.
 *
 * The owner experiences one finished handoff. Internally there may be fifty revisions — the
 * organization is allowed unlimited internal correction inside a resource budget, and is not
 * allowed to present an uncorrected result as a finished one.
 */

import {
  CareerLedger,
  DegradationLedger,
  EventBus,
  EvidenceLedger,
  MODEL_ROUTES,
  TaskGraph,
  Tracer,
  checkSeparationOfPowers,
  createIdFactory,
  district,
  evaluateFor,
  evaluateRelease,
  homeDistrict,
  planAllocation,
  ref,
  resident,
  slug,
  travelDistance,
  type CityEvent,
  type District,
  type ExecutionMode,
  type ReleaseManifest,
  type AgentActivity,
  type ResidentId,
  type Task,
  type TaskState,
  type Violation,
} from "@agent-city/core";
import type { Executor, ProducedArtifact } from "./executor.js";
import { methodFor } from "./executor.js";
import { PRODUCTION_PLAN, WORK_DISTRICT, type PlannedTask } from "./plan.js";
import { runSwarm } from "./swarm.js";
import { WorktreeRegistry, type WorktreeBackend } from "./worktrees.js";
import { GenesisFoundry, type GenesisOutcome } from "./foundry.js";

export interface FoundryOptions {
  readonly executor: Executor;
  readonly seed?: string;
  /** Repair cycles a single task may consume before it is declared failed. */
  readonly maxRepairCycles?: number;
  /** Tools the owner has authorized for this run. Absent ⇒ nothing irreversible proceeds. */
  readonly ownerGrants?: readonly string[];
  readonly worktreeBackend?: WorktreeBackend;
  readonly clock?: () => number;
  /** Run the Genesis Foundry after the build. On by default. */
  readonly genesis?: boolean;
}

export interface RunResult {
  readonly objectiveId: string;
  readonly objective: string;
  readonly mode: ExecutionMode;
  readonly manifest: ReleaseManifest;
  readonly tasks: TaskGraph;
  readonly events: readonly CityEvent[];
  readonly violations: readonly Violation[];
  readonly genesis: readonly GenesisOutcome[];
  readonly elapsedMs: number;
  readonly tokensIn: number;
  readonly tokensOut: number;
}

export class Foundry {
  readonly bus: EventBus;
  readonly tasks = new TaskGraph();
  readonly evidence = new EvidenceLedger();
  readonly careers = new CareerLedger();
  readonly degradations = new DegradationLedger();
  readonly tracer: Tracer;
  readonly worktrees: WorktreeRegistry;
  readonly violations: Violation[] = [];

  readonly #executor: Executor;
  readonly #maxCycles: number;
  readonly #grants: readonly string[];
  readonly #ids: (kind: string) => string;
  readonly #seed: string;
  readonly #runGenesis: boolean;
  readonly #locations = new Map<string, District>();
  readonly #artifacts = new Map<string, ProducedArtifact[]>();
  readonly #councilVerdicts = new Map<ResidentId, { passed: boolean; summary: string; evidenceIds: readonly string[] }>();
  #tokensIn = 0;
  #tokensOut = 0;

  constructor(opts: FoundryOptions) {
    this.#executor = opts.executor;
    this.#maxCycles = opts.maxRepairCycles ?? 5;
    this.#grants = opts.ownerGrants ?? [];
    this.#seed = opts.seed ?? "foundry";
    this.#runGenesis = opts.genesis ?? true;
    this.bus = new EventBus(opts.clock ? { clock: opts.clock } : {});
    this.tracer = new Tracer(opts.clock);
    this.worktrees = new WorktreeRegistry(this.bus, opts.worktreeBackend);
    this.#ids = createIdFactory(this.#seed);
  }

  // ── movement ────────────────────────────────────────────────────────────────────────────

  /**
   * Move a resident. Emitted only as a consequence of real work, and always carrying the id
   * of the task that caused it — a figure crossing the city with no task behind it is exactly
   * the theater Article 9 forbids.
   */
  #move(agent: ResidentId, to: District, reason: string, taskId?: string): void {
    const from = this.#locations.get(agent) ?? homeDistrict(agent);
    if (from === to) return;
    this.#locations.set(agent, to);
    this.bus.publish({
      kind: "agent.moved",
      from: agent,
      severity: "info",
      refs: taskId ? [ref("agent", agent), ref("task", taskId)] : [ref("agent", agent)],
      agent,
      fromDistrict: from,
      toDistrict: to,
      reason: `${reason} (${travelDistance(from, to)} tiles)`,
    });
  }

  #state(agent: ResidentId | string, activity: AgentActivity, taskId?: string, detail?: string): void {
    this.bus.publish({
      kind: "agent.state",
      from: agent,
      severity: "info",
      refs: taskId ? [ref("agent", String(agent)), ref("task", taskId)] : [ref("agent", String(agent))],
      agent,
      activity,
      ...(taskId ? { taskId } : {}),
      ...(detail ? { detail } : {}),
    });
  }

  // ── the run ─────────────────────────────────────────────────────────────────────────────

  async run(objective: string): Promise<RunResult> {
    const started = Date.now();
    const objectiveId = `obj-${slug(objective, 4)}`;
    const mode: ExecutionMode = this.#executor.mode === "live" ? "live" : "rehearsal";

    this.bus.publish({
      kind: "run.started",
      from: "system",
      severity: "notable",
      refs: [ref("objective", objectiveId)],
      objectiveId,
      objective,
      mode,
    });

    // Article 8, stated at the top of the run rather than discovered at the end of it: a
    // rehearsal cannot produce a release, and says so before it does any work.
    if (mode === "rehearsal") {
      const d = this.degradations.record(
        "maximum-capability execution",
        `${MODEL_ROUTES.deep.model} / ${MODEL_ROUTES.standard.model} agents`,
        this.#executor.name,
        "no work in this run was performed by a model; the run demonstrates the organization, it does not produce a releasable result",
      );
      this.bus.publish({
        kind: "capability.degraded",
        from: "atlas",
        severity: "release_blocking",
        refs: [ref("objective", objectiveId)],
        capability: d.capability,
        requested: d.requested,
        used: d.used,
        consequence: d.consequence,
      });
    }

    await this.#interpret(objectiveId, objective);
    this.#plan(objectiveId);
    await this.#execute(objectiveId);
    const genesis = this.#runGenesis ? await this.#genesis(objectiveId) : [];
    const manifest = this.#release(objectiveId);

    const elapsedMs = Date.now() - started;
    this.bus.publish({
      kind: "run.finished",
      from: "system",
      severity: manifest.decision === "approved" ? "notable" : "release_blocking",
      refs: [ref("objective", objectiveId), ref("release", manifest.id)],
      objectiveId,
      outcome: manifest.decision === "approved" ? "released" : "blocked",
      elapsedMs,
    });

    return {
      objectiveId,
      objective,
      mode,
      manifest,
      tasks: this.tasks,
      events: this.bus.journal,
      violations: [...this.violations, ...this.bus.violations],
      genesis,
      elapsedMs,
      tokensIn: this.#tokensIn,
      tokensOut: this.#tokensOut,
    };
  }

  async #interpret(objectiveId: string, objective: string): Promise<void> {
    const span = this.tracer.modelCall({
      model: MODEL_ROUTES.deep.model,
      operation: "chat",
      agent: "atlas",
      effort: MODEL_ROUTES.deep.effort ?? undefined,
    });
    this.#state("atlas", "thinking", undefined, "interpreting the objective");
    const out = await this.#executor.interpret(objective, MODEL_ROUTES.deep);
    this.#tokensIn += out.tokensIn;
    this.#tokensOut += out.tokensOut;
    this.tracer.end(span, "ok");
    this.bus.publish({
      kind: "objective.interpreted",
      from: "atlas",
      severity: "notable",
      refs: [ref("objective", objectiveId)],
      objectiveId,
      successCriteria: out.successCriteria,
      risks: out.risks,
      uncertainties: out.uncertainties,
    });
  }

  #plan(objectiveId: string): void {
    const keyToId = new Map<string, string>();
    for (const planned of PRODUCTION_PLAN) {
      const id = `${planned.key}-${this.#ids("task").split("-")[2]}`;
      keyToId.set(planned.key, id);

      const verifiers = [...new Set(planned.criteria.map((c) => c.by))];
      const separation = checkSeparationOfPowers([planned.owner], verifiers, id);
      if (separation) {
        this.violations.push(separation);
        this.bus.publish({
          kind: "constitution.violated",
          from: "atlas",
          severity: "release_blocking",
          refs: [ref("task", id)],
          article: separation.article,
          subject: separation.subject,
          detail: separation.detail,
        });
        continue;
      }

      this.tasks.add({
        id,
        objectiveId,
        title: planned.title,
        domain: planned.domain,
        workClass: planned.workClass,
        owner: planned.owner,
        verifiers,
        dependsOn: planned.dependsOn.map((k) => keyToId.get(k)!).filter(Boolean),
        acceptance: planned.criteria.map((c, i) => ({ id: `${id}-ac${i + 1}`, text: c.text, method: c.method })),
      });

      this.bus.publish({
        kind: "task.created",
        from: "atlas",
        severity: "info",
        refs: [ref("task", id), ref("objective", objectiveId)],
        taskId: id,
        title: planned.title,
        owner: planned.owner,
        dependsOn: planned.dependsOn.map((k) => keyToId.get(k)!).filter(Boolean),
        workClass: planned.workClass,
      });
    }

    const cycle = this.tasks.findCycle();
    if (cycle) {
      throw new Error(`the plan contains a dependency cycle and can never complete: ${cycle.join(" → ")}`);
    }
    this.#planIndex = new Map(PRODUCTION_PLAN.map((p) => [keyToId.get(p.key)!, p]));
  }

  #planIndex = new Map<string, PlannedTask>();

  /**
   * Drive the graph to a settled state.
   *
   * Ready tasks run concurrently — that is what the dependency graph is *for*. A task that is
   * waiting shows as waiting rather than pretending to work.
   */
  async #execute(objectiveId: string): Promise<void> {
    let guard = 0;
    while (!this.tasks.isSettled) {
      if (++guard > PRODUCTION_PLAN.length * (this.#maxCycles + 3)) {
        throw new Error("orchestration failed to converge; refusing to spin");
      }

      for (const t of this.tasks.waiting()) {
        this.bus.publish({
          kind: "task.waiting",
          from: t.owner,
          severity: "info",
          refs: [ref("task", t.id)],
          taskId: t.id,
          owner: t.owner,
          waitingOn: this.tasks.unresolvedDeps(t.id),
        });
        this.#state(t.owner, "waiting", t.id, `blocked behind ${this.tasks.unresolvedDeps(t.id).length} task(s)`);
      }

      const runnable = [...this.tasks.ready(), ...this.tasks.all.filter((t) => t.state === "repair")];
      if (runnable.length === 0) {
        const stuck = this.tasks.all.filter((t) => t.state !== "complete" && t.state !== "failed");
        if (stuck.length > 0) throw new Error(`stalled with ${stuck.length} unfinished task(s)`);
        break;
      }

      await Promise.all(runnable.map((t) => this.#runTask(t, objectiveId)));
    }
  }

  async #runTask(task: Task, objectiveId: string): Promise<void> {
    const planned = this.#planIndex.get(task.id);
    const owner = resident(task.owner);
    const cycle = task.cycles;
    const isRepair = task.state === "repair";

    const allocation = planAllocation(task.workClass, task.owner, {
      independentBranches: planned?.branches ?? 1,
      dependencyDepth: planned?.dependencyDepth ?? 1,
      uncertainty: 0.5,
      consequence: planned?.consequence ?? 0.5,
    });

    task.state = "assigned";
    this.bus.publish({
      kind: "task.assigned",
      from: "atlas",
      severity: "info",
      refs: [ref("task", task.id)],
      taskId: task.id,
      owner: task.owner,
      route: `${allocation.route.model}${allocation.route.effort ? ` · effort ${allocation.route.effort}` : ""}`,
      workers: allocation.workers,
    });

    this.#move(task.owner, (WORK_DISTRICT[task.domain] ?? homeDistrict(task.owner)) as District, isRepair ? "returning to repair" : "starting assigned work", task.id);
    task.state = "working";
    this.bus.publish({
      kind: "task.started",
      from: task.owner,
      severity: "info",
      refs: [ref("task", task.id)],
      taskId: task.id,
      owner: task.owner,
    });
    this.#state(task.owner, isRepair ? "repairing" : "working", task.id);

    // A research task fans out into the Research Cloud before the owner writes anything.
    if (task.workClass === "deep_research" && !isRepair) {
      await this.#research(task, planned);
    }

    // Parallel implementation work gets isolated worktrees.
    const worktree =
      allocation.workers > 0 && task.workClass === "implementation"
        ? await this.worktrees.open(task.id, task.owner)
        : null;

    const context = this.#contextFor(task);
    const repairBrief = isRepair ? task.verdicts.filter((v) => !v.passed).map((v) => `${v.verifier}/${v.method}: ${v.summary}`).join("; ") : undefined;

    const span = this.tracer.modelCall({
      model: allocation.route.model,
      operation: "chat",
      agent: task.owner,
      effort: allocation.route.effort ?? undefined,
    });
    const output = await this.#executor.perform({
      task,
      resident: owner,
      route: allocation.route,
      context,
      cycle,
      ...(repairBrief ? { repairBrief } : {}),
    });
    this.#tokensIn += output.tokensIn;
    this.#tokensOut += output.tokensOut;
    this.tracer.end(span, "ok", undefined);

    if (output.degraded) {
      // Recorded once per capability, not once per task — a wall of identical lines on the
      // manifest hides the one degradation that mattered.
      if (!this.degradations.entries.some((d) => d.used === output.degraded!.used)) {
        this.degradations.record("agent execution", output.degraded.requested, output.degraded.used, output.degraded.consequence);
      }
    }

    // Register artifacts, then record the owner's claims — never as verified. A builder
    // cannot supply the executed evidence for its own work.
    const artifacts: ProducedArtifact[] = [];
    for (const a of output.artifacts) {
      const artifactId = this.#ids("art");
      artifacts.push(a);
      if (a.evidenceUri) this.evidence.register(a.evidenceUri);
      this.bus.publish({
        kind: "artifact.produced",
        from: task.owner,
        severity: "info",
        refs: [ref("artifact", artifactId), ref("task", task.id)],
        artifactId,
        taskId: task.id,
        artifactKind: a.kind,
        producer: task.owner,
        summary: a.summary,
      });
      task.artifactIds.push(artifactId);
    }
    this.#artifacts.set(task.id, artifacts);

    for (const m of output.messages) {
      this.bus.publish({
        kind: "message.sent",
        from: task.owner,
        severity: "info",
        refs: [ref("task", task.id), ref("agent", m.to)],
        to: m.to,
        subject: m.subject,
        body: m.body,
        taskId: task.id,
      });
    }

    task.state = "submitted";
    this.bus.publish({
      kind: "task.submitted",
      from: task.owner,
      severity: "info",
      refs: [ref("task", task.id)],
      taskId: task.id,
      owner: task.owner,
      artifactIds: task.artifactIds,
    });

    if (worktree) await this.worktrees.integrate(worktree.id);

    await this.#verify(task, artifacts, objectiveId);
  }

  async #research(task: Task, planned: PlannedTask | undefined): Promise<void> {
    const swarmId = this.#ids("swarm");
    const branches = Array.from({ length: planned?.branches ?? 4 }, (_, i) => `branch ${i + 1} of "${task.title}"`);
    const result = await runSwarm(
      { question: task.title, branches },
      {
        bus: this.bus,
        executor: this.#executor,
        tracer: this.tracer,
        evidence: this.evidence,
        degradations: this.degradations,
        lead: task.owner,
        leadRoute: MODEL_ROUTES.deep,
        swarmId,
      },
    );
    this.#tokensIn += result.tokensIn;
    this.#tokensOut += result.tokensOut;

    // Contradictions are the swarm's most valuable output and its most expensive obligation:
    // the lead must resolve each one before the release gate will pass.
    for (const contestedId of result.contestedClaimIds) {
      const claim = this.evidence.claims.find((c) => c.id === contestedId);
      if (!claim) continue;
      const resolutionUri = `trace://contradiction/${contestedId}`;
      this.evidence.register(resolutionUri);
      this.evidence.record({
        claim: `Resolved: ${claim.claim}`,
        status: "sourced",
        pointers: [resolutionUri, ...claim.pointers.map((p) => p.uri)],
        recordedBy: task.owner,
        taskId: task.id,
        supersedes: contestedId,
      });
    }
  }

  /** What a resident is entitled to see: the outputs of the tasks it actually depends on. */
  #contextFor(task: Task): { from: string; kind: string; summary: string }[] {
    return task.dependsOn.flatMap((depId) => {
      const dep = this.tasks.get(depId);
      return (this.#artifacts.get(depId) ?? []).map((a) => ({
        from: dep.owner,
        kind: a.kind,
        summary: a.summary,
      }));
    });
  }

  async #verify(task: Task, artifacts: readonly ProducedArtifact[], objectiveId: string): Promise<void> {
    task.state = "verifying";
    const verdicts = await Promise.all(
      task.verifiers.map(async (verifierId) => {
        const verifier = resident(verifierId);
        const { method } = methodFor(verifierId);

        // The permission layer is consulted even for a verifier: a QA agent that could
        // rewrite the feature it is judging is not an independent verifier.
        const decision = evaluateFor(verifierId, { tool: "write", intent: `edit ${task.id} while judging it` }, { ownerGrants: this.#grants });
        if (decision.outcome === "allow") {
          const v: Violation = {
            article: "A6_BUILDER_IS_NOT_JUDGE",
            subject: task.id,
            detail: `${verifierId} holds write access to work it is judging`,
            at: Date.now(),
          };
          this.violations.push(v);
          this.bus.publish({
            kind: "constitution.violated",
            from: "aegis",
            severity: "release_blocking",
            refs: [ref("task", task.id), ref("agent", verifierId)],
            article: v.article,
            subject: v.subject,
            detail: v.detail,
          });
        }

        this.#move(verifierId, (WORK_DISTRICT[verifier.implementsDomains[0] ?? "quality"] ?? "verification-arena") as District, `verifying ${task.id}`, task.id);
        this.#state(verifierId, "verifying", task.id, method);
        this.bus.publish({
          kind: "verification.started",
          from: verifierId,
          severity: "info",
          refs: [ref("task", task.id), ref("agent", verifierId)],
          taskId: task.id,
          verifier: verifierId,
          method,
        });

        const span = this.tracer.modelCall({
          model: MODEL_ROUTES[verifier.modelClass].model,
          operation: "chat",
          agent: verifierId,
          effort: MODEL_ROUTES[verifier.modelClass].effort ?? undefined,
        });
        const out = await this.#executor.verify({
          task,
          verifier,
          route: MODEL_ROUTES[verifier.modelClass],
          method,
          artifacts,
          cycle: task.cycles,
        });
        this.#tokensIn += out.tokensIn;
        this.#tokensOut += out.tokensOut;
        this.tracer.end(span, "ok");

        this.evidence.registerAll(out.evidenceUris);
        const evidenceIds: string[] = [];
        if (out.passed) {
          const claim = this.evidence.record({
            claim: `${task.title} passes ${method}`,
            status: "verified",
            pointers: out.evidenceUris,
            recordedBy: verifierId,
            taskId: task.id,
          });
          evidenceIds.push(claim.id);
          this.bus.publish({
            kind: "evidence.recorded",
            from: verifierId,
            severity: "info",
            refs: [ref("evidence", claim.id), ref("task", task.id)],
            evidenceId: claim.id,
            claim: claim.claim,
            status: claim.status,
            pointers: out.evidenceUris,
          });
        }

        return { verifierId, method, out, evidenceIds };
      }),
    );

    for (const { verifierId, method, out, evidenceIds } of verdicts) {
      this.tasks.applyVerdict(task.id, {
        verifier: verifierId,
        method,
        passed: out.passed,
        summary: out.summary,
        evidenceIds,
        at: Date.now(),
      });

      if (out.passed) {
        this.bus.publish({
          kind: "verification.passed",
          from: verifierId,
          severity: "info",
          refs: [ref("task", task.id), ref("agent", verifierId)],
          taskId: task.id,
          verifier: verifierId,
          method,
          evidenceIds,
        });
      } else {
        this.bus.publish({
          kind: "verification.failed",
          from: verifierId,
          severity: "release_blocking",
          refs: [ref("task", task.id), ref("agent", verifierId), ref("agent", task.owner)],
          taskId: task.id,
          verifier: verifierId,
          owner: task.owner,
          method,
          summary: out.summary,
          requiredAction: out.requiredAction === "none" ? "repair_and_retest" : out.requiredAction,
          evidenceIds,
        });
      }
    }

    const failed = verdicts.filter((v) => !v.out.passed);
    if (failed.length > 0) {
      if (task.cycles > this.#maxCycles) {
        task.state = "failed";
        task.failureReason = `exhausted ${this.#maxCycles} repair cycles; outstanding: ${failed.map((f) => f.out.summary).join("; ")}`;
        this.bus.publish({
          kind: "task.failed",
          from: task.owner,
          severity: "release_blocking",
          refs: [ref("task", task.id)],
          taskId: task.id,
          owner: task.owner,
          reason: task.failureReason,
        });
        for (const blocked of this.tasks.cascadeBlock(task.id)) {
          this.bus.publish({
            kind: "task.blocked",
            from: blocked.owner,
            severity: "release_blocking",
            refs: [ref("task", blocked.id), ref("task", task.id)],
            taskId: blocked.id,
            owner: blocked.owner,
            reason: blocked.blockedReason ?? "upstream failure",
            blockedBy: blocked.dependsOn,
          });
          this.#state(blocked.owner, "blocked", blocked.id, blocked.blockedReason);
        }
        return;
      }
      this.bus.publish({
        kind: "task.repair_requested",
        from: failed[0]!.verifierId,
        severity: "release_blocking",
        refs: [ref("task", task.id), ref("agent", task.owner)],
        taskId: task.id,
        owner: task.owner,
        summary: failed.map((f) => f.out.summary).join("; "),
        cycle: task.cycles,
      });
      this.#state(task.owner, "repairing", task.id, failed[0]!.out.summary);
      return;
    }

    if ((task.state as TaskState) === "complete") {
      this.bus.publish({
        kind: "task.completed",
        from: task.owner,
        severity: "notable",
        refs: [ref("task", task.id), ref("objective", objectiveId)],
        taskId: task.id,
        owner: task.owner,
        cycles: task.cycles,
      });
      this.#recordCareer(task);
      this.#state(task.owner, "idle", task.id);
    }
  }

  #recordCareer(task: Task): void {
    const planned = this.#planIndex.get(task.id);
    this.careers.record(task.owner, {
      taskId: task.id,
      domain: task.domain,
      firstPass: task.cycles === 0,
      repairCycles: task.cycles,
      criticalRegression: false,
      reviewOverturned: false,
      skills: [task.domain, ...(planned ? [planned.workClass] : [])],
      at: Date.now(),
    });
    const record = this.careers.recordFor(task.owner);
    this.bus.publish({
      kind: "career.updated",
      from: "mnemos",
      severity: "info",
      refs: [ref("agent", task.owner), ref("task", task.id)],
      agent: task.owner,
      assignments: record.assignments,
      firstPassRate: record.firstPassRate,
      rank: record.rank,
      earned: record.specializations,
    });

    // Verifiers earn a record too — being right repeatedly is a measured competency.
    for (const v of task.verdicts) {
      this.careers.record(v.verifier, {
        taskId: task.id,
        domain: task.domain,
        firstPass: true,
        repairCycles: 0,
        criticalRegression: false,
        reviewOverturned: false,
        skills: [v.method],
        at: v.at,
      });
    }
  }

  async #genesis(objectiveId: string): Promise<readonly GenesisOutcome[]> {
    const foundry = new GenesisFoundry(this.bus, this.#seed);
    return foundry.run(this.tasks, this.#planIndex, objectiveId);
  }

  #release(objectiveId: string): ReleaseManifest {
    this.#move("pax", "release-tower", "assembling the evidence manifest");
    this.#state("pax", "reviewing", undefined, "assembling the evidence manifest");

    // Council verdicts are read off the recorded verdicts, not asked for again. A council
    // member that never rendered a verdict leaves its gate `unknown`, which blocks.
    for (const task of this.tasks.all) {
      for (const v of task.verdicts) {
        const prior = this.#councilVerdicts.get(v.verifier);
        const passed = (prior?.passed ?? true) && v.passed;
        this.#councilVerdicts.set(v.verifier, {
          passed,
          summary: passed
            ? `cleared ${(prior?.evidenceIds.length ?? 0) + v.evidenceIds.length} check(s)`
            : v.summary,
          evidenceIds: [...(prior?.evidenceIds ?? []), ...v.evidenceIds],
        });
      }
    }

    const manifest = evaluateRelease(objectiveId, {
      tasks: this.tasks,
      evidence: this.evidence,
      degradations: this.degradations.entries,
      violations: [...this.violations, ...this.bus.violations],
      councilVerdicts: this.#councilVerdicts,
    });

    for (const gate of manifest.gates) {
      this.bus.publish({
        kind: "gate.evaluated",
        from: gate.owner,
        severity: gate.status === "pass" ? "info" : "release_blocking",
        refs: [ref("gate", gate.gateId), ref("release", manifest.id)],
        gateId: gate.gateId,
        status: gate.status,
        owner: gate.owner,
        detail: gate.detail,
      });
    }

    if (manifest.decision === "approved") {
      // Even an approved manifest goes through the permission layer. Approval is irreversible.
      const decision = evaluateFor("pax", { tool: "release_approve", intent: "authorize release", reversibility: "irreversible" }, { ownerGrants: this.#grants });
      if (decision.outcome !== "allow") {
        this.bus.publish({
          kind: "tool.escalated",
          from: "pax",
          severity: "notable",
          refs: [ref("release", manifest.id)],
          agent: "pax",
          tool: "release_approve",
          reason: decision.rule,
        });
        return {
          ...manifest,
          decision: "blocked",
          blockingGates: [...manifest.blockingGates, "owner_authorization"],
          outstanding: [...manifest.outstanding, `Release authorization is owner-held: ${decision.rule}`],
        };
      }
      this.bus.publish({
        kind: "release.approved",
        from: "pax",
        severity: "notable",
        refs: [ref("release", manifest.id), ref("objective", objectiveId)],
        releaseId: manifest.id,
        manifestId: manifest.id,
        gates: manifest.gates.length,
      });
    } else {
      this.bus.publish({
        kind: "release.blocked",
        from: "pax",
        severity: "release_blocking",
        refs: [ref("release", manifest.id), ref("objective", objectiveId)],
        releaseId: manifest.id,
        blockingGates: manifest.blockingGates,
        outstanding: manifest.outstanding,
      });
    }

    return manifest;
  }

  /** Current district of every agent the run has moved. Used by the renderer on catch-up. */
  get locations(): ReadonlyMap<string, District> {
    return this.#locations;
  }
}

export { district };
