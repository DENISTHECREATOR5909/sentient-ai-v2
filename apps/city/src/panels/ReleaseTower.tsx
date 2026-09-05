/**
 * The Release Tower.
 *
 * The gate matrix, exactly as Pax computed it. `unknown` is drawn as blocking, because it is:
 * a gate nobody reported is not a gate that passed.
 */

import type { CityState } from "../state/store.js";

export function ReleaseTower({ state }: { state: CityState }) {
  const gates = [...state.gates.entries()];
  const blocked = state.release?.decision === "blocked";

  return (
    <div className="release">
      {state.release ? (
        <h2 className={blocked ? "fail" : "pass"}>{blocked ? "QUALITY GATE: NOT SATISFIED" : "RELEASE APPROVED"}</h2>
      ) : (
        <h2 className="subtle">Awaiting the evidence manifest</h2>
      )}

      <table className="gates">
        <thead>
          <tr>
            <th>Gate</th>
            <th>Owner</th>
            <th>Status</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {gates.length === 0 && (
            <tr>
              <td colSpan={4} className="subtle">
                No gate has reported. Nothing here defaults to pass.
              </td>
            </tr>
          )}
          {gates.map(([id, g]) => (
            <tr key={id}>
              <td className="mono">{id}</td>
              <td className="mono subtle">{g.owner}</td>
              <td>
                <span className={`badge gate-${g.status}`}>{g.status}</span>
              </td>
              <td>{g.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {state.degradations.length > 0 && (
        <section>
          <h3 className="fail">Capability degradations</h3>
          <p className="subtle">
            The organization may degrade in execution. It may never silently degrade its definition of success.
          </p>
          <ul className="list">
            {state.degradations.map((d, i) => (
              <li key={i}>
                <strong>{d.capability}</strong> — {d.consequence}
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.release && state.release.outstanding.length > 0 && (
        <section>
          <h3>Outstanding</h3>
          <ul className="list">
            {state.release.outstanding.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </section>
      )}

      {state.violations.length > 0 && (
        <section>
          <h3 className="fail">Constitutional violations</h3>
          <ul className="list">
            {state.violations.map((v, i) => (
              <li key={i}>
                <span className="mono">{v.article}</span> on {v.subject} — {v.detail}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
