/**
 * The application shell.
 *
 * DOM for everything that benefits from real text — inspectors, tables, evidence, the gate
 * matrix, accessibility — and PixiJS for the world. The split is deliberate: a canvas is the
 * wrong place to put information someone has to read carefully, and the DOM is the wrong
 * place to put four hundred moving agents.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { describeEvent } from "@agent-city/core";
import { CityRenderer } from "./world/CityRenderer.js";
import { Connection, startSession, type Snapshot } from "./state/connection.js";
import { EMPTY_STATE, reduce, seedResidents, type CityState } from "./state/store.js";
import { Inspector } from "./panels/Inspector.js";
import { Operations } from "./panels/Operations.js";
import { NeuralMap } from "./panels/NeuralMap.js";
import { ReleaseTower } from "./panels/ReleaseTower.js";
import { GenesisFoundry } from "./panels/GenesisFoundry.js";

type View = "city" | "operations" | "neural" | "release" | "genesis";

const DEFAULT_OBJECTIVE = "Build a checkout flow that never loses a customer's work";

export function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const connectionRef = useRef<Connection | null>(null);

  const [state, setState] = useState<CityState>(EMPTY_STATE);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("closed");
  const [view, setView] = useState<View>("city");
  const [selected, setSelected] = useState<string | null>(null);
  const [objective, setObjective] = useState(DEFAULT_OBJECTIVE);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mount the world once. It survives view changes — the city keeps running while you read
  // the operations table, exactly as it would if you looked away from a window.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || rendererRef.current) return;
    const renderer = new CityRenderer({
      onSelectAgent: (id) => setSelected(id),
      onSelectDistrict: (id) => id && renderer.focus(id),
    });
    rendererRef.current = renderer;
    void renderer.mount(host);
    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(state);
  }, [state]);

  const begin = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      connectionRef.current?.close();
      setState(EMPTY_STATE);
      const created = await startSession(objective, { paceMs: 90 });
      setSnapshot(created);
      const connection = new Connection(created.id, {
        onEvent: (event) => setState((prev) => reduce(prev, event)),
        onSnapshot: setSnapshot,
        onStatus: setStatus,
        onWorld: (world) => setState((prev) => seedResidents(prev, world.residents)),
      });
      connectionRef.current = connection;
      connection.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }, [objective]);

  useEffect(() => () => connectionRef.current?.close(), []);

  const refusals = rendererRef.current?.correspondence.refusals ?? [];
  const ticker = useMemo(() => state.log.slice(-60).reverse(), [state.log]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="mark">◆</span>
          <div>
            <h1>Agent City</h1>
            <p className="subtle">The Foundry · a multi-agent production operating system</p>
          </div>
        </div>

        <form
          className="objective"
          onSubmit={(e) => {
            e.preventDefault();
            void begin();
          }}
        >
          <label htmlFor="objective" className="sr-only">
            Objective
          </label>
          <input
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Give the organization an objective"
          />
          <button type="submit" disabled={starting}>
            {starting ? "Starting…" : "Commission"}
          </button>
        </form>

        <div className="status">
          {snapshot && (
            <span className={`badge mode-${snapshot.mode}`} title={snapshot.executor}>
              {snapshot.mode}
            </span>
          )}
          <span className={`badge conn-${status}`}>{status}</span>
          {state.gap && (
            <span className="badge fail" title="Events were missed. The city below is incomplete.">
              stream gap
            </span>
          )}
        </div>
      </header>

      <nav className="views" aria-label="Views">
        {(["city", "operations", "neural", "release", "genesis"] as View[]).map((v) => (
          <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}>
            {v === "neural" ? "neural map" : v}
          </button>
        ))}
      </nav>

      <main className="stage">
        <div className={`world ${view === "city" ? "" : "behind"}`} ref={hostRef} aria-hidden={view !== "city"} />

        {view !== "city" && (
          <div className="overlay">
            {view === "operations" && <Operations state={state} onSelectTask={(id) => setSelected(state.tasks.get(id)?.owner ?? null)} />}
            {view === "neural" && <NeuralMap state={state} onSelectAgent={setSelected} />}
            {view === "release" && <ReleaseTower state={state} />}
            {view === "genesis" && <GenesisFoundry state={state} />}
          </div>
        )}

        {selected && <Inspector state={state} agentId={selected} onClose={() => setSelected(null)} />}
      </main>

      <footer className="ticker" aria-live="polite" aria-label="Activity">
        {error && <p className="fail">{error}</p>}
        {state.objective && (
          <p className="objective-line">
            <strong>{state.objective}</strong>
            {state.mode === "rehearsal" && (
              <span className="subtle">
                {" "}
                · rehearsal: no model performed this work, and the release gate will block accordingly
              </span>
            )}
          </p>
        )}
        {refusals.length > 0 && (
          <p className="fail">
            renderer refused to draw {refusals.length} entity(ies) with no backing event: {refusals.map((r) => `${r.kind} ${r.id}`).join(", ")}
          </p>
        )}
        <ol className="log">
          {ticker.map((e) => (
            <li key={e.id} className={`sev-${e.severity}`}>
              {describeEvent(e)}
            </li>
          ))}
        </ol>
        {ticker.length === 0 && (
          <p className="subtle">
            Nothing is happening, and nothing is being drawn as if it were. Commission an objective to start a run.
          </p>
        )}
      </footer>
    </div>
  );
}
