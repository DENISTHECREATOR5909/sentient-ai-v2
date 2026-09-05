/**
 * The connection to the bridge.
 *
 * Reconnects with backoff, resumes from the last sequence number it saw, and reports a gap
 * rather than papering over one. A renderer that quietly interpolates across missing events
 * is showing a city that never happened.
 */

import type { CityEvent } from "@agent-city/core";

export interface Snapshot {
  id: string;
  objective: string;
  state: "idle" | "running" | "finished" | "errored";
  mode: "live" | "rehearsal";
  executor: string;
  lastSeq: number;
  error: string | null;
}

export interface WorldDescription {
  districts: { id: string; name: string }[];
  residents: { id: string; name: string; district: string; title: string }[];
}

export interface ConnectionHandlers {
  onEvent(event: CityEvent): void;
  onSnapshot(snapshot: Snapshot): void;
  onStatus(status: "connecting" | "open" | "closed"): void;
  onWorld(world: WorldDescription): void;
}

export class Connection {
  #socket: WebSocket | null = null;
  #lastSeq = 0;
  #attempt = 0;
  #closed = false;

  constructor(
    private readonly sessionId: string,
    private readonly handlers: ConnectionHandlers,
  ) {}

  open(): void {
    if (this.#closed) return;
    this.handlers.onStatus("connecting");
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${location.host}/stream?session=${encodeURIComponent(this.sessionId)}&since=${this.#lastSeq}`;
    const socket = new WebSocket(url);
    this.#socket = socket;

    socket.onopen = () => {
      this.#attempt = 0;
      this.handlers.onStatus("open");
    };
    socket.onmessage = (msg) => {
      const payload = JSON.parse(msg.data as string) as
        | { type: "event"; event: CityEvent }
        | { type: "snapshot"; snapshot: Snapshot }
        | { type: "hello"; snapshot: Snapshot; world: WorldDescription }
        | { type: "error"; error: string };
      if (payload.type === "event") {
        this.#lastSeq = payload.event.seq;
        this.handlers.onEvent(payload.event);
      } else if (payload.type === "hello") {
        this.handlers.onWorld(payload.world);
        this.handlers.onSnapshot(payload.snapshot);
      } else if (payload.type === "snapshot") {
        this.handlers.onSnapshot(payload.snapshot);
      }
    };
    socket.onclose = () => {
      this.handlers.onStatus("closed");
      if (this.#closed) return;
      const delay = Math.min(8000, 400 * 2 ** this.#attempt++);
      setTimeout(() => this.open(), delay);
    };
    socket.onerror = () => socket.close();
  }

  close(): void {
    this.#closed = true;
    this.#socket?.close();
  }
}

export async function startSession(objective: string, options: { seed?: string; paceMs?: number } = {}): Promise<Snapshot> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ objective, ...options }),
  });
  if (!res.ok) throw new Error(`could not start a session (${res.status})`);
  return (await res.json()) as Snapshot;
}

export async function listSessions(): Promise<Snapshot[]> {
  const res = await fetch("/api/sessions");
  return res.ok ? ((await res.json()) as Snapshot[]) : [];
}
