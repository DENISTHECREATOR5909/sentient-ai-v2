# AI Microsite Architect — instruction set

Three independent director prompts for a 100% automated, multi-agent microsite assembly line.
They share no context. They interoperate only through the typed packet contracts defined in
`MASTER_PROMPT.md` §3.3.

| File | Model | Role |
|------|-------|------|
| `MASTER_PROMPT.md` | Claude | Orchestrator — research, strategy, validation, optimization, scaling, learning |
| `CONTENT_DIRECTOR_PROMPT.md` | ChatGPT | Templates and page copy, semantic variation, anti-slop |
| `MONITORING_DIRECTOR_PROMPT.md` | Grok | Real-time KPI monitoring, alerting, pre-approved healing |

## How to run it
1. Open `MASTER_PROMPT.md`, fill the two inputs in §0.1 (`GEO`, `CATEGORY`), and paste everything
   between the `BEGIN PROMPT` / `END PROMPT` markers into a fresh Claude session.
2. Answer the tool permission table in §2 with `Accept` / `Do not accept` per row. Declining a
   tool is allowed; the prompt states the fallback and the confidence penalty for each.
3. Claude returns the Phase 1 packet and stops at `DECISION REQUIRED`. Nothing proceeds without
   your `Accept`.
4. When Phase 2 starts, hand the Designer packets to a ChatGPT session running
   `CONTENT_DIRECTOR_PROMPT.md`, and stand up the Grok session on
   `MONITORING_DIRECTOR_PROMPT.md` once the first sites go live.

## The five gates that make this different from a content farm
- **Deterministic rejection.** Two failed criteria, or one compliance failure, rejects a site.
  There is no waiver path short of a revised Quality Control Framework you approve.
- **Separation of duties.** The Validator never shares a session with the Builder that made the
  site. Rejected sites are rebuilt by a different team.
- **Bayesian team reliability.** Each Build Team carries a Beta(8,2) reliability score updated per
  site. Below 0.7 loses parallel allocation; below 0.5 is retired.
- **Proof before shipping.** No change ships unless the posterior probability that it beats
  control is ≥ 0.95, at a sample size fixed before the test. No early stopping.
- **Compliance as an expected-value constraint.** Doorway pages, spun content, fabricated reviews
  and fake business data are prohibited because a scaled-content penalty takes the whole portfolio
  down at once. The gate protects the asset, and it is tracked as assumption A-3.

## Where the numbers live
Every estimate the system emits carries a 90% interval. The probability models — Profit
Probability Score, Beta-Binomial conversion priors, team reliability, and the proof-of-lift test
— are specified in `MASTER_PROMPT.md` §6. Assumptions and what would falsify them are in §7.
