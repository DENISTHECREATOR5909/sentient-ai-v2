import { describe, expect, it } from "vitest";
import {
  GLOBAL_DENY,
  checkSeparationOfPowers,
  evaluateFor,
  independentVerifiers,
  runHook,
} from "./permissions.js";
import { resident } from "./residents.js";

describe("permission evaluation", () => {
  it("denies before it allows, even with an owner grant", () => {
    const d = evaluateFor("atlas", { tool: GLOBAL_DENY[0]!, intent: "override a gate" }, { ownerGrants: [GLOBAL_DENY[0]!] });
    expect(d.outcome).toBe("deny");
    expect(d.rule).toContain("GLOBAL_DENY");
  });

  it("honours a resident's own deny list over its allow list", () => {
    // Verity is granted `read` but denied `write`; a denied tool is denied however phrased.
    expect(evaluateFor("verity", { tool: "write", intent: "edit the artifact under review" }).outcome).toBe("deny");
    expect(evaluateFor("verity", { tool: "read", intent: "read a source" }).outcome).toBe("allow");
  });

  it("closes the envelope by default — an unlisted tool is not a maybe", () => {
    const d = evaluateFor("iris", { tool: "test_runner", intent: "run the suite" });
    expect(d.outcome).toBe("deny");
    expect(d.rule).toContain("closed by default");
  });

  it("escalates irreversible actions instead of proceeding", () => {
    const d = evaluateFor("pax", { tool: "external_publish", intent: "announce the release" });
    expect(d.outcome).toBe("escalate");
  });

  it("allows an irreversible action only under an explicit owner grant", () => {
    const granted = evaluateFor(
      "pax",
      { tool: "release_approve", intent: "approve", reversibility: "irreversible" },
      { ownerGrants: ["release_approve"] },
    );
    expect(granted.outcome).toBe("allow");
    const ungranted = evaluateFor("pax", { tool: "release_approve", intent: "approve", reversibility: "irreversible" });
    expect(ungranted.outcome).toBe("escalate");
  });

  it("never grants a builder a production credential", () => {
    for (const id of ["rune", "iris", "sol", "kinetic"] as const) {
      expect(evaluateFor(id, { tool: "credentials", intent: "read a secret" }).outcome).toBe("deny");
      expect(resident(id).tools.deny).toContain("production_database");
    }
  });
});

describe("separation of powers", () => {
  it("flags an agent appearing as both implementer and verifier", () => {
    const v = checkSeparationOfPowers(["rune", "argus"], ["argus", "mercy"], "checkout-024");
    expect(v?.article).toBe("A6_BUILDER_IS_NOT_JUDGE");
    expect(v?.detail).toContain("argus");
  });

  it("passes when the sets are disjoint", () => {
    expect(checkSeparationOfPowers(["rune"], ["argus", "mercy", "flux"], "checkout-024")).toBeNull();
  });

  it("excludes the implementer when listing independent verifiers", () => {
    expect(independentVerifiers("frontend", ["rune", "argus"])).not.toContain("argus");
    expect(independentVerifiers("frontend", ["rune"])).toContain("argus");
  });
});

describe("the hook layer", () => {
  it("reports fail-open honestly when a hook throws", () => {
    const r = runHook(() => {
      throw new Error("boom");
    }, { agent: "rune", tool: "write", intent: "x" });
    expect(r.denied).toBe(false);
    expect(r.failedOpen).toBe(true);
    expect(r.reason).toContain("never the only layer");
  });

  it("reports fail-open when a hook returns nonsense", () => {
    const r = runHook((() => 42) as never, { agent: "rune", tool: "write", intent: "x" });
    expect(r.failedOpen).toBe(true);
    expect(r.denied).toBe(false);
  });

  it("honours a genuine denial", () => {
    const r = runHook(() => "policy: no writes during a freeze", { agent: "rune", tool: "write", intent: "x" });
    expect(r.denied).toBe(true);
    expect(r.failedOpen).toBe(false);
  });
});
