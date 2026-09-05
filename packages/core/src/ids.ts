/**
 * Deterministic identifier and randomness utilities.
 *
 * The city must be reproducible: given the same objective and the same seed, a run produces
 * the same task ids, the same avatar seeds and the same incubator bay assignments. That is
 * what makes a recorded run replayable and a failure diagnosable.
 */

/** Small, fast, well-distributed 32-bit string hash (FNV-1a). */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a compact deterministic PRNG. */
export function createRng(seed: number | string): () => number {
  let a = typeof seed === "string" ? hash32(seed) : seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";

/** Deterministic short id derived from a namespace and an ordinal. */
export function shortId(namespace: string, ordinal: number, length = 6): string {
  const rng = createRng(`${namespace}:${ordinal}`);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE36[Math.floor(rng() * BASE36.length)] ?? "0";
  }
  return out;
}

/** Monotonic counter factory, per namespace, for deterministic sequential ids. */
export function createIdFactory(namespace: string): (kind: string) => string {
  const counters = new Map<string, number>();
  return function nextId(kind: string): string {
    const n = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, n);
    return `${kind}-${String(n).padStart(3, "0")}-${shortId(`${namespace}:${kind}`, n, 4)}`;
  };
}

/** Slugify a free-form objective into a stable, readable key. */
export function slug(text: string, maxWords = 6): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords);
  return words.length > 0 ? words.join("-") : "objective";
}
