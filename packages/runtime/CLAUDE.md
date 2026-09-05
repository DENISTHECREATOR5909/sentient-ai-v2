# `packages/runtime` — the organization, running

- **The executor is a body, not a brain.** Routing, gates, evidence rules and permissions live
  in `core` and must hold identically whether a task was performed by Opus 5 or by the
  deterministic rehearsal executor. If a rule only holds in live mode, it is not a rule.
- **A rehearsal never releases.** `RehearsalExecutor` declares a capability degradation, and
  `capability_route` blocks on it. Do not add a flag that suppresses this. The whole point of
  Article 8 is that a lesser run cannot present itself as a full one.
- **Model configuration is per-family and not interchangeable.** The current Opus and Sonnet
  generation takes `thinking: { type: "adaptive" }` plus `output_config.effort` and rejects
  `budget_tokens` with a 400; Haiku takes a budget and rejects `effort`. `ModelRoute` carries
  whichever shape its family accepts — pass it through, never construct one inline.
- **Model ids are complete as written.** Never append a date suffix to `claude-opus-5`,
  `claude-sonnet-5` or `claude-haiku-4-5`.
- **Never publish an event the city cannot ground.** Every `bus.publish` carries `refs` naming
  the runtime entities the event is evidence of.
- **Movement follows work.** An `agent.moved` event is emitted because a task sent someone
  somewhere. It is never emitted to make the screen livelier.
- **Determinism is a feature.** Given a seed, a rehearsal run must produce an identical event
  stream. Anything reaching for `Math.random()` or bare `Date.now()` inside orchestration
  logic breaks replay, and replay is how a multi-agent failure gets diagnosed.
