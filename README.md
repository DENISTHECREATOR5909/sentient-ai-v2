# Agent City

**A multi-agent production operating system whose internal life is rendered as a living
isometric world.** The platform is Agent City; the organization inside it is **The Foundry**;
the model stack is Claude.

Not a chatbot dressed up as a game. The world and the production system are the same system
viewed from two directions — the orchestrator and the renderer consume one event stream, so
what you see on screen cannot drift from what is actually happening.

```bash
npm install
npm run foundry -- "Build a checkout flow that never loses a customer's work"   # headless
npm run city                                                                     # the world
```

---

## The idea

Fifteen residents with names, identities, districts, tool envelopes, private memory and
measured career records. Beneath them, ephemeral workers created for one bounded problem and
released when it is answered. Above them, **you** — as owner, not as project manager for every
routine decision.

The organization decomposes an objective into a dependency-aware task graph, routes each piece
to the Claude capability that piece actually justifies, builds it, and then refuses to call it
done until independent verifiers say so. When something fails, the artifact goes back to its
owner and the avatar physically walks back to the Engineering Foundry — because the event that
changed the task state is the same event that moved the sprite.

## The governing principles

**Maximum potential means maximum useful intelligence, not maximum agent count.** A typography
decision does not launch 1,024 agents. Worker count is earned from measured decomposability,
and an allocation that would produce duplicated work is refused outright.

**Agents may fail. The release process may not pretend they succeeded.** No prompt makes a
system incapable of error, so the guarantee lives in the gate rather than in a personality:
completion needs independent verdicts, a claim needs a resolvable evidence pointer, a builder
never judges its own work, and an unreported gate blocks.

**The organization may degrade in execution. It may never silently degrade its definition of
success.** Run it with no API key and the whole machine works — task graph, 12-investigator
research swarm, repair loop, adversarial council, Genesis Foundry — and the release is
**blocked**, with nine gates passing on merit and one saying plainly that no model performed
the work.

**The city is never theater.** Every drawn entity names the runtime entity it depicts. The
renderer refuses to draw anything an event has not grounded, and says so in the interface. A
gap in the event sequence is reported, never interpolated across.

## What is here

| | |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | The Quality Constitution — ten articles, each with an enforcement site in code |
| [`packages/core`](packages/core) | Domain law: events, task graph, permissions, evidence, gates, genesis, careers, routing. Zero dependencies |
| [`packages/runtime`](packages/runtime) | Atlas's orchestrator, the Research Cloud, worktree isolation, the repair loop, the Genesis Foundry |
| [`packages/server`](packages/server) | The event-stream bridge and the headless CLI |
| [`apps/city`](apps/city) | The world: React shell for reading, PixiJS for 15 districts and everyone in them |
| [`agents`](agents/README.md) | Generated role contracts, and a worked agent genome |
| [`evals`](evals) | Competency trials — every one asserts a *refusal* |
| [`docs`](docs/ARCHITECTURE.md) | Architecture · [Genesis](docs/GENESIS.md) · [Operating](docs/OPERATING.md) |

## The capability stack

| Work | Route |
| --- | --- |
| Orchestration, architecture, hard synthesis, release adjudication | **Claude Opus 5** · adaptive thinking · effort `xhigh` |
| Deep research, independent hypothesis search | **Research Cloud** — 4 or 16 **Sonnet 5** investigators, Opus 5 lead |
| Bounded implementation, design, verification | **Claude Sonnet 5** in an isolated worktree |
| Mechanical extraction, indexing, high-volume fan-out | **Claude Haiku 4.5** |

Routing is a reasoning step with a budget and a refusal, not a default.

## The residents

| | | |
| --- | --- | --- |
| **Atlas** Command Spire | **Verity** Observatory | **Nova** Strategy Chamber |
| **Sol** · **Iris** Design Atelier | **Kinetic** Motion Studio | **Rune** Engineering Foundry |
| **Vector** Systems Foundry | **Aegis** Security Citadel | **Argus** Verification Arena |
| **Flux** Performance Lab | **Mercy** Civic Hall | **Nyx** Red Team Annex |
| **Mnemos** Great Archive | **Pax** Release Tower | *…and whoever the Genesis Foundry admits* |

Argus, Nyx, Aegis, Mercy and Flux form the **Adversarial Quality Council**: any one of them can
block a release alone. None can approve one — that is Pax's, and only against a complete
evidence manifest.

## A run, honestly reported

```
GATE MATRIX
  ✔ functional               PASS   argus    cleared 9 check(s)
  ✔ security                 PASS   aegis    cleared 4 check(s)
  ✔ accessibility            PASS   mercy    cleared 5 check(s)
  ✔ performance              PASS   flux     cleared 4 check(s)
  ✔ adversarial              PASS   nyx      cleared 5 check(s)
  ✔ task_completion          PASS   atlas    10 task(s) complete
  ✔ evidence_completeness    PASS   pax      41 verified and 12 sourced claim(s)
  ✔ provenance               PASS   mnemos   58 claim(s) archived with provenance
  ✘ capability_route         FAIL   atlas    maximum-capability route unavailable
  ✔ constitutional_integrity PASS   pax      no violations recorded

OUTSTANDING
  - maximum-capability execution: no work in this run was performed by a model;
    the run demonstrates the organization, it does not produce a releasable result

RELEASE STATUS: BLOCKED
```

That is the system working.
