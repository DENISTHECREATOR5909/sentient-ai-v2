import { describe, expect, it } from "vitest";
import { Foundry } from "./organization.js";
import { RehearsalExecutor } from "./executors/rehearsal.js";
import { QUALITY_COUNCIL, renderManifest } from "@agent-city/core";
import { PRODUCTION_PLAN } from "./plan.js";

async function run(opts: { defectRate?: number; seed?: string; genesis?: boolean } = {}) {
  const foundry = new Foundry({
    executor: new RehearsalExecutor({ seed: opts.seed ?? "test", defectRate: opts.defectRate ?? 0.45 }),
    seed: opts.seed ?? "test",
    genesis: opts.genesis ?? true,
    ownerGrants: ["release_approve"],
  });
  const result = await foundry.run("Build a checkout flow that never loses a customer's work");
  return { foundry, result };
}

describe("a full production run", () => {
  it("settles every task and reaches a release decision", async () => {
    const { result } = await run();
    expect(result.tasks.size).toBe(PRODUCTION_PLAN.length);
    expect(result.tasks.isSettled).toBe(true);
    expect(["approved", "blocked"]).toContain(result.manifest.decision);
  });

  it("blocks the release, because a rehearsal is not maximum-capability execution", async () => {
    const { result } = await run();
    expect(result.mode).toBe("rehearsal");
    expect(result.manifest.decision).toBe("blocked");
    expect(result.manifest.blockingGates).toContain("capability_route");
    const text = renderManifest(result.manifest);
    expect(text).toContain("QUALITY GATE: NOT SATISFIED");
    expect(text).toContain("RELEASE STATUS: BLOCKED");
  });

  it("names the degradation rather than reporting a quiet success", async () => {
    const { result } = await run();
    const degraded = result.events.filter((e) => e.kind === "capability.degraded");
    expect(degraded.length).toBeGreaterThan(0);
    expect(result.manifest.outstanding.join(" ")).toContain("does not produce a releasable result");
  });

  it("records no constitutional violations of its own", async () => {
    const { result } = await run();
    expect(result.violations.map((v) => `${v.article}: ${v.detail}`)).toEqual([]);
  });

  it("gives every event a runtime entity to correspond to — Article 9", async () => {
    const { result } = await run();
    for (const e of result.events) {
      const runLevel = e.kind === "run.started" || e.kind === "run.finished";
      if (!runLevel) expect(e.refs.length, `${e.kind} has no refs`).toBeGreaterThan(0);
    }
  });

  it("emits a monotonic, gapless event stream a renderer can trust", async () => {
    const { result } = await run();
    result.events.forEach((e, i) => expect(e.seq).toBe(i + 1));
  });
});

describe("the repair loop", () => {
  it("returns failed artifacts to their owner and retests them", async () => {
    const { result } = await run({ defectRate: 1 });
    const failures = result.events.filter((e) => e.kind === "verification.failed");
    const repairs = result.events.filter((e) => e.kind === "task.repair_requested");
    expect(failures.length).toBeGreaterThan(0);
    expect(repairs.length).toBeGreaterThan(0);
    // Everything that failed was eventually accepted or explicitly failed — never abandoned.
    expect(result.tasks.isSettled).toBe(true);
  });

  it("never completes a task with an outstanding failed verdict", async () => {
    const { result } = await run({ defectRate: 1 });
    for (const t of result.tasks.all.filter((x) => x.state === "complete")) {
      expect(t.verdicts.every((v) => v.passed), `${t.id} completed with a failed verdict`).toBe(true);
    }
  });

  it("keeps the repair cycles internal — the owner sees one handoff", async () => {
    const { result } = await run({ defectRate: 1 });
    const totalCycles = result.tasks.all.reduce((s, t) => s + t.cycles, 0);
    expect(totalCycles).toBeGreaterThan(0);
    expect(result.events.filter((e) => e.kind === "run.finished")).toHaveLength(1);
  });

  it("fails a task rather than looping forever when repair does not converge", async () => {
    const foundry = new Foundry({
      executor: new RehearsalExecutor({ seed: "stuck", defectRate: 1 }),
      seed: "stuck",
      maxRepairCycles: 0,
      genesis: false,
    });
    const result = await foundry.run("An objective whose verification never passes");
    expect(result.tasks.all.some((t) => t.state === "failed")).toBe(true);
    expect(result.manifest.decision).toBe("blocked");
  });
});

describe("separation of powers, at runtime", () => {
  it("never lets a task's owner appear among its verifiers", async () => {
    const { result } = await run();
    for (const t of result.tasks.all) {
      expect(t.verifiers).not.toContain(t.owner);
      for (const v of t.verdicts) expect(v.verifier).not.toBe(t.owner);
    }
  });

  it("seats the whole quality council across the run", async () => {
    const { result } = await run();
    const verifiers = new Set(result.tasks.all.flatMap((t) => t.verdicts.map((v) => v.verifier)));
    for (const member of QUALITY_COUNCIL) {
      expect(verifiers.has(member), `${member} never rendered a verdict`).toBe(true);
    }
  });
});

describe("the research cloud", () => {
  it("fans out only as far as the branches justify", async () => {
    const { result } = await run();
    const spawned = result.events.find((e) => e.kind === "swarm.spawned");
    expect(spawned).toBeDefined();
    if (spawned?.kind === "swarm.spawned") {
      const branches = PRODUCTION_PLAN.find((p) => p.key === "research")!.branches;
      // Routing selects the 16-investigator configuration, then clamps to the branches that
      // actually exist. Four idle investigators would duplicate work, not add coverage.
      expect(spawned.workers).toBe(branches);
      expect(spawned.model).toContain("claude");
    }
    expect(result.events.some((e) => e.kind === "swarm.dissolved")).toBe(true);
  });

  it("releases its investigators when the question is answered", async () => {
    const { result } = await run();
    const spawned = result.events.filter((e) => e.kind === "swarm.spawned").length;
    const dissolved = result.events.filter((e) => e.kind === "swarm.dissolved").length;
    expect(dissolved).toBe(spawned);
  });

  it("surfaces contradictions and resolves them rather than averaging them away", async () => {
    const { foundry, result } = await run();
    const contradictions = result.events.filter((e) => e.kind === "swarm.contradiction");
    if (contradictions.length > 0) {
      // Every contested claim carries a later claim that supersedes it.
      expect(foundry.evidence.contested).toHaveLength(0);
      expect(foundry.evidence.claims.some((c) => c.supersedes)).toBe(true);
    }
  });

  it("records research as sourced, never as verified", async () => {
    const { foundry } = await run();
    for (const c of foundry.evidence.claims.filter((x) => x.recordedBy === "verity")) {
      expect(c.status).not.toBe("verified");
    }
  });
});

describe("determinism", () => {
  it("produces an identical event stream for an identical seed", async () => {
    const a = await run({ seed: "same" });
    const b = await run({ seed: "same" });
    const strip = (r: typeof a.result) => r.events.map((e) => `${e.seq}:${e.kind}:${e.from}`);
    expect(strip(a.result)).toEqual(strip(b.result));
  });

  it("produces a different stream for a different seed", async () => {
    const a = await run({ seed: "alpha", defectRate: 0.5 });
    const b = await run({ seed: "beta", defectRate: 0.5 });
    expect(a.result.events.length).not.toBe(b.result.events.length);
  });
});
