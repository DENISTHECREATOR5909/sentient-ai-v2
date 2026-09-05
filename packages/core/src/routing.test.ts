import { describe, expect, it } from "vitest";
import {
  AllocationRefused,
  DegradationLedger,
  MODEL_ROUTES,
  WORKFLOW_MAX_BUDGET,
  assertAllocationJustified,
  decomposability,
  planAllocation,
} from "./routing.js";

const signals = (independentBranches: number, dependencyDepth: number, uncertainty = 0.5, consequence = 0.5) => ({
  independentBranches,
  dependencyDepth,
  uncertainty,
  consequence,
});

describe("decomposability", () => {
  it("is zero for work that does not split", () => {
    expect(decomposability(signals(1, 4))).toBe(0);
  });

  it("rises with independent branches and falls with dependency depth", () => {
    expect(decomposability(signals(16, 1))).toBeGreaterThan(decomposability(signals(16, 6)));
  });
});

describe("allocation — Article 10", () => {
  it("sends a three-line fix to one specialist, not a civilization", () => {
    const a = planAllocation("implementation", "rune", signals(1, 3, 0.1, 0.2));
    expect(a.workers).toBe(0);
    expect(a.tokenMultiplier).toBe(1);
    expect(a.rationale).toContain("sequential");
  });

  it("selects the 16-investigator configuration only for genuinely broad research", () => {
    const broad = planAllocation("deep_research", "verity", signals(14, 1, 0.9, 0.8));
    expect(broad.workers).toBe(16);
    const narrow = planAllocation("deep_research", "verity", signals(2, 5, 0.4, 0.3));
    expect(narrow.workers).toBe(1);
  });

  it("never hides the cost of parallelism", () => {
    const a = planAllocation("deep_research", "verity", signals(14, 1, 0.9, 0.8));
    expect(a.tokenMultiplier).toBeGreaterThan(10);
  });

  it("escalates the model tier on consequence but never de-escalates it", () => {
    expect(planAllocation("mechanical", "mnemos", signals(1, 1, 0.1, 0.9)).route.modelClass).toBe("deep");
    expect(planAllocation("orchestration", "atlas", signals(1, 1, 0.1, 0.0)).route.modelClass).toBe("deep");
  });

  it("routes orchestration and adversarial review to the deep tier", () => {
    expect(planAllocation("orchestration", "atlas", signals(3, 2)).route.model).toBe(MODEL_ROUTES.deep.model);
    expect(planAllocation("adversarial_review", "nyx", signals(3, 2)).route.model).toBe(MODEL_ROUTES.deep.model);
  });
});

describe("allocation refusal", () => {
  it("refuses fifty subagents for a job with no independent branches", () => {
    expect(() => assertAllocationJustified(50, signals(1, 4))).toThrow(AllocationRefused);
  });

  it("refuses a worker count that would duplicate work", () => {
    expect(() => assertAllocationJustified(64, signals(8, 1))).toThrow(/duplicate each other/);
  });

  it("refuses to exceed the workflow ceiling", () => {
    expect(() => assertAllocationJustified(WORKFLOW_MAX_BUDGET + 1, signals(2000, 1))).toThrow(/decompose the objective/);
  });

  it("permits a justified large sweep", () => {
    expect(() => assertAllocationJustified(300, signals(400, 1))).not.toThrow();
  });
});

describe("the degradation ledger — Article 8", () => {
  it("turns a missing capability into named outstanding work", () => {
    const l = new DegradationLedger();
    expect(l.isClean).toBe(true);
    l.record(
      "16-agent external research validation",
      "research swarm (16 investigators)",
      "single local investigator",
      "external demand validation was never performed",
    );
    expect(l.isClean).toBe(false);
    expect(l.outstanding()[0]).toContain("external demand validation was never performed");
  });
});
