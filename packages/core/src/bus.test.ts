import { describe, expect, it } from "vitest";
import { EventBus } from "./bus.js";
import { ref } from "./events.js";

describe("the event bus", () => {
  it("assigns monotonic sequence numbers", () => {
    const bus = new EventBus();
    const a = bus.publish({ kind: "task.started", from: "rune", severity: "info", refs: [ref("task", "t1")], taskId: "t1", owner: "rune" });
    const b = bus.publish({ kind: "task.started", from: "rune", severity: "info", refs: [ref("task", "t2")], taskId: "t2", owner: "rune" });
    expect(b.seq).toBe(a.seq + 1);
  });

  it("records an Article 9 violation for an event with no backing entity", () => {
    const bus = new EventBus();
    bus.publish({ kind: "agent.moved", from: "rune", severity: "info", refs: [], agent: "rune", toDistrict: "release-tower", fromDistrict: "" } as never);
    expect(bus.violations[0]?.article).toBe("A9_NO_THEATER");
  });

  it("keeps running when a subscriber throws — an observer's failure is its own", () => {
    const bus = new EventBus();
    bus.subscribe(() => {
      throw new Error("renderer crashed");
    });
    let seen = 0;
    bus.subscribe(() => {
      seen += 1;
    });
    bus.publish({ kind: "task.started", from: "rune", severity: "info", refs: [ref("task", "t1")], taskId: "t1", owner: "rune" });
    expect(seen).toBe(1);
  });

  it("lets a late renderer catch up and detect a gap", () => {
    const bus = new EventBus();
    for (let i = 0; i < 5; i++) {
      bus.publish({ kind: "task.started", from: "rune", severity: "info", refs: [ref("task", `t${i}`)], taskId: `t${i}`, owner: "rune" });
    }
    const caughtUp = bus.since(2);
    expect(caughtUp).toHaveLength(3);
    expect(bus.hasGap(2, caughtUp)).toBe(false);
    expect(bus.hasGap(2, [caughtUp[0]!, caughtUp[2]!])).toBe(true);
  });

  it("bounds the journal when asked", () => {
    const bus = new EventBus({ journalLimit: 3 });
    for (let i = 0; i < 10; i++) {
      bus.publish({ kind: "task.started", from: "rune", severity: "info", refs: [ref("task", `t${i}`)], taskId: `t${i}`, owner: "rune" });
    }
    expect(bus.journal).toHaveLength(3);
    expect(bus.journal[2]?.seq).toBe(10);
  });
});
