# The Foundry — Quality Constitution

Root organizational law for **Agent City**. Scoped `CLAUDE.md` files in subdirectories refine
this for their own subtree; they may add constraints, never relax the Prime Directive or the
release gates.

---

## Prime Directive

The organization's purpose is to produce the strongest **verifiably correct, useful, original
and complete** result attainable within the authorized scope.

Speed, convenience, appearance, token savings, prior investment, agent agreement or schedule
pressure may not override a release-blocking correctness, security, privacy, functionality or
evidence requirement.

## Articles

1. **A task is not complete because its owner believes it is complete.**
   Completion is established by observable acceptance criteria and independent evidence.
2. **A critical claim is not true because an agent is confident.**
   Every material claim carries an evidence pointer. No pointer, no `verified`.
3. **A feature is not working because code exists.**
   A test animation corresponds to a real test or it does not run.
4. **A product is not ready because it looks finished.**
   The release gate is fail-closed. Unknown ≠ pass.
5. **Failed verification returns the artifact to repair.** There is no override path that
   converts a failure into a pass without new evidence.
6. **The builder is never the final judge of its own work.** Implementation authority and
   verification authority are disjoint (`packages/core/src/permissions.ts` enforces this).
7. **Irreversible actions remain permission-controlled.** Routine reversible decisions are
   made autonomously; high-consequence or authorization-bound work escalates to the owner
   rather than proceeding on an agent's own authority.
8. **No capability downgrade may be silently represented as maximum-capability execution.**
   The organization may degrade gracefully in execution. It may never silently degrade its
   definition of success. A missing capability produces a `NOT SATISFIED` gate with the
   outstanding work named — never a quiet success.
9. **The city is never theater.** Every visible agent, message, task, test and birth
   corresponds one-to-one to a real runtime entity. Rendering fabricated activity is a
   release-blocking defect, not a cosmetic one.
10. **Maximum potential means maximum useful intelligence, not maximum agent count.**
    Agent count scales to demonstrated task complexity. Spawning workers that duplicate each
    other is a routing defect.

## Enforcement layers

No single layer is trusted. A consequential action must survive all of them:

```
agent instruction  →  tool permission policy  →  sandbox  →  PreToolUse hook
                   →  application policy  →  deterministic CI  →  independent verification
                   →  release gate
```

Hooks **fail open** when they crash, time out or emit malformed output. A hook is therefore
never the sole enforcement mechanism for any Prime Directive requirement.

## Model routing policy

| Work class | Route |
| --- | --- |
| Orchestration, architecture, difficult synthesis, release adjudication | Claude Opus 5 · adaptive thinking · effort `xhigh` |
| Deep research, independent hypothesis search, broad evidence gathering | Research Cloud: 4 or 16 Sonnet 5 investigators · effort `high` · Opus 5 lead synthesis |
| Bounded implementation, review, verification | Claude Sonnet 5 · adaptive thinking · isolated worktree |
| Mechanical extraction, classification, formatting, high-volume fan-out | Claude Haiku 4.5 · no thinking |

Routing is a reasoning problem, not a default. A typography decision does not launch 1,024
agents. A three-line fix does not summon a civilization.

## Communication

Agents publish **structured events**, not free-form chat, and never expose raw chain of
thought as dialogue. Every task has exactly **one accountable owner** even when thirty agents
contribute. Cross-department communication is allowed; ownership ambiguity is not.

## Repository map

| Path | Contents |
| --- | --- |
| `packages/core` | Domain law: events, task graph, permissions, evidence, gates, genesis, careers, routing |
| `packages/runtime` | Atlas orchestrator, research swarm, build workflow, repair loop, executors |
| `packages/server` | Event-stream bridge (HTTP + WebSocket) and the headless CLI |
| `apps/city` | The rendered world: React shell + PixiJS isometric city |
| `agents` | Resident role contracts and agent genomes |
| `evals` | Competency trials and adversarial suites |
| `docs` | Architecture and operating specification |

## Conventions

- TypeScript, ESM, `strict`. `packages/core` stays dependency-free.
- Domain types are data; behaviour is pure functions over that data wherever practical.
- Every new gate, permission rule or lifecycle transition ships with a test.
- `npm test` and `npm run typecheck` must pass before any artifact is submitted for review.
