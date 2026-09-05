import { describe, expect, it } from "vitest";
import { TaskGraph, TaskGraphError, type Verdict } from "./tasks.js";

const criterion = (id: string, method: string) => ({ id, text: `criterion ${id}`, method });

function graph() {
  const g = new TaskGraph();
  g.add({
    id: "checkout-024",
    objectiveId: "obj-1",
    title: "Checkout retains form state after a declined payment",
    domain: "frontend",
    workClass: "implementation",
    owner: "rune",
    verifiers: ["argus", "mercy"],
    acceptance: [criterion("ac-1", "functional_test"), criterion("ac-2", "a11y_audit")],
  });
  return g;
}

const pass = (verifier: "argus" | "mercy", method: string): Verdict => ({
  verifier,
  method,
  passed: true,
  summary: "ok",
  evidenceIds: ["evd-0001"],
  at: Date.now(),
});

describe("task creation", () => {
  it("refuses a task whose owner is also its verifier", () => {
    const g = new TaskGraph();
    expect(() =>
      g.add({
        id: "t1",
        objectiveId: "obj-1",
        title: "t",
        domain: "frontend",
        workClass: "implementation",
        owner: "rune",
        verifiers: ["rune"],
        acceptance: [criterion("ac-1", "functional_test")],
      }),
    ).toThrow(/owner and verifier/);
  });

  it("refuses a task with no acceptance criteria", () => {
    const g = new TaskGraph();
    expect(() =>
      g.add({
        id: "t1",
        objectiveId: "obj-1",
        title: "t",
        domain: "frontend",
        workClass: "implementation",
        owner: "rune",
        verifiers: ["argus"],
        acceptance: [],
      }),
    ).toThrow(/completion would be undefinable/);
  });
});

describe("completion — Article 1", () => {
  it("does not complete on the owner's say-so", () => {
    const g = graph();
    const result = g.canComplete("checkout-024");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violation.article).toBe("A1_OWNER_BELIEF_IS_NOT_COMPLETION");
  });

  it("does not complete while an acceptance criterion is unchecked", () => {
    const g = graph();
    g.applyVerdict("checkout-024", pass("argus", "functional_test"));
    const result = g.canComplete("checkout-024");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violation.detail).toContain("ac-2");
    expect(g.get("checkout-024").state).toBe("verifying");
  });

  it("completes once every criterion carries an independent passing verdict", () => {
    const g = graph();
    g.applyVerdict("checkout-024", pass("argus", "functional_test"));
    g.applyVerdict("checkout-024", pass("mercy", "a11y_audit"));
    expect(g.canComplete("checkout-024").ok).toBe(true);
    expect(g.get("checkout-024").state).toBe("complete");
  });
});

describe("verdicts — Articles 5 and 6", () => {
  it("refuses a verdict from the task's own owner", () => {
    const g = graph();
    expect(() =>
      g.applyVerdict("checkout-024", { ...pass("argus", "functional_test"), verifier: "rune" as never }),
    ).toThrow(TaskGraphError);
  });

  it("refuses a verdict from an unassigned verifier", () => {
    const g = graph();
    expect(() =>
      g.applyVerdict("checkout-024", { ...pass("argus", "functional_test"), verifier: "flux" as never }),
    ).toThrow(/not an assigned verifier/);
  });

  it("sends a failed artifact to repair and counts the cycle", () => {
    const g = graph();
    g.applyVerdict("checkout-024", {
      verifier: "argus",
      method: "functional_test",
      passed: false,
      summary: "Checkout loses form state after failed payment.",
      evidenceIds: ["evd-0002"],
      at: Date.now(),
    });
    const t = g.get("checkout-024");
    expect(t.state).toBe("repair");
    expect(t.cycles).toBe(1);
    expect(g.canComplete("checkout-024").ok).toBe(false);
  });

  it("lets a retest supersede the failure only with a fresh verdict", () => {
    const g = graph();
    g.applyVerdict("checkout-024", {
      verifier: "argus",
      method: "functional_test",
      passed: false,
      summary: "state lost",
      evidenceIds: [],
      at: Date.now(),
    });
    g.applyVerdict("checkout-024", pass("argus", "functional_test"));
    g.applyVerdict("checkout-024", pass("mercy", "a11y_audit"));
    const t = g.get("checkout-024");
    expect(t.state).toBe("complete");
    expect(t.cycles).toBe(1); // the repair cycle is remembered even though the retest passed
  });
});

describe("dependencies", () => {
  it("separates ready work from work that is genuinely waiting", () => {
    const g = graph();
    g.add({
      id: "release-notes",
      objectiveId: "obj-1",
      title: "Release notes",
      domain: "product",
      workClass: "product_definition",
      owner: "nova",
      verifiers: ["argus"],
      dependsOn: ["checkout-024"],
      acceptance: [criterion("ac-1", "review")],
    });
    expect(g.ready().map((t) => t.id)).toEqual(["checkout-024"]);
    expect(g.waiting().map((t) => t.id)).toEqual(["release-notes"]);
    expect(g.unresolvedDeps("release-notes")).toEqual(["checkout-024"]);
  });

  it("rejects a dependency on an unknown task", () => {
    const g = graph();
    expect(() =>
      g.add({
        id: "t2",
        objectiveId: "obj-1",
        title: "t",
        domain: "frontend",
        workClass: "implementation",
        owner: "rune",
        verifiers: ["argus"],
        dependsOn: ["nope"],
        acceptance: [criterion("ac-1", "functional_test")],
      }),
    ).toThrow(/unknown task/);
  });

  it("reports operations buckets", () => {
    const g = graph();
    expect(g.operations().waiting).toBe(1);
    g.applyVerdict("checkout-024", pass("argus", "functional_test"));
    expect(g.operations().verifying).toBe(1);
  });
});
