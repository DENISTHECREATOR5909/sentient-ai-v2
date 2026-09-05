import { describe, expect, it } from "vitest";
import { RELEASE_GATES, evaluateRelease, renderManifest, type GateContext } from "./gates.js";
import { EvidenceLedger } from "./evidence.js";
import { TaskGraph } from "./tasks.js";
import type { ResidentId } from "./residents.js";
import { QUALITY_COUNCIL } from "./residents.js";

function completedGraph(): TaskGraph {
  const g = new TaskGraph();
  g.add({
    id: "t1",
    objectiveId: "obj-1",
    title: "Build it",
    domain: "frontend",
    workClass: "implementation",
    owner: "rune",
    verifiers: ["argus"],
    acceptance: [{ id: "ac-1", text: "works", method: "functional_test" }],
  });
  g.applyVerdict("t1", {
    verifier: "argus",
    method: "functional_test",
    passed: true,
    summary: "ok",
    evidenceIds: ["evd-0001"],
    at: Date.now(),
  });
  return g;
}

function fullContext(overrides: Partial<GateContext> = {}): GateContext {
  const evidence = new EvidenceLedger();
  evidence.registerAll(["test://t1/case-1", "audit://a11y/sweep-1"]);
  evidence.record({ claim: "it works", status: "verified", pointers: ["test://t1/case-1"], recordedBy: "argus" });
  const councilVerdicts = new Map<ResidentId, { passed: boolean; summary: string; evidenceIds: readonly string[] }>();
  for (const id of QUALITY_COUNCIL) {
    councilVerdicts.set(id, { passed: true, summary: `${id} clear`, evidenceIds: ["evd-0001"] });
  }
  return { tasks: completedGraph(), evidence, degradations: [], violations: [], councilVerdicts, ...overrides };
}

describe("release gates — Article 4, fail-closed", () => {
  it("blocks when a council member has simply not reported", () => {
    const ctx = fullContext();
    const partial = new Map(ctx.councilVerdicts);
    partial.delete("nyx");
    const m = evaluateRelease("obj-1", { ...ctx, councilVerdicts: partial });
    expect(m.decision).toBe("blocked");
    expect(m.blockingGates).toContain("adversarial");
    expect(m.outstanding.join(" ")).toContain("unknown is not a pass");
  });

  it("blocks on an empty context — silence is never readiness", () => {
    const m = evaluateRelease("obj-1", {
      tasks: new TaskGraph(),
      evidence: new EvidenceLedger(),
      degradations: [],
      violations: [],
      councilVerdicts: new Map(),
    });
    expect(m.decision).toBe("blocked");
    // Every gate that demands evidence blocks. `capability_route` and
    // `constitutional_integrity` legitimately pass: nothing was degraded and nothing was
    // violated, because nothing happened at all — which the other gates are there to catch.
    const evidenceDemanding = RELEASE_GATES.filter(
      (g) => g.blocking && g.id !== "capability_route" && g.id !== "constitutional_integrity",
    ).map((g) => g.id);
    expect([...m.blockingGates].sort()).toEqual([...evidenceDemanding].sort());
  });

  it("blocks on any single council failure however many others passed", () => {
    const ctx = fullContext();
    const one = new Map(ctx.councilVerdicts);
    one.set("mercy", { passed: false, summary: "contrast 2.9:1 on the primary action", evidenceIds: [] });
    const m = evaluateRelease("obj-1", { ...ctx, councilVerdicts: one });
    expect(m.decision).toBe("blocked");
    expect(m.blockingGates).toEqual(["accessibility"]);
  });

  it("approves only when every blocking gate passes", () => {
    const m = evaluateRelease("obj-1", fullContext());
    expect(m.decision).toBe("approved");
    expect(m.blockingGates).toEqual([]);
    expect(m.outstanding).toEqual([]);
  });
});

describe("Article 8 — no silent downgrade", () => {
  it("blocks the release when a capability route was unavailable, and says so", () => {
    const m = evaluateRelease(
      "obj-1",
      fullContext({
        degradations: [
          {
            capability: "16-agent external research validation",
            requested: "research swarm (16 investigators)",
            used: "local code analysis + existing evidence review",
            consequence: "external demand validation was never performed",
            at: Date.now(),
          },
        ],
      }),
    );
    expect(m.decision).toBe("blocked");
    expect(m.blockingGates).toContain("capability_route");
    const text = renderManifest(m);
    expect(text).toContain("QUALITY GATE: NOT SATISFIED");
    expect(text).toContain("16-agent external research validation");
    expect(text).toContain("RELEASE STATUS: BLOCKED");
  });

  it("blocks on an unresolved constitutional violation", () => {
    const m = evaluateRelease(
      "obj-1",
      fullContext({
        violations: [{ article: "A9_NO_THEATER", subject: "agent.moved", detail: "no backing entity", at: Date.now() }],
      }),
    );
    expect(m.decision).toBe("blocked");
    expect(m.blockingGates).toContain("constitutional_integrity");
  });
});
