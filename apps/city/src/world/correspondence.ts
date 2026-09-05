/**
 * Article 9, enforced at the point of drawing.
 *
 * The renderer is the last place a lie could enter the system: everything upstream could be
 * honest and a renderer could still animate a figure that corresponds to nothing. So the
 * scene graph asks this module before it draws, and this module answers from state that only
 * events can write.
 *
 * `refusals` is not a debug counter. It appears in the UI. If the city ever declines to draw
 * something, the operator should find out from the city, not from a console.
 */

import type { CityState } from "../state/store.js";

export interface Refusal {
  readonly kind: string;
  readonly id: string;
  readonly reason: string;
}

export class Correspondence {
  readonly #refusals: Refusal[] = [];

  /** May the renderer draw this agent? Only if an event put it on the map. */
  mayDrawAgent(state: CityState, id: string): boolean {
    if (state.agents.has(id)) return true;
    this.#refuse("agent", id, "no event has placed this agent in the city");
    return false;
  }

  mayDrawTask(state: CityState, id: string): boolean {
    if (state.tasks.has(id)) return true;
    this.#refuse("task", id, "no event has created this task");
    return false;
  }

  mayDrawSwarmWorker(state: CityState, swarmId: string, index: number): boolean {
    const swarm = state.swarms.get(swarmId);
    if (!swarm) {
      this.#refuse("swarm", swarmId, "no swarm.spawned event for this swarm");
      return false;
    }
    if (index >= swarm.workers) {
      this.#refuse("swarm-worker", `${swarmId}#${index}`, `swarm has ${swarm.workers} workers; drawing more would invent labour`);
      return false;
    }
    if (swarm.dissolved) {
      this.#refuse("swarm-worker", `${swarmId}#${index}`, "swarm has dissolved; its workers no longer exist");
      return false;
    }
    return true;
  }

  #refuse(kind: string, id: string, reason: string): void {
    if (this.#refusals.some((r) => r.kind === kind && r.id === id)) return;
    this.#refusals.push({ kind, id, reason });
  }

  get refusals(): readonly Refusal[] {
    return this.#refusals;
  }

  get clean(): boolean {
    return this.#refusals.length === 0;
  }
}
