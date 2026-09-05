/**
 * The event bus.
 *
 * An actor-style asynchronous message exchange rather than a call graph: agents publish what
 * happened, and whoever cares reacts. That choice is what lets the city be event-driven —
 * Argus reporting a failed test *causes* Rune to leave the Release Tower, rather than an
 * animation being played next to an unrelated process.
 *
 * The bus also owns Article 9. Every published event is checked for correspondence, and an
 * event that would ask the renderer to invent a subject is recorded as a violation instead of
 * being quietly dropped.
 */

import type { CityEvent } from "./events.js";
import { assertCorrespondence } from "./events.js";
import { violation, type Violation } from "./constitution.js";

export type Subscriber = (event: CityEvent) => void;

/**
 * Everything except the three fields the bus assigns (`seq`, `id`, `at`).
 *
 * The omit has to distribute across the event union — a plain `Omit` over a union collapses
 * it to the shared keys, which would let any event carry any other event's payload.
 */
type DraftOf<T> = T extends unknown ? Omit<T, "seq" | "id" | "at"> : never;
export type EventDraft = DraftOf<CityEvent>;

export interface BusOptions {
  /** Retain at most this many events in the replay journal. 0 = unbounded. */
  readonly journalLimit?: number;
  readonly clock?: () => number;
}

export class EventBus {
  #seq = 0;
  readonly #subscribers = new Set<Subscriber>();
  readonly #journal: CityEvent[] = [];
  readonly #violations: Violation[] = [];
  readonly #limit: number;
  readonly #now: () => number;

  constructor(opts: BusOptions = {}) {
    this.#limit = opts.journalLimit ?? 0;
    this.#now = opts.clock ?? (() => Date.now());
  }

  subscribe(fn: Subscriber): () => void {
    this.#subscribers.add(fn);
    return () => this.#subscribers.delete(fn);
  }

  /**
   * Publish an event. Returns the completed event so callers can reference its id.
   *
   * A subscriber that throws does not stop the others and does not stop the run: a renderer
   * crash must never be able to halt the organization it is watching.
   */
  publish(draft: EventDraft): CityEvent {
    const event = {
      ...draft,
      seq: ++this.#seq,
      id: `evt-${String(this.#seq).padStart(6, "0")}`,
      at: this.#now(),
    } as CityEvent;

    const problems = assertCorrespondence(event);
    if (problems.length > 0) {
      const v = violation("A9_NO_THEATER", event.kind, problems.join("; "), event.at);
      this.#violations.push(v);
    }

    this.#journal.push(event);
    if (this.#limit > 0 && this.#journal.length > this.#limit) {
      this.#journal.splice(0, this.#journal.length - this.#limit);
    }

    for (const sub of this.#subscribers) {
      try {
        sub(event);
      } catch {
        // Subscribers are observers. An observer's failure is its own problem.
      }
    }
    return event;
  }

  /** Full journal, oldest first. This is what a replay reads. */
  get journal(): readonly CityEvent[] {
    return this.#journal;
  }

  get violations(): readonly Violation[] {
    return this.#violations;
  }

  get seq(): number {
    return this.#seq;
  }

  /** Events after a given sequence number — how a late-joining renderer catches up. */
  since(seq: number): readonly CityEvent[] {
    return this.#journal.filter((e) => e.seq > seq);
  }

  /**
   * Gap detection for a consumer. A renderer that has missed events must say so rather than
   * interpolating: an interpolated world is theater.
   */
  hasGap(lastSeen: number, received: readonly CityEvent[]): boolean {
    let expected = lastSeen + 1;
    for (const e of received) {
      if (e.seq !== expected) return true;
      expected += 1;
    }
    return false;
  }
}
