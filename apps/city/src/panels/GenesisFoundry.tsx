/**
 * The Genesis Foundry panel.
 *
 * Incubators, trials and the admissions decision — all of it read from events, so the door
 * on screen opens at exactly the moment a candidate actually cleared the gates, and never
 * otherwise. Most candidates never make it out, and the panel says why.
 */

import type { CityState } from "../state/store.js";

export function GenesisFoundry({ state }: { state: CityState }) {
  const candidates = [...state.genesis.values()];

  if (candidates.length === 0) {
    return (
      <div className="genesis">
        <h2>Genesis Foundry</h2>
        <p className="subtle">
          Incubators are cold. A candidate appears only when a measured capability gap justifies one — a
          gap that recurred across several areas at real cost, not a task that happened to be hard once.
        </p>
      </div>
    );
  }

  return (
    <div className="genesis">
      <h2>Genesis Foundry</h2>
      {candidates.map((c) => {
        const admitted = Boolean(c.agentId);
        return (
          <article key={c.genomeId} className={`incubator ${admitted ? "admitted" : ""}`}>
            <header>
              <h3>{c.name}</h3>
              <span className={`badge ${admitted ? "complete" : "blocked"}`}>{c.stage}</span>
            </header>
            <p className="mono subtle">{c.genomeId}</p>
            {c.mentor && (
              <p className="subtle">
                mentor {c.mentor} · {c.bay}
              </p>
            )}

            {c.trials.length > 0 && (
              <ul className="list">
                {c.trials.map((t) => (
                  <li key={t.trial}>
                    <span className={t.passed ? "pass" : "fail"}>{t.passed ? "✔" : "✘"}</span> {t.trial}{" "}
                    <span className="mono subtle">
                      {t.score.toFixed(2)} / {t.threshold.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {c.adversarial.length > 0 && (
              <ul className="list">
                {c.adversarial.map((a) => (
                  <li key={a.reviewer}>
                    <span className={a.passed ? "pass" : "fail"}>{a.passed ? "cleared" : "objected"}</span>{" "}
                    <span className="mono">{a.reviewer}</span>
                    {a.findings.length > 0 && <span> — {a.findings.join("; ")}</span>}
                  </li>
                ))}
              </ul>
            )}

            {c.rationale && <p className="detail">{c.rationale}</p>}
            {admitted && <p className="pass">NEW INTELLIGENCE ONLINE — {c.agentId}</p>}
          </article>
        );
      })}
    </div>
  );
}
