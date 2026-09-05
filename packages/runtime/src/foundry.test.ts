import { describe, expect, it } from "vitest";
import { Foundry } from "./organization.js";
import { RehearsalExecutor } from "./executors/rehearsal.js";

async function run(seed: string, defectRate = 0.55) {
  const foundry = new Foundry({
    executor: new RehearsalExecutor({ seed, defectRate }),
    seed,
    ownerGrants: ["release_approve"],
  });
  const result = await foundry.run("Build a checkout flow that never loses a customer's work");
  return result;
}

describe("the Genesis Foundry", () => {
  it("detects gaps from what the run actually cost, not from a hunch", async () => {
    const result = await run("alpha");
    for (const outcome of result.genesis) {
      expect(outcome.gap.observations.length, `${outcome.gap.domain} asserted with no observations`).toBeGreaterThan(0);
      expect(outcome.gap.currentOwners.length).toBeGreaterThan(0);
    }
  });

  it("refuses most candidates — a gap is not automatically a colleague", async () => {
    const seeds = ["demo", "beta", "gamma", "delta", "omega", "kestrel", "vireo", "alpha"];
    const results = await Promise.all(seeds.map((s) => run(s)));
    const gaps = results.flatMap((r) => r.genesis);
    const admitted = gaps.filter((g) => g.admitted);
    expect(gaps.length).toBeGreaterThan(0);
    expect(admitted.length).toBeLessThan(gaps.length / 2);
  });

  it("takes an admitted candidate through every gate, in order, with an event for each", async () => {
    const result = await run("alpha");
    const admitted = result.genesis.find((g) => g.admitted);
    expect(admitted, "seed 'alpha' is expected to admit exactly one candidate").toBeDefined();

    const kinds = result.events.filter((e) => e.kind.startsWith("genesis.")).map((e) => e.kind);
    const idx = (k: (typeof kinds)[number]) => kinds.indexOf(k);
    expect(idx("genesis.gap_detected")).toBeGreaterThanOrEqual(0);
    expect(idx("genesis.genome_created")).toBeGreaterThan(idx("genesis.gap_detected"));
    expect(idx("genesis.incubated")).toBeGreaterThan(idx("genesis.genome_created"));
    expect(idx("genesis.trial")).toBeGreaterThan(idx("genesis.incubated"));
    expect(idx("genesis.adversarial")).toBeGreaterThan(idx("genesis.trial"));
    expect(idx("genesis.citizenship")).toBeGreaterThan(idx("genesis.adversarial"));
  });

  it("grants citizenship only as probationary, and never with an irreversible tool", async () => {
    const result = await run("alpha");
    const admitted = result.genesis.find((g) => g.admitted);
    const genome = admitted?.candidate?.genome;
    expect(genome).toBeDefined();
    expect(genome!.releaseAuthority).toBe(false);
    expect(admitted!.candidate!.rank).toBe("Probationary");
    for (const tool of genome!.tools.allow) {
      expect(genome!.tools.deny, `${tool} is both allowed and denied`).not.toContain(tool);
      expect(["deployment", "credentials", "production_database", "payment_actions"]).not.toContain(tool);
    }
  });

  it("shows the birth card only for a candidate that actually cleared admissions", async () => {
    const results = await Promise.all(["alpha", "demo"].map((s) => run(s)));
    for (const r of results) {
      for (const g of r.genesis) {
        expect(Boolean(g.card)).toBe(g.admitted);
      }
    }
  });

  it("emits the citizenship event exactly once per admitted candidate", async () => {
    const result = await run("alpha");
    const births = result.events.filter((e) => e.kind === "genesis.citizenship");
    expect(births).toHaveLength(result.genesis.filter((g) => g.admitted).length);
  });
});
