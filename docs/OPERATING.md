# Operating the Foundry

## Install and verify

```bash
npm install
npm run typecheck     # tsc --build across every package
npm test              # 154 tests: the constitution, the gates, and the refusals
npm run contracts:check   # role contracts still match the enforced roster
```

## Two execution modes

| | **Live** | **Rehearsal** |
| --- | --- | --- |
| When | `ANTHROPIC_API_KEY` (or `ANTHROPIC_AUTH_TOKEN`) is set | No credential present, or `--rehearsal` |
| Who does the work | Claude Opus 5 / Sonnet 5 / Haiku 4.5 | A deterministic offline executor |
| Release outcome | Whatever the gates decide | **Always blocked** |

A rehearsal runs the entire organization — the task graph, the swarm fan-out, the repair loop,
the council, the Genesis Foundry, the gate matrix — without a single model call, deterministic
from a seed so a run is reproducible and a failure is diagnosable.

What it will not do is pretend. It declares a capability degradation on its first act, and
`capability_route` blocks the release with every other gate passing on merit. That is
Article 8 working, not a limitation to route around: **a rehearsal demonstrates the
organization; it does not produce a releasable result.**

## The CLI

```bash
npm run foundry -- "Build a checkout flow that never loses a customer's work"

  --seed <s>           deterministic seed (default: foundry)
  --defect-rate <0-1>  rehearsal defect injection rate (default: 0.45)
  --rehearsal          force the offline executor even with a key present
  --grant <tool>       authorize an irreversible tool for this run (repeatable)
  --trace <file>       write OpenTelemetry-shaped GenAI spans as NDJSON
  --careers            print career records at the end
  -v, --verbose        include movement, state and message events
  -q, --quiet          print only the manifest
```

Exit code is **0 only when the release is approved**. A blocked gate exits `1`, so CI cannot
read it as a pass.

```bash
# Watch the repair loop work hard
npm run foundry -- --rehearsal --defect-rate 1 -v "Ship a booking flow that never double-charges"

# A seed that produces an agent birth
npm run foundry -- --rehearsal --seed alpha "Build a checkout flow that never loses a customer's work"
```

## The city

```bash
npm run city      # builds the UI, then serves it with the event bridge
open http://127.0.0.1:4173
```

Type an objective, press **Commission**, and watch. Or drive it by hand:

```bash
curl -XPOST localhost:4173/api/sessions \
  -H 'content-type: application/json' \
  -d '{"objective":"Build a checkout flow that never loses a customer'\''s work","paceMs":120}'

curl localhost:4173/api/sessions/session-001/manifest
```

| Endpoint | |
| --- | --- |
| `GET /api/world` | Districts and the resident roster |
| `POST /api/sessions` | Start a run |
| `GET /api/sessions/:id` | Snapshot: state, mode, executor, operations counts |
| `GET /api/sessions/:id/events?since=N` | Journal replay |
| `GET /api/sessions/:id/manifest` | The release manifest, structured and rendered |
| `WS /stream?session=:id&since=N` | Live event stream |

For UI development, `npm run -w @agent-city/ui dev` runs Vite on `:5173` proxying to the
bridge on `:4173`.

## Reading a run

```
17:35  ▶ RUN      objective "…" (rehearsal)
17:35  ⚠ DEGRADED maximum-capability execution: … it does not produce a releasable result
17:35  ATLAS      3 success criteria, 2 risks, 2 uncertainties
17:35  ROUTE      research-cstl → verity via claude-sonnet-5 · effort high (16 workers)
17:35  SWARM+     swarm-001 12 workers — "Establish the evidence base"
17:35  CONFLICT   swarm-001 — branch 4: confidence 0.53, insufficient for a load-bearing claim
17:35  FAIL       research-cstl · adversarial_review — the happy path assumes …
17:35  REPAIR     research-cstl cycle 1 — the happy path assumes …
17:35  PASS       research-cstl · adversarial_review (nyx)
17:35  GATE       capability_route = FAIL (atlas) — maximum-capability route unavailable: …
17:35  ⛔ RELEASE BLOCKED — capability_route
```

Things worth noticing:

- The swarm spawned **12** workers, not 16. Routing selected the 16-investigator
  configuration and then clamped to the branches that actually existed — four idle
  investigators would duplicate work rather than add coverage.
- A contradiction was surfaced, not averaged away, and had to be **resolved by a superseding
  claim** before `evidence_completeness` would pass.
- The failure went back to its owner and was retested. The owner sees one handoff.
- Nine gates passed on merit. One blocked, honestly.

## Extending it

| To add | Where | And |
| --- | --- | --- |
| A resident | `packages/core/src/residents.ts` | run `npm run contracts`; the roster tests enforce Article 6 for you |
| A release gate | `packages/core/src/gates.ts` | it must be able to return `unknown`, and `unknown` must block |
| An article | `packages/core/src/constitution.ts` **and** `CLAUDE.md` | a test keeps the two in step; name a real enforcement site |
| A plan stage | `packages/runtime/src/plan.ts` | name the verifier for every criterion at plan time |
| An executor | implement `Executor` | if it cannot do the work at the requested capability, **say so** — the degradation ledger is the honest path |

## The one thing not to do

Do not add a flag that lets a run report success it did not earn. Not `--force`, not
`--skip-gates`, not a rehearsal mode that releases. Every guarantee in this system rests on the
release process being unable to pretend, and `evals/trials.ts` will tell you exactly what
breaks if you remove one.
