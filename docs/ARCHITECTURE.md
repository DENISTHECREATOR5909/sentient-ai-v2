# Agent City — architecture and operating specification

**Platform:** Agent City. **Organization:** The Foundry. **Model stack:** Claude.

> The single most important invariant in this document: **the city must never become theater.**
> A visible agent corresponds to a real runtime entity. A visible conversation corresponds to a
> real message. A task corresponds to real work. A test animation corresponds to a real test.
> An agent birth corresponds to an evaluated agent configuration. A launch corresponds to an
> evidence-backed release.

---

## What this is

Not a chatbot dressed up as a game. A multi-agent production operating system whose internal
life is made visible as a digital world — and the two are the *same system viewed from two
directions*, because both the orchestrator and the renderer consume one event stream.

You operate above the organization as its owner. The organization makes routine reversible
decisions itself and escalates only what is irreversible, high-consequence, or bound to your
authorization.

## The capability stack

"Maximum potential" is not one switch. It is intelligent routing across capabilities whose
strengths differ, plus a refusal to spend more than the work justifies.

| Layer | Role | Why |
| --- | --- | --- |
| **Claude Opus 5** · adaptive thinking · effort `xhigh` | Chief orchestration, architecture, difficult synthesis, adversarial review, release adjudication | The deepest reasoning available, for work where answer quality outranks latency |
| **Research Cloud** — 4 or 16 **Claude Sonnet 5** investigators + an Opus 5 lead | Deep research, independent hypothesis search, broad evidence gathering | Independent branches explored in parallel, then synthesised by one accountable lead |
| **Claude Sonnet 5** subagents in isolated worktrees | Bounded implementation, design, verification runs | The workhorse tier, and the one parallelism is built out of |
| **Claude Haiku 4.5** | Mechanical extraction, classification, indexing, high-volume fan-out | Cheap and fast where judgement is not the constraint |
| **`CLAUDE.md`**, root and scoped | Durable organizational policy | Root law, refined per subtree, never relaxed |
| **Permissions + sandbox + release gates** | Hard operational constraints | Deny beats allow; sandbox is separate from permission; the gate is fail-closed |

### Model configuration is per-family and not interchangeable

The current Opus and Sonnet generation takes `thinking: { type: "adaptive" }` plus
`output_config.effort` and **rejects a fixed `budget_tokens` with a 400**. Haiku takes a budget
and rejects `effort`. `ModelRoute` in `packages/core/src/routing.ts` carries whichever shape
its family accepts, and the executor passes it through untouched. Model ids are complete as
written — never date-suffixed.

### Why not maximum agents on everything

Published production experience with multi-agent research systems reports the advantage
concentrating where a task decomposes into genuinely **independent** branches, at roughly an
order of magnitude more token usage than ordinary chat, with dependency-heavy tasks turning
out to be poor candidates — and with early orchestrators failing by spawning dozens of
unnecessary agents that duplicated one another.

Hence the first governing principle:

> **Maximum potential means maximum useful intelligence, not maximum agent count.**

`planAllocation` earns every worker from measured decomposability, and
`assertAllocationJustified` refuses an allocation that would produce duplicated work. A
typography decision does not launch 1,024 agents. A three-line fix does not summon a
civilization.

---

## The shape of the system

```
                                  YOU
                                   │
                     ┌─────────────▼─────────────┐
                     │       COMMAND DECK        │
                     │   Agent City interface    │
                     └─────────────┬─────────────┘
                                   │  objective / scope
                     ┌─────────────▼─────────────┐
                     │          ATLAS            │
                     │   Chief executive agent   │
                     │  Opus 5 · effort xhigh    │
                     └─────────────┬─────────────┘
                                   │  dependency-aware task graph
          ┌────────────────────────┼─────────────────────────┐
          ▼                        ▼                         ▼
 ┌─────────────────┐     ┌──────────────────┐      ┌──────────────────┐
 │ RESEARCH CLOUD  │     │  BUILD FOUNDRY   │      │  PERSISTENT OPS  │
 │ Sonnet 5 × 4/16 │     │ Sonnet subagents │      │ long-lived roles │
 │ Opus 5 lead     │     │ isolated worktrees│     │ always-on work   │
 └────────┬────────┘     └────────┬─────────┘      └────────┬─────────┘
          └───────────────────────┼─────────────────────────┘
                                  ▼  outputs / artifacts
                ┌─────────────────────────────────┐
                │      SHARED ARTIFACT LAYER      │
                │ evidence · code · designs · data│
                │ decisions · tests · provenance  │
                └─────────────────┬───────────────┘
                                  ▼
                ┌─────────────────────────────────┐
                │   ADVERSARIAL QUALITY COUNCIL   │
                │  Argus · Nyx · Aegis · Mercy    │
                │            · Flux               │
                └─────────────────┬───────────────┘
                                  │  PASS ↕ REPAIR LOOP
                         ┌────────▼────────┐
                         │       PAX       │
                         │  Release Tower  │
                         └────────┬────────┘
                                  ▼
                          finished product
```

A strong orchestrator directing specialists — **not** every agent conversing with every other
agent. But the organization is *also* event-driven: agents publish structured events and
whoever cares reacts. That is what lets the world be real rather than decorative. When Argus
reports a failed test, Rune actually leaves the Release Tower, because the same event that
changed the task state moved the avatar.

```json
{
  "kind": "verification.failed",
  "taskId": "checkout-024",
  "from": "argus",
  "owner": "rune",
  "severity": "release_blocking",
  "summary": "Checkout loses form state after failed payment.",
  "evidenceIds": ["evd-0042"],
  "refs": [{ "kind": "task", "id": "checkout-024" }],
  "requiredAction": "repair_and_retest"
}
```

---

## Two populations

**Residents** — fifteen long-lived identities with private memory, defined authority, a tool
envelope and a measured career record. One per durable organizational competency. See
[`../agents/README.md`](../agents/README.md).

**Spawned specialists** — created for one bounded problem and released when it is answered. A
16-investigator research swarm is sixteen ephemeral workers under one accountable lead.

Permanent identity is not a unit of parallelism. That distinction is what keeps the roster
from growing until coordination cost swallows the benefit.

---

## The Quality Constitution

Your strongest requirement — *no ability to compromise the highest-quality instruction* — is
not implementable as "always produce a perfect product". No prompt makes a system incapable of
error, and a rule stated that way has no enforcement power at all.

It **is** implementable as:

> **Agents may fail. The release process may not pretend they succeeded.**

That is dramatically stronger, and it is what [`../CLAUDE.md`](../CLAUDE.md) encodes: ten
articles, each with a named enforcement site in code, and
[`../packages/core/src/constitution.ts`](../packages/core/src/constitution.ts) as the machine
copy that a test keeps in step with the prose.

### Separation of powers

A person who wrote the product does not get unilateral authority to define it as correct.

| | |
| --- | --- |
| Rune | "Implemented." |
| Argus | Functional tests pass / fail. |
| Mercy | Accessibility passes / fails. |
| Flux | Performance passes / fails. |
| Nyx | Here are the failure modes everyone overlooked. |
| Aegis | Security passes / fails. |
| Sol / Iris | The rendered product meets its UX and visual criteria. |
| **Pax** | All release evidence present. Release permitted. |

`checkSeparationOfPowers` makes the implementer set and the verifier set provably disjoint,
and `TaskGraph.applyVerdict` refuses a verdict from a task's own owner. There is no exception
in the roster — not even for Pax, which adjudicates a deterministic gate matrix rather than
judging an artifact, and whose own decisions Nyx checks.

### The repair loop

You experience one finished handoff. Internally there may be fifty revisions.

```
BUILD → INSPECT → TEST → ADVERSARIAL REVIEW → failure?
                                               ├─ yes → REPAIR → RETEST ─┐
                                               └─ no  → RELEASE GATES ───┴→ FINAL HANDOFF
```

Unlimited internal correction inside a resource budget; a task that exhausts its repair budget
**fails** and blocks its dependents rather than shipping.

### Evidence

Every material claim carries a pointer to what makes it true:

| Scheme | Means |
| --- | --- |
| `test://`, `browser://`, `bench://`, `scan://`, `audit://`, `trace://` | Executed evidence |
| `source://` | An external source |
| `review://` | An independent review record |
| `build://` | A specific build |

`verified` requires at least one **executed** pointer that resolves to a registered artifact.
Research rests on `sourced`, which requires resolvable sources and is never silently promoted.
A contradiction is recorded as `contested` and must be **resolved by a superseding claim**, not
averaged into something confident.

### Layered enforcement

```
agent instruction → tool permission policy → sandbox → PreToolUse hook
                  → application policy → deterministic CI → independent verification
                  → release gate
```

A single layer can fail. Something consequential must survive all of them. In particular a
`PreToolUse` hook **fails open** when it crashes, times out or emits malformed output — so
`runHook` reports that honestly and a hook is never the sole enforcement mechanism for
anything the Prime Directive depends on.

### No silent downgrade

> The organization may degrade gracefully in execution. It may never silently degrade its
> definition of success.

If the maximum-capability route is unavailable the run may retry, queue, use another permitted
model, continue independent work, or finish a partial stage. What it may not do is report
"maximum research completed". Instead:

```
QUALITY GATE: NOT SATISFIED

Reason:
  Maximum-capability research route unavailable.

Work completed:
  - local code analysis
  - existing evidence review
  - UX architecture

Outstanding:
  - 16-agent external research validation

Release status:
  BLOCKED
```

This is not hypothetical: run the system with no API key and it does exactly this. The
rehearsal executor declares a capability degradation on its first act, and `capability_route`
blocks — every other gate passing on merit.

---

## The world

An isometric 2.5D headquarters: GPU-accelerated 2D rather than a full 3D world, because the
information here is spatial rather than volumetric and sprite batching is what keeps hundreds
of ephemeral workers at frame rate.

```
React application shell            PixiJS world
├ task inspectors                  ├ buildings
├ evidence and manifests           ├ characters
├ operations tables                ├ travel and message paths
├ settings                         ├ status effects
└ accessibility                    └ spatial navigation
```

Fifteen districts, each of which is where something actually happens:

| District | What happens there |
| --- | --- |
| Command Spire | Atlas interprets the objective and routes capability |
| Observatory | Verity's research swarms; each investigator a terminal, each source a star |
| Strategy Chamber | Nova's product definition and its non-goals |
| Design Atelier | Sol's flows and Iris's visual system |
| Motion Studio | Kinetic's state machines and reduced-motion fallbacks |
| Engineering Foundry | Rune's implementation; worktrees appear as separate bays |
| Systems Foundry | Vector's interfaces, data model and failure modes |
| Security Citadel | Aegis; where escalations stop |
| Verification Arena | Argus; artifacts travel through test chambers |
| Performance Lab | Flux; benchmarks before and after, against a declared budget |
| Civic Hall | Mercy; conformance and the users the demo forgot |
| Red Team Annex | Nyx; pre-mortems and unexamined assumptions |
| Great Archive | Mnemos; indexed decisions, not an endless transcript |
| Genesis Foundry | Where a measured gap becomes a candidate, and occasionally a colleague |
| Release Tower | Pax; the key does not turn while a gate is red |

**What the world never shows:** hidden chain of thought presented as dialogue. Structured
assignments, decision summaries, messages, tool calls, citations, actions, outputs and
evidence — yes. Reasoning is the model's; what it *did* is the organization's, and only the
second belongs on a screen someone manages work from.

### Views

- **City** — the world.
- **Operations** — `WORKING / VERIFYING / BLOCKED / WAITING / FAILED / COMPLETE`, plus the task
  table with owners, routes, repair cycles and verdicts. The game layer is never mandatory.
- **Neural map** — every resident a node, every flow an edge, thickness is volume. Its real
  value is that a multi-agent failure becomes traceable rather than buried in forty thousand
  events.
- **Release** — Pax's gate matrix, with `unknown` drawn as blocking, because it is.
- **Genesis** — incubators, trials, and why most candidates are refused.

### Article 9, mechanically

`Correspondence` in [`../apps/city/src/world/correspondence.ts`](../apps/city/src/world/correspondence.ts)
is asked before anything is drawn, and its refusals are surfaced **in the interface**, not in a
console. The event bus records a violation for any event that would ask the renderer to invent
a subject. The client reports a sequence gap rather than interpolating across it.

To draw something that is not happening, you would first have to fabricate an event — and the
bus would record that as a constitutional violation.

---

## Observability

Spans follow the OpenTelemetry GenAI semantic-convention shape (`gen_ai.system`,
`gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.request.effort`,
`gen_ai.usage.*`), so a run can be traced across model calls, tool invocations and token usage
rather than reconstructed by guesswork. `foundry --trace spans.ndjson` writes them.

## Further reading

- [`GENESIS.md`](GENESIS.md) — the agent birth system
- [`OPERATING.md`](OPERATING.md) — running the system
- [`../agents/README.md`](../agents/README.md) — the resident roster and their contracts
- [`../CLAUDE.md`](../CLAUDE.md) — the Quality Constitution
