/**
 * Operations view.
 *
 * The game layer is never mandatory. Anyone managing a real production run should be able to
 * switch instantly to counts, states and blockers, and this is that view.
 */

import { operations, type CityState } from "../state/store.js";

const ORDER = ["working", "verifying", "blocked", "waiting", "failed", "complete"] as const;

export function Operations({ state, onSelectTask }: { state: CityState; onSelectTask: (id: string) => void }) {
  const counts = operations(state);
  const tasks = [...state.tasks.values()];

  return (
    <div className="ops">
      <div className="ops-counts">
        {ORDER.map((k) => (
          <div key={k} className={`ops-count ${k}`}>
            <span className="ops-n">{counts[k]}</span>
            <span className="ops-k">{k.toUpperCase()}</span>
          </div>
        ))}
      </div>

      <table className="ops-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Owner</th>
            <th>State</th>
            <th>Cycles</th>
            <th>Route</th>
            <th>Verdicts</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} onClick={() => onSelectTask(t.id)}>
              <td>
                {t.title}
                {t.waitingOn.length > 0 && <div className="subtle mono">waiting on {t.waitingOn.join(", ")}</div>}
                {t.blockedReason && <div className="fail">{t.blockedReason}</div>}
              </td>
              <td className="mono">{t.owner}</td>
              <td>
                <span className={`badge ${t.state}`}>{t.state}</span>
              </td>
              <td className="num">{t.cycles || ""}</td>
              <td className="mono subtle">{t.route ?? "—"}</td>
              <td>
                {t.verdicts.map((v) => (
                  <span key={v.method} className={v.passed ? "pip pass" : "pip fail"} title={`${v.verifier} · ${v.method}: ${v.summary}`}>
                    {v.verifier.slice(0, 2)}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
