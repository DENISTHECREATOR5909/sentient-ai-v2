import { describe, expect, it } from "vitest";
import { CareerLedger, renderCareer, type AssignmentOutcome } from "./careers.js";

const outcome = (i: number, o: Partial<AssignmentOutcome> = {}): AssignmentOutcome => ({
  taskId: `t${i}`,
  domain: "performance",
  firstPass: true,
  repairCycles: 0,
  criticalRegression: false,
  reviewOverturned: false,
  skills: ["WebGPU", "shader optimization"],
  at: Date.now(),
  ...o,
});

describe("career records", () => {
  it("derives everything from recorded outcomes — nothing is self-assigned", () => {
    const l = new CareerLedger();
    for (let i = 0; i < 47; i++) l.record("vanta", outcome(i, { firstPass: i % 15 !== 0 }));
    const r = l.recordFor("vanta");
    expect(r.assignments).toBe(47);
    expect(r.firstPassRate).toBeGreaterThan(0.9);
    expect(r.criticalRegressions).toBe(0);
    expect(r.specializations).toContain("WebGPU");
    expect(r.rank).toBe("Principal");
    expect(renderCareer(r, "Vanta")).toContain("Specializations earned");
  });

  it("starts every agent at probationary regardless of how well it talks", () => {
    const l = new CareerLedger();
    l.record("newcomer", outcome(1));
    expect(l.recordFor("newcomer").rank).toBe("Probationary");
  });

  it("does not award a badge for work that barely limped through", () => {
    const l = new CareerLedger();
    for (let i = 0; i < 10; i++) l.record("slow", outcome(i, { firstPass: false, repairCycles: 4 }));
    expect(l.recordFor("slow").specializations).toEqual([]);
  });

  it("raises a concern when an agent keeps failing", () => {
    const l = new CareerLedger();
    for (let i = 0; i < 10; i++) l.record("struggling", outcome(i, { firstPass: false, repairCycles: 2 }));
    expect(l.recordFor("struggling").concern).toContain("narrow the task envelope");
  });

  it("raises a concern when an agent's verdicts keep getting overturned", () => {
    const l = new CareerLedger();
    for (let i = 0; i < 12; i++) l.record("overconfident", outcome(i, { reviewOverturned: i % 3 === 0 }));
    expect(l.recordFor("overconfident").concern).toContain("overturned");
  });

  it("caps rank at probationary while a critical regression is on the record", () => {
    const l = new CareerLedger();
    for (let i = 0; i < 12; i++) l.record("risky", outcome(i, { criticalRegression: i === 0 }));
    expect(l.recordFor("risky").rank).toBe("Probationary");
    expect(l.recordFor("risky").promotionCandidacy).toBeNull();
  });
});
