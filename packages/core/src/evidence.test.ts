import { describe, expect, it } from "vitest";
import { EvidenceLedger, EvidenceRejected, parsePointer } from "./evidence.js";

describe("evidence pointers", () => {
  it("parses a well-formed pointer", () => {
    expect(parsePointer("test://checkout/decline-01")).toEqual({
      kind: "test",
      path: "checkout/decline-01",
      uri: "test://checkout/decline-01",
    });
  });

  it("rejects an unknown scheme", () => {
    expect(parsePointer("vibes://it-felt-right")).toBeNull();
    expect(parsePointer("just some prose")).toBeNull();
  });
});

describe("the evidence ledger — Article 2", () => {
  it("refuses to verify a claim with no pointer", () => {
    const l = new EvidenceLedger();
    expect(() =>
      l.record({ claim: "checkout handles declined payment", status: "verified", pointers: [], recordedBy: "rune" }),
    ).toThrow(EvidenceRejected);
  });

  it("refuses to verify a claim backed only by an opinion", () => {
    const l = new EvidenceLedger();
    l.register("review://nyx/pre-mortem-4");
    try {
      l.record({
        claim: "the flow is robust",
        status: "verified",
        pointers: ["review://nyx/pre-mortem-4"],
        recordedBy: "nyx",
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(EvidenceRejected);
      expect((err as EvidenceRejected).violation.detail).toContain("not verified by an opinion");
    }
  });

  it("refuses a pointer that resolves to nothing", () => {
    const l = new EvidenceLedger();
    expect(() =>
      l.record({
        claim: "checkout handles declined payment",
        status: "verified",
        pointers: ["test://checkout/decline-01"],
        recordedBy: "argus",
      }),
    ).toThrow(/do not resolve/);
  });

  it("accepts a claim backed by a registered executed artifact", () => {
    const l = new EvidenceLedger();
    l.registerAll(["test://checkout/decline-01", "browser://run/889", "build://sha/45fa0c1"]);
    const c = l.record({
      claim: "checkout flow successfully handles declined payment",
      status: "verified",
      pointers: ["test://checkout/decline-01", "browser://run/889", "build://sha/45fa0c1"],
      recordedBy: "argus",
      taskId: "checkout-024",
    });
    expect(c.status).toBe("verified");
    expect(c.pointers).toHaveLength(3);
    expect(l.byTask("checkout-024")).toHaveLength(1);
  });

  it("still records an unsubstantiated claim — it just does not call it verified", () => {
    const l = new EvidenceLedger();
    const c = l.record({ claim: "users will prefer the new layout", status: "unsubstantiated", pointers: [], recordedBy: "nova" });
    expect(c.status).toBe("unsubstantiated");
    expect(l.byStatus("unsubstantiated")).toHaveLength(1);
  });
});
