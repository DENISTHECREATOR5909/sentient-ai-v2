/**
 * Isometric projection.
 *
 * A 2:1 dimetric grid — the standard for readable isometric scenes, and cheap: one multiply
 * and one add per point. Tile coordinates come from `@agent-city/core`, so the map the
 * orchestrator routes across and the map on screen are the same map.
 */

export const TILE_W = 64;
export const TILE_H = 32;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function toScreen(tileX: number, tileY: number): Point {
  return { x: (tileX - tileY) * (TILE_W / 2), y: (tileX + tileY) * (TILE_H / 2) };
}

export function toTile(screenX: number, screenY: number): Point {
  return {
    x: (screenX / (TILE_W / 2) + screenY / (TILE_H / 2)) / 2,
    y: (screenY / (TILE_H / 2) - screenX / (TILE_W / 2)) / 2,
  };
}

/** Depth order: things further back in the grid draw first. */
export function depth(tileX: number, tileY: number): number {
  return tileX + tileY;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ease-in-out, so an agent leaving a building accelerates and arriving decelerates. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
