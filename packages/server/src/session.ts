/**
 * A run session.
 *
 * The city renders a session, and a session is the *live* orchestrator — not a recording of
 * one. Late joiners replay the journal from sequence 0 and then follow live, which is why
 * the bus assigns monotonic sequence numbers: a client that finds a gap knows it has an
 * incomplete picture and can say so, instead of drawing a plausible one.
 */

import {
  DISTRICTS,
  RESIDENTS,
  describeEvent,
  renderManifest,
  type CityEvent,
  type ReleaseManifest,
} from "@agent-city/core";
import { ClaudeExecutor, Foundry, RehearsalExecutor, type Executor, type RunResult } from "@agent-city/runtime";

export type SessionState = "idle" | "running" | "finished" | "errored";

export interface SessionSnapshot {
  readonly id: string;
  readonly objective: string;
  readonly state: SessionState;
  readonly mode: "live" | "rehearsal";
  readonly executor: string;
  readonly lastSeq: number;
  readonly manifest: ReleaseManifest | null;
  readonly operations: Record<string, number>;
  readonly error: string | null;
}

export interface SessionOptions {
  readonly objective: string;
  readonly seed?: string;
  readonly defectRate?: number;
  readonly ownerGrants?: readonly string[];
  /** Force rehearsal even when a key is present — useful for a reproducible demo. */
  readonly forceRehearsal?: boolean;
  /** Milliseconds between emitted events, so the city is watchable rather than instant. */
  readonly paceMs?: number;
}

/**
 * Choose an executor.
 *
 * A missing API key is a capability degradation, not an error and not a secret. The rehearsal
 * executor announces itself, and the release gate blocks accordingly.
 */
export function chooseExecutor(opts: SessionOptions): Executor {
  const hasKey = Boolean(process.env["ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_AUTH_TOKEN"]);
  if (opts.forceRehearsal || !hasKey) {
    return new RehearsalExecutor({
      seed: opts.seed ?? "foundry",
      ...(opts.defectRate !== undefined ? { defectRate: opts.defectRate } : {}),
    });
  }
  return new ClaudeExecutor();
}

export class Session {
  readonly id: string;
  readonly objective: string;
  readonly foundry: Foundry;
  readonly #executor: Executor;
  readonly #paceMs: number;
  readonly #listeners = new Set<(e: CityEvent) => void>();
  /** Events released to clients. Paced emission never reorders and never drops. */
  readonly #released: CityEvent[] = [];
  readonly #pending: CityEvent[] = [];
  #state: SessionState = "idle";
  #result: RunResult | null = null;
  #error: string | null = null;
  #pump: NodeJS.Timeout | null = null;

  constructor(id: string, opts: SessionOptions) {
    this.id = id;
    this.objective = opts.objective;
    this.#executor = chooseExecutor(opts);
    this.#paceMs = opts.paceMs ?? 0;
    this.foundry = new Foundry({
      executor: this.#executor,
      ...(opts.seed ? { seed: opts.seed } : {}),
      ...(opts.ownerGrants ? { ownerGrants: opts.ownerGrants } : {}),
    });
    this.foundry.bus.subscribe((e) => {
      if (this.#paceMs > 0) this.#pending.push(e);
      else this.#release(e);
    });
  }

  #release(e: CityEvent): void {
    this.#released.push(e);
    for (const l of this.#listeners) {
      try {
        l(e);
      } catch {
        // A disconnecting client is not the organization's problem.
      }
    }
  }

  #startPump(): void {
    if (this.#paceMs <= 0 || this.#pump) return;
    this.#pump = setInterval(() => {
      const next = this.#pending.shift();
      if (next) this.#release(next);
      else if (this.#state !== "running") this.#stopPump();
    }, this.#paceMs);
  }

  #stopPump(): void {
    if (this.#pump) {
      clearInterval(this.#pump);
      this.#pump = null;
    }
    while (this.#pending.length > 0) this.#release(this.#pending.shift()!);
  }

  subscribe(fn: (e: CityEvent) => void): () => void {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  /** Events after `seq`, for a client catching up. */
  since(seq: number): readonly CityEvent[] {
    return this.#released.filter((e) => e.seq > seq);
  }

  async start(): Promise<RunResult> {
    if (this.#state === "running") throw new Error("session already running");
    this.#state = "running";
    this.#startPump();
    try {
      this.#result = await this.foundry.run(this.objective);
      this.#state = "finished";
      return this.#result;
    } catch (err) {
      this.#state = "errored";
      this.#error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      this.#stopPump();
    }
  }

  get result(): RunResult | null {
    return this.#result;
  }

  snapshot(): SessionSnapshot {
    return {
      id: this.id,
      objective: this.objective,
      state: this.#state,
      mode: this.#executor.mode,
      executor: this.#executor.name,
      lastSeq: this.#released.at(-1)?.seq ?? 0,
      manifest: this.#result?.manifest ?? null,
      operations: this.foundry.tasks.operations(),
      error: this.#error,
    };
  }

  /** Static world description — the renderer needs this before the first event arrives. */
  static world() {
    return {
      districts: DISTRICTS,
      residents: RESIDENTS.map((r) => ({
        id: r.id,
        name: r.name,
        title: r.title,
        district: r.district,
        appearance: r.appearance,
        authority: r.authority,
        reportsTo: r.reportsTo,
        implementsDomains: r.implementsDomains,
        verifiesDomains: r.verifiesDomains,
        modelClass: r.modelClass,
        tools: r.tools,
        outputContract: r.outputContract,
        releaseAuthority: r.releaseAuthority,
      })),
    };
  }
}

export { describeEvent, renderManifest };
