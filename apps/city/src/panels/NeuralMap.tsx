/**
 * The neural map.
 *
 * Every resident is a node, every active flow an edge, thickness is volume. Its real value is
 * not that it looks impressive — it is that a multi-agent failure becomes traceable. Selecting
 * a failure shows the chain that produced it, which is otherwise a needle in forty thousand
 * events.
 */

import { RESIDENTS } from "@agent-city/core";
import type { CityState } from "../state/store.js";

const R = 150;

export function NeuralMap({ state, onSelectAgent }: { state: CityState; onSelectAgent: (id: string) => void }) {
  const ids = RESIDENTS.map((r) => r.id);
  const born = [...state.agents.keys()].filter((id) => !ids.includes(id as never));
  const nodes = [...ids, ...born];

  const position = (i: number) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 200 + Math.cos(angle) * R, y: 190 + Math.sin(angle) * R };
  };
  const at = new Map(nodes.map((id, i) => [id, position(i)] as const));

  // Edge weight is message volume between a pair, counted from the flows the run produced.
  const weights = new Map<string, { from: string; to: string; n: number; kind: string }>();
  for (const f of state.flows) {
    if (!at.has(f.from) || !at.has(f.to)) continue;
    const key = `${f.from}→${f.to}`;
    const prior = weights.get(key);
    weights.set(key, { from: f.from, to: f.to, n: (prior?.n ?? 0) + 1, kind: f.kind });
  }

  return (
    <div className="neural">
      <svg viewBox="0 0 400 380" role="img" aria-label="Communication graph between residents">
        {[...weights.values()].map((e) => {
          const a = at.get(e.from)!;
          const b = at.get(e.to)!;
          return (
            <line
              key={`${e.from}-${e.to}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`edge ${e.kind}`}
              strokeWidth={Math.min(4, 0.6 + e.n * 0.5)}
            />
          );
        })}
        {nodes.map((id, i) => {
          const p = position(i);
          const view = state.agents.get(id);
          return (
            <g key={id} onClick={() => onSelectAgent(id)} className="node" tabIndex={0}>
              <circle cx={p.x} cy={p.y} r={view && view.activity !== "idle" ? 7 : 5} className={`node-dot ${view?.activity ?? "unknown"}`} />
              <text x={p.x} y={p.y - 11} textAnchor="middle" className="node-label">
                {id.length > 9 ? `${id.slice(0, 8)}…` : id}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="subtle">
        {weights.size} active path(s) · edge thickness is message volume · click a node to inspect
      </p>
    </div>
  );
}
