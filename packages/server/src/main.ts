/**
 * The event-stream bridge.
 *
 * HTTP for the world description, snapshots and manifests; a WebSocket for the live event
 * journal. The renderer is a *consumer* of this stream and has no other source of truth —
 * that is the mechanism behind Article 9. If the bridge stops sending events, the city stops
 * moving, which is exactly the honest behaviour.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { renderManifest } from "@agent-city/core";
import { Session, type SessionOptions } from "./session.js";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const UI_ROOT = resolve(HERE, "../../../apps/city/dist");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export interface ServerOptions {
  readonly port?: number;
  readonly host?: string;
  readonly defaults?: Partial<SessionOptions>;
}

export function createFoundryServer(opts: ServerOptions = {}) {
  const sessions = new Map<string, Session>();
  let counter = 0;

  const json = (res: ServerResponse, status: number, body: unknown): void => {
    const payload = JSON.stringify(body, null, 2);
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(payload) });
    res.end(payload);
  };

  const readBody = async (req: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    if (chunks.length === 0) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  /** Serve the built city. Path traversal is refused rather than normalised into something. */
  const serveStatic = async (url: string, res: ServerResponse): Promise<boolean> => {
    const rel = normalize(decodeURIComponent(url.split("?")[0] ?? "/")).replace(/^(\.\.[/\\])+/, "");
    const candidate = resolve(join(UI_ROOT, rel === "/" ? "index.html" : rel));
    if (!candidate.startsWith(UI_ROOT)) {
      res.writeHead(403).end("forbidden");
      return true;
    }
    try {
      const s = await stat(candidate);
      const file = s.isDirectory() ? join(candidate, "index.html") : candidate;
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
      return true;
    } catch {
      return false;
    }
  };

  const http = createServer(async (req, res) => {
    const url = req.url ?? "/";
    const path = url.split("?")[0] ?? "/";

    if (req.method === "GET" && path === "/api/world") return json(res, 200, Session.world());

    if (req.method === "GET" && path === "/api/sessions") {
      return json(res, 200, [...sessions.values()].map((s) => s.snapshot()));
    }

    if (req.method === "POST" && path === "/api/sessions") {
      const body = await readBody(req);
      const objective = typeof body["objective"] === "string" && body["objective"].trim().length > 0
        ? body["objective"].trim()
        : "Build a checkout flow that never loses a customer's work";
      const id = `session-${String(++counter).padStart(3, "0")}`;
      const session = new Session(id, {
        objective,
        paceMs: 120,
        ...opts.defaults,
        ...(typeof body["seed"] === "string" ? { seed: body["seed"] } : {}),
        ...(typeof body["paceMs"] === "number" ? { paceMs: body["paceMs"] } : {}),
        ...(body["forceRehearsal"] === true ? { forceRehearsal: true } : {}),
        ...(Array.isArray(body["ownerGrants"]) ? { ownerGrants: body["ownerGrants"] as string[] } : {}),
      });
      sessions.set(id, session);
      // Fire and forget: the run's progress is the event stream, not this response.
      void session.start().catch(() => {});
      return json(res, 201, session.snapshot());
    }

    const m = /^\/api\/sessions\/([^/]+)(\/[a-z]+)?$/.exec(path);
    if (req.method === "GET" && m) {
      const session = sessions.get(m[1]!);
      if (!session) return json(res, 404, { error: `unknown session ${m[1]}` });
      switch (m[2]) {
        case "/events": {
          const since = Number(new URL(url, "http://x").searchParams.get("since") ?? "0");
          return json(res, 200, session.since(Number.isFinite(since) ? since : 0));
        }
        case "/manifest": {
          const manifest = session.result?.manifest ?? null;
          return json(res, 200, { manifest, rendered: manifest ? renderManifest(manifest) : null });
        }
        default:
          return json(res, 200, session.snapshot());
      }
    }

    if (req.method === "GET" && (await serveStatic(path, res))) return;

    if (req.method === "GET" && !path.startsWith("/api/")) {
      // SPA fallback, so a deep link into the city still loads the city.
      if (await serveStatic("/index.html", res)) return;
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      return res.end(
        "Agent City server is running, but the city has not been built.\n" +
          "Build it with:  npm run -w @agent-city/ui build\n" +
          "The API is available at /api/world and /api/sessions.\n",
      );
    }

    return json(res, 404, { error: `no route for ${req.method} ${path}` });
  });

  const wss = new WebSocketServer({ server: http, path: "/stream" });
  wss.on("connection", (socket, req) => {
    const params = new URL(req.url ?? "/stream", "http://x").searchParams;
    const sessionId = params.get("session");
    const session = sessionId ? sessions.get(sessionId) : [...sessions.values()].at(-1);
    if (!session) {
      socket.send(JSON.stringify({ type: "error", error: "no session; POST /api/sessions first" }));
      socket.close();
      return;
    }

    const send = (payload: unknown) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
    };

    send({ type: "hello", world: Session.world(), snapshot: session.snapshot() });

    // Replay from the beginning, then follow live. Sequence numbers let the client prove it
    // has an unbroken picture — and say so plainly when it does not.
    const since = Number(params.get("since") ?? "0");
    for (const e of session.since(Number.isFinite(since) ? since : 0)) send({ type: "event", event: e });

    const unsubscribe = session.subscribe((e) => send({ type: "event", event: e }));
    const heartbeat = setInterval(() => send({ type: "snapshot", snapshot: session.snapshot() }), 2000);
    socket.on("close", () => {
      unsubscribe();
      clearInterval(heartbeat);
    });
  });

  return {
    http,
    wss,
    sessions,
    listen(port = opts.port ?? 4173, host = opts.host ?? "127.0.0.1"): Promise<{ port: number; host: string }> {
      return new Promise((res) => http.listen(port, host, () => res({ port, host })));
    },
    close(): Promise<void> {
      return new Promise((res) => {
        wss.close();
        http.close(() => res());
      });
    },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env["PORT"] ?? 4173);
  const server = createFoundryServer({ port });
  const { host } = await server.listen(port);
  const mode = process.env["ANTHROPIC_API_KEY"] || process.env["ANTHROPIC_AUTH_TOKEN"] ? "live (Claude)" : "rehearsal (no API key present)";
  process.stdout.write(
    [
      "",
      "  AGENT CITY — The Foundry",
      `  http://${host}:${port}`,
      `  execution mode: ${mode}`,
      "",
      "  POST /api/sessions   {\"objective\": \"...\"}   start a run",
      "  WS   /stream?session=session-001               follow it live",
      "",
    ].join("\n"),
  );
}
