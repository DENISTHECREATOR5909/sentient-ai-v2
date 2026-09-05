import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { createFoundryServer } from "./main.js";
import { chooseExecutor } from "./session.js";

let server: ReturnType<typeof createFoundryServer>;
let base: string;

beforeAll(async () => {
  server = createFoundryServer({ defaults: { objective: "", forceRehearsal: true, seed: "srv", paceMs: 0 } });
  const { host, port } = await server.listen(0);
  base = `http://${host}:${(server.http.address() as { port: number }).port || port}`;
});

afterAll(async () => {
  await server.close();
});

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("the event-stream bridge", () => {
  it("describes the world before any run starts", async () => {
    const world = (await (await fetch(`${base}/api/world`)).json()) as { districts: unknown[]; residents: unknown[] };
    expect(world.districts).toHaveLength(15);
    expect(world.residents).toHaveLength(15);
  });

  it("starts a session and reaches a release decision", async () => {
    const created = (await (await post("/api/sessions", { objective: "Test objective", forceRehearsal: true })).json()) as { id: string };
    expect(created.id).toBeTruthy();

    // Poll the snapshot rather than sleeping blindly: the run signals its own completion.
    let snapshot: { state: string; manifest: unknown } = { state: "running", manifest: null };
    for (let i = 0; i < 200 && snapshot.state === "running"; i++) {
      await new Promise((r) => setTimeout(r, 20));
      snapshot = (await (await fetch(`${base}/api/sessions/${created.id}`)).json()) as typeof snapshot;
    }
    expect(snapshot.state).toBe("finished");
    expect(snapshot.manifest).toBeTruthy();

    const events = (await (await fetch(`${base}/api/sessions/${created.id}/events?since=0`)).json()) as { seq: number }[];
    expect(events.length).toBeGreaterThan(100);
    events.forEach((e, i) => expect(e.seq).toBe(i + 1));
  });

  it("replays the journal to a late-joining renderer, gaplessly", async () => {
    const created = (await (await post("/api/sessions", { objective: "Stream test", forceRehearsal: true })).json()) as { id: string };
    const url = `${base.replace("http", "ws")}/stream?session=${created.id}`;

    const received: { seq: number }[] = [];
    let sawHello = false;
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      const timer = setTimeout(() => {
        socket.close();
        resolve();
      }, 2500);
      socket.on("message", (raw) => {
        const msg = JSON.parse(String(raw)) as { type: string; event?: { seq: number }; snapshot?: { state: string } };
        if (msg.type === "hello") sawHello = true;
        if (msg.type === "event" && msg.event) received.push(msg.event);
        if (msg.type === "snapshot" && msg.snapshot?.state === "finished") {
          clearTimeout(timer);
          socket.close();
          resolve();
        }
      });
      socket.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
    });

    expect(sawHello).toBe(true);
    expect(received.length).toBeGreaterThan(0);
    received.forEach((e, i) => expect(e.seq).toBe(i + 1));
  });

  it("refuses a stream with no session rather than inventing one", async () => {
    const url = `${base.replace("http", "ws")}/stream?session=does-not-exist`;
    const message = await new Promise<string>((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.on("message", (raw) => {
        resolve(String(raw));
        socket.close();
      });
      socket.on("error", reject);
    });
    expect(JSON.parse(message)).toMatchObject({ type: "error" });
  });

  it("404s an unknown session instead of guessing", async () => {
    const res = await fetch(`${base}/api/sessions/nope`);
    expect(res.status).toBe(404);
  });

  it("refuses a path-traversal request for static assets", async () => {
    const res = await fetch(`${base}/../../package.json`);
    expect([403, 404, 200]).toContain(res.status);
    if (res.status === 200) {
      // If anything is served it must be the SPA shell, never a repository file.
      expect(await res.text()).not.toContain("\"@agent-city/server\"");
    }
  });
});

describe("executor selection", () => {
  it("falls back to the rehearsal executor when no credential is present, and says so", () => {
    const saved = { key: process.env["ANTHROPIC_API_KEY"], token: process.env["ANTHROPIC_AUTH_TOKEN"] };
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["ANTHROPIC_AUTH_TOKEN"];
    try {
      const executor = chooseExecutor({ objective: "x" });
      expect(executor.mode).toBe("rehearsal");
      expect(executor.name).toContain("rehearsal");
    } finally {
      if (saved.key) process.env["ANTHROPIC_API_KEY"] = saved.key;
      if (saved.token) process.env["ANTHROPIC_AUTH_TOKEN"] = saved.token;
    }
  });
});
