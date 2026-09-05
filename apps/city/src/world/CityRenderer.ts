/**
 * The isometric city.
 *
 * GPU-accelerated 2D rather than a full 3D world: the information here is spatial, not
 * volumetric, and sprite batching is what keeps a city with hundreds of ephemeral workers at
 * frame rate. Buildings and ground are drawn once into cached containers; only agents, flows
 * and status effects update per frame.
 *
 * Every moving thing on screen is a consequence of an event. The renderer holds no timers of
 * its own that create entities, and asks `Correspondence` before drawing anything.
 */

import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  type FederatedPointerEvent,
} from "pixi.js";
import { DISTRICTS, type DistrictSpec } from "@agent-city/core";
import type { CityState } from "../state/store.js";
import { Correspondence } from "./correspondence.js";
import { TILE_H, TILE_W, depth, easeInOut, lerp, toScreen } from "./iso.js";

const ACTIVITY_COLOUR: Record<string, number> = {
  idle: 0x5b6472,
  thinking: 0xc8d4ff,
  working: 0x7fd6ff,
  researching: 0xffe7a3,
  reviewing: 0xb39cff,
  verifying: 0x9dffb0,
  repairing: 0xffb877,
  blocked: 0xff8b8b,
  waiting: 0x6b7480,
  travelling: 0xffffff,
  incubating: 0x8fffe0,
  retired: 0x3a3f47,
};

const FLOW_COLOUR: Record<string, number> = {
  message: 0x7fd6ff,
  verification: 0x9dffb0,
  repair: 0xff8b8b,
  assignment: 0xc8d4ff,
};

interface AgentSprite {
  readonly container: Container;
  readonly body: Graphics;
  readonly halo: Graphics;
  readonly label: Text;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  travelT: number;
  travelling: boolean;
}

export interface CityRendererOptions {
  readonly onSelectAgent?: (id: string | null) => void;
  readonly onSelectDistrict?: (id: string | null) => void;
}

export class CityRenderer {
  readonly app = new Application();
  readonly correspondence = new Correspondence();

  readonly #camera = new Container();
  readonly #ground = new Container();
  readonly #buildings = new Container();
  readonly #flows = new Container();
  readonly #actors = new Container();
  readonly #sprites = new Map<string, AgentSprite>();
  readonly #districtAt = new Map<string, { x: number; y: number }>();
  readonly #opts: CityRendererOptions;

  #state: CityState | null = null;
  #pan = { x: 0, y: 0 };
  #zoom = 1;
  #dragging = false;
  #dragFrom = { x: 0, y: 0 };
  #tick = 0;
  #destroyed = false;

  constructor(opts: CityRendererOptions = {}) {
    this.#opts = opts;
  }

  async mount(host: HTMLElement): Promise<void> {
    await this.app.init({
      background: 0x080a0f,
      antialias: true,
      resolution: Math.min(globalThis.devicePixelRatio ?? 1, 2),
      autoDensity: true,
      resizeTo: host,
      preference: "webgl",
    });
    if (this.#destroyed) return;
    host.appendChild(this.app.canvas);

    this.#camera.addChild(this.#ground, this.#buildings, this.#flows, this.#actors);
    this.app.stage.addChild(this.#camera);
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = { contains: () => true } as never;

    this.#drawGround();
    this.#drawBuildings();
    this.#installCamera();
    this.#centre();

    this.app.ticker.add(() => this.#frame());
  }

  destroy(): void {
    this.#destroyed = true;
    this.app.destroy(true, { children: true });
  }

  update(state: CityState): void {
    this.#state = state;
    this.#syncAgents(state);
  }

  // ── static scenery ──────────────────────────────────────────────────────────────────────

  #drawGround(): void {
    const g = new Graphics();
    const R = 16;
    for (let x = -R; x <= R; x++) {
      for (let y = -R; y <= R; y++) {
        const p = toScreen(x, y);
        const shade = (x + y) % 2 === 0 ? 0x0d1017 : 0x0b0e14;
        g.moveTo(p.x, p.y - TILE_H / 2)
          .lineTo(p.x + TILE_W / 2, p.y)
          .lineTo(p.x, p.y + TILE_H / 2)
          .lineTo(p.x - TILE_W / 2, p.y)
          .closePath()
          .fill({ color: shade });
      }
    }
    this.#ground.addChild(g);
    this.#ground.cacheAsTexture(true);
  }

  #drawBuildings(): void {
    const sorted = [...DISTRICTS].sort((a, b) => depth(a.tile.x, a.tile.y) - depth(b.tile.x, b.tile.y));
    for (const d of sorted) {
      this.#buildings.addChild(this.#building(d));
      // Agents gather on the plaza south of a building, where they are not hidden by it.
      const plaza = toScreen(d.tile.x + d.footprint.w / 2, d.tile.y + d.footprint.h + 0.9);
      this.#districtAt.set(d.id, plaza);
    }
  }

  #building(d: DistrictSpec): Container {
    const c = new Container();

    // The four ground corners of the footprint, in screen space. Everything else is these
    // four points, some of them lifted by the building's height.
    const a = toScreen(d.tile.x, d.tile.y);
    const b = toScreen(d.tile.x + d.footprint.w, d.tile.y);
    const e = toScreen(d.tile.x + d.footprint.w, d.tile.y + d.footprint.h);
    const f = toScreen(d.tile.x, d.tile.y + d.footprint.h);
    const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - d.height });

    const g = new Graphics();

    // Ground shadow, so a building reads as standing on the plate rather than floating.
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).lineTo(e.x, e.y).lineTo(f.x, f.y).closePath()
      .fill({ color: 0x000000, alpha: 0.45 });

    // South-west face (in shadow) and south-east face (catching the light).
    g.moveTo(f.x, f.y).lineTo(e.x, e.y).lineTo(up(e).x, up(e).y).lineTo(up(f).x, up(f).y).closePath()
      .fill({ color: 0x0e131b })
      .stroke({ color: d.accent, width: 1, alpha: 0.18 });
    g.moveTo(e.x, e.y).lineTo(b.x, b.y).lineTo(up(b).x, up(b).y).lineTo(up(e).x, up(e).y).closePath()
      .fill({ color: 0x161d29 })
      .stroke({ color: d.accent, width: 1, alpha: 0.18 });

    // Windows: a regular grid on the lit face, dim and irregular so it reads as a building
    // at night rather than as a texture. Purely scenery — it encodes nothing.
    const floors = Math.max(1, Math.floor(d.height / 22));
    for (let row = 0; row < floors; row++) {
      for (let col = 0; col < 3; col++) {
        const t = (col + 1) / 4;
        const wx = e.x + (b.x - e.x) * t;
        const wy = e.y + (b.y - e.y) * t - 14 - row * 20;
        if ((row * 3 + col) % 3 === 0) continue;
        g.rect(wx - 2, wy - 5, 4, 7).fill({ color: d.accent, alpha: 0.22 });
      }
    }

    // Roof.
    g.moveTo(up(a).x, up(a).y)
      .lineTo(up(b).x, up(b).y)
      .lineTo(up(e).x, up(e).y)
      .lineTo(up(f).x, up(f).y)
      .closePath()
      .fill({ color: d.accent, alpha: 0.14 })
      .stroke({ color: d.accent, width: 1.2, alpha: 0.7 });

    c.addChild(g);

    const label = new Text({
      text: d.name,
      style: new TextStyle({
        fill: d.accent,
        fontSize: 11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: 0.6,
      }),
    });
    label.anchor.set(0.5, 1);
    const roofCentre = up(toScreen(d.tile.x + d.footprint.w / 2, d.tile.y + d.footprint.h / 2));
    label.position.set(roofCentre.x, roofCentre.y - 8);
    label.alpha = 0.8;
    c.addChild(label);

    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointertap", () => this.#opts.onSelectDistrict?.(d.id));
    return c;
  }

  // ── agents ──────────────────────────────────────────────────────────────────────────────

  #syncAgents(state: CityState): void {
    for (const [id, view] of state.agents) {
      if (!this.correspondence.mayDrawAgent(state, id)) continue;
      const home = this.#districtAt.get(String(view.district)) ?? { x: 0, y: 0 };
      // Deterministic offset so an agent keeps its spot in a building across frames.
      const seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
      const ox = ((seed * 37) % 72) - 36;
      const oy = ((seed * 53) % 30) - 15;
      const target = { x: home.x + ox, y: home.y + oy };

      let sprite = this.#sprites.get(id);
      if (!sprite) {
        sprite = this.#makeAgent(id, view.resident);
        sprite.x = target.x;
        sprite.y = target.y;
        this.#actors.addChild(sprite.container);
        this.#sprites.set(id, sprite);
      }
      if (sprite.targetX !== target.x || sprite.targetY !== target.y) {
        sprite.targetX = target.x;
        sprite.targetY = target.y;
        sprite.travelT = 0;
        sprite.travelling = true;
      }

      const colour = ACTIVITY_COLOUR[view.activity] ?? 0x5b6472;
      sprite.body.clear().circle(0, 0, 5).fill({ color: colour }).stroke({ color: 0x000000, width: 1, alpha: 0.6 });
      sprite.halo.clear();
      if (view.activity !== "idle" && view.activity !== "waiting") {
        sprite.halo.circle(0, 0, 9).stroke({ color: colour, width: 1, alpha: 0.5 });
      }
      sprite.label.alpha = view.resident ? 0.8 : 1;
    }

    // Agents the state no longer knows about are removed, never left drifting.
    for (const [id, sprite] of this.#sprites) {
      if (!state.agents.has(id)) {
        sprite.container.destroy({ children: true });
        this.#sprites.delete(id);
      }
    }
  }

  #makeAgent(id: string, isResident: boolean): AgentSprite {
    const container = new Container();
    const halo = new Graphics();
    const body = new Graphics();
    const label = new Text({
      text: isResident ? id.toUpperCase() : id.replace(/^agent-/, "").split("-")[0]!.toUpperCase(),
      style: new TextStyle({
        fill: 0xe6ecf5,
        fontSize: 9,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: 0.4,
      }),
    });
    label.anchor.set(0.5, 1);
    label.position.set(0, -10);
    container.addChild(halo, body, label);
    container.eventMode = "static";
    container.cursor = "pointer";
    container.on("pointertap", (e: FederatedPointerEvent) => {
      e.stopPropagation();
      this.#opts.onSelectAgent?.(id);
    });
    return { container, body, halo, label, x: 0, y: 0, targetX: 0, targetY: 0, travelT: 1, travelling: false };
  }

  // ── per frame ───────────────────────────────────────────────────────────────────────────

  #frame(): void {
    this.#tick += this.app.ticker.deltaMS;
    const dt = this.app.ticker.deltaMS / 1000;

    for (const sprite of this.#sprites.values()) {
      if (sprite.travelling) {
        sprite.travelT = Math.min(1, sprite.travelT + dt * 1.6);
        const t = easeInOut(sprite.travelT);
        sprite.container.position.set(lerp(sprite.x, sprite.targetX, t), lerp(sprite.y, sprite.targetY, t));
        if (sprite.travelT >= 1) {
          sprite.x = sprite.targetX;
          sprite.y = sprite.targetY;
          sprite.travelling = false;
        }
      } else {
        // A gentle idle bob, the one thing on screen that is decoration rather than data.
        const bob = Math.sin(this.#tick / 600 + sprite.x) * 0.6;
        sprite.container.position.set(sprite.x, sprite.y + bob);
      }
      sprite.container.zIndex = sprite.container.position.y;
    }
    this.#actors.sortableChildren = true;

    this.#drawFlows();
  }

  /** Luminous streams between agents. Each one is a real message, verdict or assignment. */
  #drawFlows(): void {
    this.#flows.removeChildren().forEach((c) => c.destroy());
    const state = this.#state;
    if (!state) return;

    const recent = state.flows.slice(-14);
    const g = new Graphics();
    for (const [i, f] of recent.entries()) {
      const from = this.#sprites.get(f.from)?.container.position ?? this.#districtAt.get(f.from);
      const to = this.#sprites.get(f.to)?.container.position ?? this.#districtAt.get(f.to) ?? this.#taskAnchor(f.to);
      if (!from || !to) continue;

      const age = (recent.length - i) / recent.length;
      const alpha = 0.12 + age * 0.4;
      const colour = FLOW_COLOUR[f.kind] ?? 0x7fd6ff;
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 34;
      g.moveTo(from.x, from.y).quadraticCurveTo(midX, midY, to.x, to.y).stroke({ color: colour, width: 1.2, alpha });

      // A travelling packet, positioned by clock — the path is real, the dot marks it.
      const t = ((this.#tick / 900 + i * 0.13) % 1);
      const px = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * midX + t ** 2 * to.x;
      const py = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * midY + t ** 2 * to.y;
      g.circle(px, py, 2).fill({ color: colour, alpha: alpha + 0.3 });
    }
    this.#flows.addChild(g);
  }

  /** Where a task lives on the map: its owner's current position. */
  #taskAnchor(taskId: string): { x: number; y: number } | null {
    const task = this.#state?.tasks.get(taskId);
    if (!task) return null;
    return this.#sprites.get(task.owner)?.container.position ?? null;
  }

  // ── camera ──────────────────────────────────────────────────────────────────────────────

  #installCamera(): void {
    const stage = this.app.stage;
    stage.on("pointerdown", (e: FederatedPointerEvent) => {
      this.#dragging = true;
      this.#dragFrom = { x: e.global.x - this.#pan.x, y: e.global.y - this.#pan.y };
    });
    stage.on("pointerup", () => {
      this.#dragging = false;
    });
    stage.on("pointerupoutside", () => {
      this.#dragging = false;
    });
    stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (!this.#dragging) return;
      this.#pan = { x: e.global.x - this.#dragFrom.x, y: e.global.y - this.#dragFrom.y };
      this.#applyCamera();
    });
    this.app.canvas.addEventListener(
      "wheel",
      (e: WheelEvent) => {
        e.preventDefault();
        this.#zoom = Math.min(2.4, Math.max(0.35, this.#zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
        this.#applyCamera();
      },
      { passive: false },
    );
  }

  #centre(): void {
    this.#pan = { x: this.app.screen.width / 2, y: this.app.screen.height / 2 - 40 };
    this.#applyCamera();
  }

  #applyCamera(): void {
    this.#camera.position.set(this.#pan.x, this.#pan.y);
    this.#camera.scale.set(this.#zoom);
  }

  focus(districtId: string): void {
    const p = this.#districtAt.get(districtId);
    if (!p) return;
    this.#pan = { x: this.app.screen.width / 2 - p.x * this.#zoom, y: this.app.screen.height / 2 - p.y * this.#zoom };
    this.#applyCamera();
  }

  get zoom(): number {
    return this.#zoom;
  }
}
