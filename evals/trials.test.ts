/**
 * The competency suite.
 *
 * Each test names a trial from `trials.ts` and proves the organization actually refuses. If
 * one of these goes green after a guarantee is removed, the suite was decorative.
 */

import { describe, expect, it } from "vitest";
import {
  ADVERSARIAL_SUITES,
  COMPETENCY_TRIALS,
} from "./trials.js";
import {
  EvidenceLedger,
  GLOBAL_DENY,
  TaskGraph,
  assertAllocationJustified,
  assertCorrespondence,
  evaluateFor,
  evaluateNecessity,
  evaluateRelease,
  citizenshipDecision,
  draftGenome,
  ref,
  RESIDENTS,
  QUALITY_COUNCIL,
  type GateContext,
  type ResidentId,
} from "@agent-city/core";

const trial = (id: string) => {
  const t = COMPETENCY_TRIALS.find((c) => c.id === id);
  if (!t) throw new Error(`no such trial: ${id}`);
  return t.guarantee;
};

function baseContext(): GateContext {
  const evidence = new EvidenceLedger();
  evidence.register("test://t1/case-1");
  evidence.record({ claim: "it works", status: "verified", pointers: ["test://t1/case-1"], recordedBy: "argus" });
  const tasks = new TaskGraph();
  tasks.add({
    id: "t1",
    objectiveId: "obj",
    title: "Build it",
    domain: "frontend",
    workClass: "implementation",
    owner: "rune",
    verifiers: ["argus"],
    acceptance: [{ id: "ac-1", text: "works", method: "functional_test" }],
  });
  tasks.applyVerdict("t1", { verifier: "argus", method: "functional_test", passed: true, summary: "ok", evidenceIds: ["evd-0001"], at: Date.now() });
  const councilVerdicts = new Map<ResidentId, { passed: boolean; summary: string; evidenceIds: readonly string[] }>();
  for (const id of QUALITY_COUNCIL) councilVerdicts.set(id, { passed: true, summary: "clear", evidenceIds: ["evd-0001"] });
  return { tasks, evidence, degradations: [], violations: [], councilVerdicts };
}

describe("evidence", () => {
  it(trial("evidence.no-pointer-no-verified"), () => {
    const l = new EvidenceLedger();
    expect(() => l.record({ claim: "it works", status: "verified", pointers: [], recordedBy: "rune" })).toThrow();
  });

  it(trial("evidence.opinion-is-not-execution"), () => {
    const l = new EvidenceLedger();
    l.register("review://nyx/read-through-1");
    expect(() =>
      l.record({ claim: "it works", status: "verified", pointers: ["review://nyx/read-through-1"], recordedBy: "nyx" }),
    ).toThrow(/not verified by an opinion/);
  });
});

describe("tasks", () => {
  it(trial("tasks.independent-verdict-required"), () => {
    const g = new TaskGraph();
    g.add({
      id: "t1",
      objectiveId: "o",
      title: "t",
      domain: "frontend",
      workClass: "implementation",
      owner: "rune",
      verifiers: ["argus"],
      acceptance: [{ id: "ac-1", text: "works", method: "functional_test" }],
    });
    expect(g.canComplete("t1").ok).toBe(false);
  });

  it(trial("tasks.failure-returns-to-repair"), () => {
    const g = new TaskGraph();
    g.add({
      id: "t1",
      objectiveId: "o",
      title: "t",
      domain: "frontend",
      workClass: "implementation",
      owner: "rune",
      verifiers: ["argus", "mercy"],
      acceptance: [
        { id: "ac-1", text: "works", method: "functional_test" },
        { id: "ac-2", text: "accessible", method: "a11y_audit" },
      ],
    });
    g.applyVerdict("t1", { verifier: "argus", method: "functional_test", passed: false, summary: "state lost", evidenceIds: [], at: Date.now() });
    // A pass from someone else does not clear the failure.
    g.applyVerdict("t1", { verifier: "mercy", method: "a11y_audit", passed: true, summary: "ok", evidenceIds: [], at: Date.now() });
    expect(g.get("t1").state).toBe("repair");
    expect(g.canComplete("t1").ok).toBe(false);
    expect(g.get("t1").failureHistory).toHaveLength(1);
  });
});

describe("permissions", () => {
  it(trial("permissions.deny-beats-allow"), () => {
    const tool = GLOBAL_DENY[0]!;
    expect(evaluateFor("atlas", { tool, intent: "x" }, { ownerGrants: [tool] }).outcome).toBe("deny");
  });

  it(trial("permissions.closed-by-default"), () => {
    expect(evaluateFor("iris", { tool: "a_tool_nobody_declared", intent: "x" }).outcome).toBe("deny");
  });

  it(trial("permissions.irreversible-escalates"), () => {
    expect(evaluateFor("pax", { tool: "external_publish", intent: "x" }).outcome).toBe("escalate");
  });

  it("no resident can write to work it is judging", () => {
    for (const r of RESIDENTS) {
      if (r.verifiesDomains.length === 0) continue;
      const decision = evaluateFor(r.id, { tool: "write", intent: "edit what it judges" });
      if (decision.outcome === "allow") {
        // Only permitted if the resident verifies nothing it could also author.
        expect(r.implementsDomains.some((d) => r.verifiesDomains.includes(d)), `${r.id}`).toBe(false);
      }
    }
  });
});

describe("release gates", () => {
  it(trial("gates.unknown-blocks"), () => {
    const ctx = baseContext();
    const partial = new Map(ctx.councilVerdicts);
    partial.delete("flux");
    const m = evaluateRelease("obj", { ...ctx, councilVerdicts: partial });
    expect(m.decision).toBe("blocked");
    expect(m.blockingGates).toContain("performance");
  });

  it(trial("gates.single-council-failure-blocks"), () => {
    const ctx = baseContext();
    const one = new Map(ctx.councilVerdicts);
    one.set("nyx", { passed: false, summary: "the retry owner is ambiguous", evidenceIds: [] });
    expect(evaluateRelease("obj", { ...ctx, councilVerdicts: one }).decision).toBe("blocked");
  });

  it(trial("routing.degradation-blocks"), () => {
    const m = evaluateRelease("obj", {
      ...baseContext(),
      degradations: [{ capability: "research swarm", requested: "16 investigators", used: "none", consequence: "no external validation", at: Date.now() }],
    });
    expect(m.decision).toBe("blocked");
    expect(m.outstanding.join(" ")).toContain("no external validation");
  });

  it("approves when, and only when, every blocking gate passes", () => {
    expect(evaluateRelease("obj", baseContext()).decision).toBe("approved");
  });
});

describe("routing", () => {
  it(trial("routing.allocation-must-be-earned"), () => {
    expect(() =>
      assertAllocationJustified(50, { independentBranches: 1, dependencyDepth: 4, uncertainty: 0.2, consequence: 0.3 }),
    ).toThrow(/does not justify parallelism/);
  });
});

describe("genesis", () => {
  const gap = {
    id: "gap-1",
    domain: "GPU/WebGL performance",
    currentOwners: ["rune", "flux"] as ResidentId[],
    observations: ["a", "b", "c"],
    recurrence: 3,
    overhead: 0.35,
  };

  it(trial("genesis.necessity-refuses-by-default"), () => {
    expect(evaluateNecessity({ ...gap, recurrence: 1 }).verdict).toBe("fail");
    expect(evaluateNecessity({ ...gap, overhead: 0.02 }).verdict).toBe("fail");
    expect(evaluateNecessity({ ...gap, domain: "security", currentOwners: ["rune"] }).verdict).toBe("fail");
    expect(evaluateNecessity(gap).verdict).toBe("pass");
  });

  it(trial("genesis.trials-gate-citizenship"), () => {
    const genome = draftGenome({
      gap,
      proposedName: "Vanta",
      mission: "m",
      expertise: ["WebGPU"],
      department: "performance-lab",
      mentor: "flux",
      allowedTools: ["read"],
      outputContract: ["diagnosis", "evidence", "proposed_fix"],
      evaluationSuite: ["rendering_benchmark"],
      ordinal: 31,
    });
    const passingTrials = [{ trial: "rendering_benchmark", score: 0.9, threshold: 0.75, passed: true }];
    const clean = [
      { reviewer: "argus" as ResidentId, passed: true, findings: [] },
      { reviewer: "aegis" as ResidentId, passed: true, findings: [] },
      { reviewer: "nyx" as ResidentId, passed: true, findings: [] },
    ];
    expect(citizenshipDecision({ genome, stage: "adversarial", trials: passingTrials, adversarial: clean }).granted).toBe(true);
    expect(
      citizenshipDecision({
        genome,
        stage: "adversarial",
        trials: [{ trial: "rendering_benchmark", score: 0.5, threshold: 0.75, passed: false }],
        adversarial: clean,
      }).granted,
    ).toBe(false);
    expect(
      citizenshipDecision({
        genome,
        stage: "adversarial",
        trials: passingTrials,
        adversarial: [...clean.slice(0, 2), { reviewer: "nyx" as ResidentId, passed: false, findings: ["duplicates Flux"] }],
      }).granted,
    ).toBe(false);
  });

  it("gives every adversarial reviewer at least one concrete check", () => {
    for (const suite of ADVERSARIAL_SUITES) {
      expect(suite.checks.length, `${suite.reviewer} has no checks`).toBeGreaterThan(0);
    }
  });
});

describe("events", () => {
  it(trial("events.correspondence-required"), () => {
    const drawable = {
      seq: 1,
      id: "e1",
      at: 0,
      from: "rune",
      severity: "info",
      refs: [],
      kind: "agent.moved",
      agent: "rune",
      fromDistrict: "a",
      toDistrict: "b",
      reason: "x",
    } as never;
    expect(assertCorrespondence(drawable).length).toBeGreaterThan(0);
    const grounded = { ...(drawable as object), refs: [ref("agent", "rune")] } as never;
    expect(assertCorrespondence(grounded)).toEqual([]);
  });
});

describe("the suite itself", () => {
  it("states, for every trial, what breaks if the guarantee is removed", () => {
    for (const t of COMPETENCY_TRIALS) {
      expect(t.ifRemoved.length, `${t.id} does not say what it protects`).toBeGreaterThan(20);
    }
  });
});
