/**
 * The agent inspector.
 *
 * Structured assignments, decisions, messages, tool calls, evidence and artifacts — never raw
 * chain of thought presented as dialogue. What the model thought is the model's; what it did
 * is the organization's, and only the second belongs on a screen someone manages work from.
 */

import type { AgentView, CityState } from "../state/store.js";
import { RESIDENT_INDEX, type ResidentId } from "@agent-city/core";

export function Inspector({ state, agentId, onClose }: { state: CityState; agentId: string; onClose: () => void }) {
  const view: AgentView | undefined = state.agents.get(agentId);
  if (!view) return null;
  const resident = RESIDENT_INDEX.get(agentId as ResidentId);
  const task = view.taskId ? state.tasks.get(view.taskId) : null;
  const swarm = [...state.swarms.values()].find((s) => s.lead === agentId && !s.dissolved);
  const owned = [...state.tasks.values()].filter((t) => t.owner === agentId);
  const verdicts = [...state.tasks.values()].flatMap((t) =>
    t.verdicts.filter((v) => v.verifier === agentId).map((v) => ({ ...v, taskId: t.id })),
  );
  const born = state.genesis.get([...state.genesis.values()].find((g) => g.agentId === agentId)?.genomeId ?? "");

  return (
    <aside className="panel inspector" aria-label={`Inspector for ${agentId}`}>
      <header className="panel-head">
        <div>
          <h2>{resident?.name ?? view.detail?.split(" · ")[0] ?? agentId}</h2>
          <p className="subtle">{resident?.title ?? "Specialist agent · born in the Genesis Foundry"}</p>
        </div>
        <button className="ghost" onClick={onClose} aria-label="Close inspector">
          ✕
        </button>
      </header>

      <dl className="kv">
        <dt>Status</dt>
        <dd>
          <span className={`dot ${view.activity}`} /> {view.activity}
        </dd>
        <dt>Location</dt>
        <dd>{String(view.district)}</dd>
        {resident && (
          <>
            <dt>Model</dt>
            <dd>{resident.modelClass} tier</dd>
            <dt>Authority</dt>
            <dd>{resident.authority}</dd>
          </>
        )}
        {swarm && (
          <>
            <dt>Swarm</dt>
            <dd>
              {swarm.reported}/{swarm.workers} investigators reported · {swarm.sources} sources
            </dd>
          </>
        )}
        {task && (
          <>
            <dt>Task</dt>
            <dd>
              {task.title} <span className="subtle">({task.state})</span>
            </dd>
            <dt>Route</dt>
            <dd className="mono">{task.route ?? "—"}</dd>
          </>
        )}
      </dl>

      {view.detail && <p className="detail">{view.detail}</p>}

      {born && (
        <section>
          <h3>Origin</h3>
          <p className="subtle">
            Admitted through the Genesis Foundry · mentor {born.mentor} · {born.bay}
          </p>
          <ul className="list">
            {born.trials.map((t) => (
              <li key={t.trial}>
                <span className={t.passed ? "pass" : "fail"}>{t.passed ? "✔" : "✘"}</span> {t.trial}{" "}
                <span className="mono subtle">
                  {t.score.toFixed(2)}/{t.threshold.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resident && (
        <section>
          <h3>Output contract</h3>
          <ul className="list mono">
            {resident.outputContract.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
      )}

      {resident && resident.tools.deny.length > 0 && (
        <section>
          <h3>Denied tools</h3>
          <p className="subtle">Deny always beats allow. These cannot be granted for this run.</p>
          <ul className="list mono">
            {resident.tools.deny.map((t) => (
              <li key={t} className="fail">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {owned.length > 0 && (
        <section>
          <h3>Accountable for</h3>
          <ul className="list">
            {owned.map((t) => (
              <li key={t.id}>
                <span className={`badge ${t.state}`}>{t.state}</span> {t.title}
                {t.cycles > 0 && <span className="subtle"> · {t.cycles} repair cycle(s)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {verdicts.length > 0 && (
        <section>
          <h3>Verdicts rendered</h3>
          <ul className="list">
            {verdicts.map((v, i) => (
              <li key={`${v.taskId}-${v.method}-${i}`}>
                <span className={v.passed ? "pass" : "fail"}>{v.passed ? "PASS" : "FAIL"}</span>{" "}
                <span className="mono subtle">{v.method}</span> — {v.summary}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
