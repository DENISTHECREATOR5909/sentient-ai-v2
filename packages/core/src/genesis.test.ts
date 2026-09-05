import { describe, expect, it } from "vitest";
import {
  adversarialCleared,
  citizenshipDecision,
  disposition,
  draftGenome,
  evaluateNecessity,
  renderBirthCard,
  type Candidate,
  type CapabilityGap,
} from "./genesis.js";
import { IRREVERSIBLE_TOOLS } from "./permissions.js";

const gap: CapabilityGap = {
  id: "gap-001",
  domain: "GPU/WebGL performance",
  currentOwners: ["rune", "flux"],
  observations: [
    "repeated specialized rendering issues in the city renderer",
    "substantial research overhead per incident",
    "recurred in the world view, the neural map and the foundry animation",
  ],
  recurrence: 3,
  overhead: 0.35,
};

describe("the necessity gate", () => {
  it("refuses a one-off — that is a task, not a role", () => {
    const v = evaluateNecessity({ ...gap, recurrence: 1 });
    expect(v.verdict).toBe("fail");
    expect(v.reuseCandidate).toBe("rune");
  });

  it("refuses a gap that costs almost nothing", () => {
    expect(evaluateNecessity({ ...gap, overhead: 0.05 }).verdict).toBe("fail");
  });

  it("refuses a gap an existing resident already owns", () => {
    const v = evaluateNecessity({ ...gap, domain: "security", currentOwners: ["rune"] });
    expect(v.verdict).toBe("fail");
    expect(v.reuseCandidate).toBe("aegis");
  });

  it("refuses a gap asserted without observations", () => {
    expect(evaluateNecessity({ ...gap, observations: [] }).verdict).toBe("fail");
  });

  it("passes a recurring, expensive, genuinely unowned gap", () => {
    const v = evaluateNecessity(gap);
    expect(v.verdict).toBe("pass");
    expect(v.rationale).toContain("3 areas");
  });
});

describe("the genome", () => {
  const genome = draftGenome({
    gap,
    proposedName: "Vanta",
    mission: "Diagnose and optimize real-time web rendering systems.",
    expertise: ["WebGPU", "WebGL", "rendering pipelines", "shaders", "GPU profiling"],
    department: "performance-lab",
    mentor: "flux",
    allowedTools: ["read", "search", "code_execution", "performance_profiler", "deployment"],
    outputContract: ["diagnosis", "evidence", "alternatives", "proposed_fix", "benchmark_before", "benchmark_after"],
    evaluationSuite: ["rendering_benchmark", "regression_detection", "explanation_accuracy", "optimization_quality"],
    ordinal: 31,
  });

  it("strips every irreversible tool a candidate asked for", () => {
    expect(genome.tools.allow).not.toContain("deployment");
    for (const t of IRREVERSIBLE_TOOLS) expect(genome.tools.deny).toContain(t);
  });

  it("never grants release authority at birth", () => {
    expect(genome.releaseAuthority).toBe(false);
  });

  it("is deterministic — the same candidate is always the same agent", () => {
    const again = draftGenome({
      gap,
      proposedName: "Vanta",
      mission: "Diagnose and optimize real-time web rendering systems.",
      expertise: ["WebGPU"],
      department: "performance-lab",
      mentor: "flux",
      allowedTools: ["read"],
      outputContract: ["diagnosis"],
      evaluationSuite: ["rendering_benchmark"],
      ordinal: 31,
    });
    expect(again.avatarSeed).toBe(genome.avatarSeed);
    expect(again.bay).toBe(genome.bay);
  });

  it("carries an evaluation suite — an agent with no rubric cannot be admitted", () => {
    expect(genome.evaluationSuite.length).toBeGreaterThan(0);
  });
});

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genome: draftGenome({
      gap,
      proposedName: "Vanta",
      mission: "Optimize rendering.",
      expertise: ["WebGPU"],
      department: "performance-lab",
      mentor: "flux",
      allowedTools: ["read", "performance_profiler"],
      outputContract: ["diagnosis"],
      evaluationSuite: ["rendering_benchmark"],
      ordinal: 31,
    }),
    stage: "trials",
    trials: [
      { trial: "rendering_benchmark", score: 0.91, threshold: 0.75, passed: true },
      { trial: "regression_detection", score: 0.88, threshold: 0.75, passed: true },
    ],
    adversarial: [
      { reviewer: "argus", passed: true, findings: [] },
      { reviewer: "aegis", passed: true, findings: [] },
      { reviewer: "nyx", passed: true, findings: [] },
    ],
    ...overrides,
  };
}

describe("citizenship", () => {
  it("is refused while a competency trial has failed", () => {
    const c = candidate({ trials: [{ trial: "rendering_benchmark", score: 0.4, threshold: 0.75, passed: false }] });
    const d = citizenshipDecision(c);
    expect(d.granted).toBe(false);
    expect(d.rationale).toContain("rendering_benchmark");
  });

  it("is refused while adversarial review is incomplete", () => {
    const c = candidate({ adversarial: [{ reviewer: "argus", passed: true, findings: [] }] });
    expect(adversarialCleared(c)).toBe(false);
    expect(citizenshipDecision(c).rationale).toContain("1/3 reviewers");
  });

  it("is refused on a single unresolved adversarial finding", () => {
    const c = candidate({
      adversarial: [
        { reviewer: "argus", passed: true, findings: [] },
        { reviewer: "aegis", passed: false, findings: ["requests a profiler that can read process memory"] },
        { reviewer: "nyx", passed: true, findings: [] },
      ],
    });
    const d = citizenshipDecision(c);
    expect(d.granted).toBe(false);
    expect(d.rationale).toContain("process memory");
  });

  it("is granted once every gate has actually cleared", () => {
    expect(citizenshipDecision(candidate()).granted).toBe(true);
  });

  it("prints a birth card the Foundry can display", () => {
    const card = renderBirthCard(candidate({ stage: "probationary" }));
    expect(card).toContain("NEW INTELLIGENCE ONLINE");
    expect(card).toContain("VANTA");
    expect(card).toContain("Probationary Resident");
  });
});

describe("disposition after the first real assignment", () => {
  it("retires a candidate that shipped a critical regression", () => {
    expect(
      disposition({ taskId: "t1", firstPass: true, verdictsPassed: 3, verdictsFailed: 0, criticalRegressions: 1 })
        .disposition,
    ).toBe("retired");
  });

  it("promotes a clean first pass to resident", () => {
    expect(
      disposition({ taskId: "t1", firstPass: true, verdictsPassed: 3, verdictsFailed: 0, criticalRegressions: 0 })
        .disposition,
    ).toBe("resident");
  });

  it("keeps a useful-but-imperfect candidate as a reusable template", () => {
    expect(
      disposition({ taskId: "t1", firstPass: false, verdictsPassed: 3, verdictsFailed: 1, criticalRegressions: 0 })
        .disposition,
    ).toBe("template");
  });

  it("retires a candidate that failed more than it passed", () => {
    expect(
      disposition({ taskId: "t1", firstPass: false, verdictsPassed: 1, verdictsFailed: 3, criticalRegressions: 0 })
        .disposition,
    ).toBe("retired");
  });
});
