# AI Microsite Architect — instruction set

Three independent agent prompts for a 100% automated, multi-agent microsite assembly line.
They share no context. They interoperate only through the typed packet contracts defined in
`MASTER_PROMPT.md` §3.3.

| File | Agent | Role |
|------|-------|------|
| `MASTER_PROMPT.md` | Claude | Orchestrator — strategy, copy, validation adjudication, optimization, scaling, learning |
| `BUILD_ENGINEER_PROMPT.md` | Codex | Build engineering — generator, templates, deploys, and the quality gates **as executable code** |
| `INTELLIGENCE_DIRECTOR_PROMPT.md` | Grok Heavy | Live intelligence (demand, SERP, competitors, search-policy watch) + real-time monitoring and alerting |

## Why the work is split this way
Each agent gets the job its architecture is actually good at, and the split is what makes the
quality claims enforceable rather than aspirational.

- **Codex works in a repository with a shell and version control.** So the Quality Control
  Framework is not a rubric a model eyeballs — it is check scripts in `/checks` that exit
  non-zero. Eleven of the fourteen criteria run identically on site 1 and site 100. Codex is
  forbidden from weakening a check to make a build pass, and that one rule is what gives every
  other number in this system meaning.
- **Grok Heavy has live access and parallel agents.** So it owns the two problems that are
  wide-and-shallow and need freshness: sweeping the whole portfolio for correlated anomalies,
  and establishing whether demand is real *this month*. Its findings carry source URLs,
  observation dates, and an agent-agreement ratio the Orchestrator weights directly.
- **Claude holds strategy, copy, and adjudication.** It writes the copy packets and entity
  files, runs the probability models, and judges the three things no script can settle: whether
  the prose helps a reader, whether a local fact is true, and whether a technical claim is
  correct.

## How to run it
1. Open `MASTER_PROMPT.md`, fill the two inputs in §0.1 (`GEO`, `CATEGORY`), and paste everything
   between the `BEGIN PROMPT` / `END PROMPT` markers into a fresh Claude session.
2. Answer the tool permission table in §2 with `Accept` / `Do not accept` per row. Declining a
   tool is allowed; the prompt states the fallback and the confidence penalty for each.
3. Claude returns the Phase 1 packet and stops at `DECISION REQUIRED`. Nothing proceeds without
   your `Accept`.
4. **Set up the Codex repo once.** Put sections A and B of `BUILD_ENGINEER_PROMPT.md` in the
   repository as `AGENTS.md` so every Codex task picks them up automatically. Build `/checks`
   first, before any site — the gates are the asset, the sites are the output. Each gate ships
   with one fixture that must pass and one that must fail.
5. **Stand up Grok Heavy early**, not at launch. Its demand-validation and SERP-check packets
   feed Phase 1 exclusion rules, so it earns its place before the first site exists.
6. From Phase 2 on, Claude issues site-build packets (§3.3) to Codex, one per branch, and
   adjudicates the returned gate reports.

## The five gates that make this different from a content farm
- **Deterministic rejection.** Two failed criteria, or one compliance failure, rejects a site.
  There is no waiver path short of a revised Quality Control Framework you approve.
- **Separation of duties.** The Validator never shares a session with the team that built the
  site, and sees the gate report rather than the branch. Rejected sites are rebuilt by a
  different team.
- **Bayesian team reliability.** Each Build Team carries a Beta(8,2) reliability score updated
  per site. Below 0.7 loses parallel allocation; below 0.5 is retired.
- **Proof before shipping.** No change ships unless the posterior probability that it beats
  control is ≥ 0.95, at a sample size fixed before the test. No early stopping.
- **Fabrication is structurally impossible, not merely forbidden.** Codex may use only the copy
  in `content_ref` and the local facts in `entities_ref`. A neighborhood, statistic, review, or
  credential that is not in the entity file fails the `entities` or `compliance` gate. Unknown
  values become `{{NEEDS_REAL_VALUE:field}}` tokens that cannot reach production.

## The portfolio-level risk, named
Doorway pages, spun content, fabricated reviews, and fake business data are prohibited here
because a scaled-content or site-reputation penalty takes **all** the sites down in one action.
That is tracked as assumption A-3 in `MASTER_PROMPT.md` §7, and it is the reason Grok Heavy's
search-policy watch escalates a corroborated policy change to portfolio P1 *before* any site has
moved. It is the one failure mode that cannot be fixed site-by-site after the fact.

## Where the numbers live
Every estimate the system emits carries a 90% interval. The probability models — Profit
Probability Score, Beta-Binomial conversion priors, team reliability, and the proof-of-lift test
— are specified in `MASTER_PROMPT.md` §6. Assumptions and what would falsify them are in §7.
