/**
 * The city map.
 *
 * Shared by the orchestrator (which emits movement) and the renderer (which draws it) so
 * there is exactly one authority on where anything is. A district the runtime never routes an
 * agent to is a district the renderer must not populate.
 *
 * Coordinates are tile positions on an isometric grid; the renderer owns the projection.
 */

import type { District } from "./residents.js";

export interface DistrictSpec {
  readonly id: District;
  readonly name: string;
  /** What actually happens here, in runtime terms rather than set-dressing terms. */
  readonly purpose: string;
  /** Set-dressing. Read by the renderer only. */
  readonly description: string;
  readonly tile: { readonly x: number; readonly y: number };
  readonly footprint: { readonly w: number; readonly h: number };
  readonly height: number;
  /** Accent colour, used for the building, its light spill and its edges on the neural map. */
  readonly accent: string;
}

export const DISTRICTS: readonly DistrictSpec[] = [
  {
    id: "command-spire",
    name: "Command Spire",
    purpose: "Atlas interprets the objective, builds the task graph and routes capability.",
    description: "Tall, architectural, luminous; the owner's command deck sits above the city.",
    tile: { x: 0, y: 0 },
    footprint: { w: 3, h: 3 },
    height: 130,
    accent: "#c8d4ff",
  },
  {
    id: "observatory",
    name: "Observatory",
    purpose: "Verity's research swarms. Each investigator is a terminal; each source is a star.",
    description: "A glass dome where research branches resolve into constellations.",
    tile: { x: -5, y: -2 },
    footprint: { w: 3, h: 3 },
    height: 78,
    accent: "#ffe7a3",
  },
  {
    id: "strategy-chamber",
    name: "Strategy Chamber",
    purpose: "Nova defines the product, its acceptance criteria and what is deliberately not built.",
    description: "Amber product cards hang in mid-air and rearrange when priorities move.",
    tile: { x: -2, y: -5 },
    footprint: { w: 3, h: 2 },
    height: 62,
    accent: "#ffb877",
  },
  {
    id: "design-atelier",
    name: "Design Atelier",
    purpose: "Sol's flows and Iris's visual system. Two residents, one building, distinct authority.",
    description: "Giant floating canvases, live viewport walls, typography specimens mid-revision.",
    tile: { x: 3, y: -4 },
    footprint: { w: 4, h: 3 },
    height: 70,
    accent: "#ff9ecb",
  },
  {
    id: "motion-studio",
    name: "Motion Studio",
    purpose: "Kinetic's state machines, timing curves and reduced-motion fallbacks.",
    description: "A dark room where a single transition loops until it stops being wrong.",
    tile: { x: 6, y: -2 },
    footprint: { w: 2, h: 2 },
    height: 56,
    accent: "#b39cff",
  },
  {
    id: "engineering-foundry",
    name: "Engineering Foundry",
    purpose: "Rune's client implementation. Worktrees appear as separate manufacturing bays.",
    description: "Cyber-industrial: workstations, build pipelines, machinery that stamps artifacts.",
    tile: { x: 4, y: 2 },
    footprint: { w: 4, h: 4 },
    height: 84,
    accent: "#7fd6ff",
  },
  {
    id: "systems-foundry",
    name: "Systems Foundry",
    purpose: "Vector's data models, interfaces and infrastructure design.",
    description: "A topology of the running system, projected at full scale and walked through.",
    tile: { x: 7, y: 3 },
    footprint: { w: 3, h: 3 },
    height: 74,
    accent: "#6fe3c4",
  },
  {
    id: "security-citadel",
    name: "Security Citadel",
    purpose: "Aegis. Where escalations stop, and where credentials are not handed out.",
    description: "Defensive, low, heavy. Agents blocked on authorization visibly halt at its gate.",
    tile: { x: 1, y: 5 },
    footprint: { w: 3, h: 3 },
    height: 60,
    accent: "#ff8b8b",
  },
  {
    id: "verification-arena",
    name: "Verification Arena",
    purpose: "Argus. Artifacts travel through test chambers; a failure redirects them to repair.",
    description: "Concentric chambers. What comes out one side is not what went in the other.",
    tile: { x: -3, y: 3 },
    footprint: { w: 4, h: 4 },
    height: 68,
    accent: "#9dffb0",
  },
  {
    id: "performance-lab",
    name: "Performance Lab",
    purpose: "Flux. Benchmarks before and after, against a budget declared in advance.",
    description: "Instrumented, cold, quiet except for the fans.",
    tile: { x: -6, y: 2 },
    footprint: { w: 3, h: 2 },
    height: 52,
    accent: "#ffd166",
  },
  {
    id: "civic-hall",
    name: "Civic Hall",
    purpose: "Mercy. Conformance, human factors, and the users the demo forgot.",
    description: "Deliberately the most legible building in the city, at every zoom level.",
    tile: { x: -6, y: 5 },
    footprint: { w: 3, h: 3 },
    height: 58,
    accent: "#a8e6ff",
  },
  {
    id: "red-team-annex",
    name: "Red Team Annex",
    purpose: "Nyx. Pre-mortems, contradiction search, and the assumptions nobody examined.",
    description: "Attached to nothing, reachable from everywhere, lit from below.",
    tile: { x: 8, y: 6 },
    footprint: { w: 2, h: 2 },
    height: 46,
    accent: "#c48bff",
  },
  {
    id: "great-archive",
    name: "Great Archive",
    purpose: "Mnemos. Decisions and artifacts as indexed objects, not an endless transcript.",
    description: "Provenance order, newest closest. Nothing unsourced is admitted to the stacks.",
    tile: { x: -1, y: 8 },
    footprint: { w: 4, h: 3 },
    height: 64,
    accent: "#d9d2c5",
  },
  {
    id: "genesis-foundry",
    name: "Genesis Foundry",
    purpose: "Where a measured capability gap becomes a candidate, and occasionally a colleague.",
    description: "Transparent incubators, assembly rails, evaluation chambers, an onboarding gate.",
    tile: { x: -8, y: -5 },
    footprint: { w: 4, h: 4 },
    height: 92,
    accent: "#8fffe0",
  },
  {
    id: "release-tower",
    name: "Release Tower",
    purpose: "Pax. Finished products wait behind locked gates until the manifest is complete.",
    description: "A launch facility. The key does not turn while a gate is red.",
    tile: { x: 5, y: 8 },
    footprint: { w: 3, h: 3 },
    height: 116,
    accent: "#ffffff",
  },
];

export const DISTRICT_INDEX: ReadonlyMap<District, DistrictSpec> = new Map(
  DISTRICTS.map((d) => [d.id, d] as const),
);

export function district(id: District): DistrictSpec {
  const d = DISTRICT_INDEX.get(id);
  if (!d) throw new Error(`unknown district: ${id}`);
  return d;
}

/** Manhattan tile distance — used to pace travel animations off real routing, not off a timer. */
export function travelDistance(from: District, to: District): number {
  const a = district(from).tile;
  const b = district(to).tile;
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
