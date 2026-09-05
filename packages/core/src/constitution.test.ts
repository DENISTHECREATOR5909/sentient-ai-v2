import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ARTICLES, PRIME_DIRECTIVE, describeViolation, violation } from "./constitution.js";
import { RESIDENTS, QUALITY_COUNCIL, DOMAIN_OWNER, verifiersFor } from "./residents.js";
import { checkReleaseAuthority } from "./permissions.js";

const CLAUDE_MD = readFileSync(new URL("../../../CLAUDE.md", import.meta.url), "utf8");

describe("the constitution", () => {
  it("keeps the machine copy and CLAUDE.md in step", () => {
    // Every article must actually appear in the document the agents read.
    for (const a of ARTICLES) {
      const firstClause = a.title.split(/[,;]/)[0]!.trim().toLowerCase();
      expect(CLAUDE_MD.toLowerCase(), `article ${a.id} missing from CLAUDE.md`).toContain(firstClause);
    }
  });

  it("states the prime directive in both copies", () => {
    expect(CLAUDE_MD).toContain("verifiably correct, useful, original");
    expect(PRIME_DIRECTIVE).toContain("verifiably correct, useful, original");
  });

  it("names an enforcement site for every article", () => {
    for (const a of ARTICLES) {
      expect(a.enforcedBy.length, `${a.id} has no enforcement site`).toBeGreaterThan(0);
    }
  });

  it("renders a violation legibly", () => {
    const text = describeViolation(violation("A9_NO_THEATER", "agent.moved", "no ref"));
    expect(text).toContain("A9_NO_THEATER");
    expect(text).toContain("agent.moved");
  });
});

describe("the founding roster", () => {
  it("gives every domain exactly one owner", () => {
    for (const [domain, owner] of Object.entries(DOMAIN_OWNER)) {
      const holders = RESIDENTS.filter((r) => r.implementsDomains.includes(domain as never));
      expect(holders.map((h) => h.id), `domain ${domain}`).toEqual([owner]);
    }
  });

  it("never lets a resident verify a domain it also implements — no exceptions", () => {
    for (const r of RESIDENTS) {
      const overlap = r.verifiesDomains.filter((d) => r.implementsDomains.includes(d));
      expect(overlap, `${r.id} judges its own domain`).toEqual([]);
    }
  });

  it("gives every implementation domain at least one independent verifier", () => {
    for (const domain of ["frontend", "backend", "ux", "product", "accessibility", "performance", "security"] as const) {
      const verifiers = verifiersFor(domain).filter((v) => v !== DOMAIN_OWNER[domain]);
      expect(verifiers.length, `domain ${domain} has no independent verifier`).toBeGreaterThan(0);
    }
  });

  it("seats a five-member quality council that can block a release", () => {
    expect([...QUALITY_COUNCIL].sort()).toEqual(["aegis", "argus", "flux", "mercy", "nyx"]);
  });

  it("vests release authority in exactly one resident", () => {
    expect(checkReleaseAuthority()).toBeNull();
    expect(RESIDENTS.filter((r) => r.releaseAuthority).map((r) => r.id)).toEqual(["pax"]);
  });

  it("gives every resident an output contract and a private memory namespace", () => {
    const namespaces = new Set<string>();
    for (const r of RESIDENTS) {
      expect(r.outputContract.length, `${r.id} has no output contract`).toBeGreaterThan(0);
      expect(namespaces.has(r.memoryNamespace), `${r.id} shares a memory namespace`).toBe(false);
      namespaces.add(r.memoryNamespace);
    }
  });
});
