/**
 * Role contracts must match the permissions actually enforced.
 *
 * A contract that has drifted from the roster documents an organization that does not exist,
 * which is a more expensive kind of wrong than no documentation at all.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RESIDENTS } from "@agent-city/core";
import { renderContract, renderIndex } from "../scripts/contracts.js";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("generated role contracts", () => {
  it.each(RESIDENTS.map((r) => [r.id, r] as const))("%s's contract matches the roster", (id, resident) => {
    expect(read(`../agents/residents/${id}.md`)).toBe(renderContract(resident));
  });

  it("the roster index matches the roster", () => {
    expect(read("../agents/README.md")).toBe(renderIndex());
  });

  it("no contract carries the governance-defect warning", () => {
    for (const r of RESIDENTS) {
      expect(renderContract(r), `${r.id} both produces and judges a domain`).not.toContain("Article 6 forbids it");
      expect(renderContract(r), `${r.id} has no independent verifier`).not.toContain("governance defect");
    }
  });
});
