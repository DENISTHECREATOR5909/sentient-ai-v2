# The Genesis Foundry

The most original part of the system, and the one most easily ruined by enthusiasm.

Visually: a hybrid of a neonatal ward, an android assembly facility, an R&D genetics lab, a
character-creation screen and a corporate onboarding centre. Transparent incubators, assembly
rails, evaluation chambers, and a door that occasionally opens onto a new colleague.

Underneath the theatre is a strict admissions process that assumes **most candidates should
not be admitted**.

---

## Why it is gated four times

The obvious design — notice a gap, create an agent — reproduces a documented failure mode:
orchestrators spawning dozens of agents for simple jobs, agents duplicating one another's
work, and coordination complexity expanding faster than capability. The fix is explicit
delegation boundaries and scaling agent count to demonstrated complexity.

So the Foundry can look continuously alive without the roster growing without bound. Incubators
always hold candidates being designed and evaluated. Very few of them leave.

```
                    CAPABILITY GAP  (measured, not felt)
                            │
                            ▼
                     GENOME DRAFTED
                            │
                            ▼
                     NECESSITY GATE
                       ╱          ╲
                    FAIL          PASS
                     │              │
              reuse a resident      ▼
                              SANDBOX INCUBATOR
                                    │
                                    ▼
                            COMPETENCY TRIALS
                              ╱           ╲
                            fail          pass
                             │              │
                          revise            ▼
                                    ADVERSARIAL REVIEW
                                  ARGUS · AEGIS · NYX
                                    (any one can refuse)
                                           │
                                           ▼
                                     CITIZENSHIP
                                    (probationary)
                                           │
                                           ▼
                                   FIRST REAL TASK
                                           │
                      ┌────────────────────┼────────────────┐
                      ▼                    ▼                ▼
                  exceptional           useful            poor
                      │                    │                │
                      ▼                    ▼                ▼
                  resident          reusable template     retire
```

## 1 · The gap is measured

Atlas does not ask "would more agents be better". It asks whether the organization lacks a
sufficiently specialized capability for a *recurring, high-value* responsibility — and it
answers from the failure history of a run that actually happened.

`Task.failureHistory` keeps every failed verdict permanently, including ones a later passing
retest superseded. Without it the evidence of what a run *cost* disappears the moment the
repair succeeds, and the Foundry would be reasoning about a run in which nothing ever went
wrong.

Recurrence counts distinct **problem areas**, not tasks: one task failing four different
checks is four recurrences of one competency gap; four tasks failing the same check once each
is the same gap seen four times. Both count. One check failing once does not.

```
CAPABILITY GAP
  Domain:          GPU/WebGL performance
  Current owners:  rune, flux
  Observed:
    - frontend:performance_benchmark — p95 frame time 26.4ms against a 16.7ms budget
    - motion:performance_benchmark   — layout thrash on every scroll frame
    - integration:performance_benchmark — initial payload 412KB against a 250KB budget
  Recurrence:      3 areas
  Overhead:        35%
  Recommendation:  CREATE SPECIALIST CANDIDATE
```

## 2 · The genome

The candidate's entire specification — there is nothing else to it. See
[`../agents/genomes/candidate-rendering-031.yaml`](../agents/genomes/candidate-rendering-031.yaml)
for the worked example.

It carries a name, avatar seed, personality profile, department, office bay, memory namespace,
tool envelope, mentor, evaluation rubric and output contract.

Two things are enforced at drafting time and cannot be negotiated later:

- **The envelope is narrower than the mentor's**, and every irreversible tool the candidate
  asked for is stripped. Capability is earned through a career record, never granted at birth.
- **`release_authority: false`.** Always. There is exactly one release authority and it is not
  a probationary agent.

Drafting is deterministic from the specification: the same candidate always produces the same
avatar and the same bay, so an admission is reproducible and a refusal is diagnosable.

## 3 · The necessity gate

The default answer is **no**. It refuses when:

- the gap recurred in fewer than three areas — *that is a task, not a role*;
- overhead is under 20% — the gap is annoying, not structural;
- an existing resident already holds authority over the domain and was not among the
  struggling owners — reuse them;
- the gap was asserted with no recorded observations — a gap without evidence is not a gap.

In practice this refuses most detected gaps outright, which is the point.

## 4 · Competency trials

Trials run against the genome's own `evaluation_suite`, deterministic from the specification.
Passing every trial is **necessary and not sufficient**.

## 5 · Adversarial review

Three independent reviewers, each of whom can refuse alone:

- **Argus** — is the output contract rich enough to verify against? Does each declared
  expertise have a corresponding trial?
- **Aegis** — does the requested envelope contain a denied tool? Is any irreversible action
  reachable? Could the candidate write to work it would be judging?
- **Nyx** — does this duplicate an existing resident's authority? Was the gap measured or
  asserted?

A single unresolved finding blocks citizenship.

## 6 · The ceremony

When and only when admissions clears, the door opens:

```
┌──────────────────────────────────────────────┐
│            NEW INTELLIGENCE ONLINE           │
├──────────────────────────────────────────────┤
│ VANTA                                        │
│ Diagnose and optimize real-time rendering    │
│                                              │
│ Assigned:    performance-lab                 │
│ Mentor:      flux                            │
│ Workspace:   Bay P-07                        │
│ Trial score: Passed                          │
│ Permissions: engineering / non-production    │
│ Status:      Probationary Resident           │
└──────────────────────────────────────────────┘
```

Vanta steps out. Flux arrives to meet it. Atlas sends its first task, and you watch the
assignment travel across the city.

Every frame of that is driven by `genesis.citizenship` — the same event that put the agent in
the registry. The animation cannot run early, because there is nothing to animate until the
decision exists.

## 7 · Disposition, and evolution

After the first real assignment:

| Outcome | Disposition |
| --- | --- |
| Clean first pass, no failed verdicts | **Resident** |
| Useful but needed repair cycles | **Reusable template** — the specification is kept, the instance is not |
| More failures than passes, or any critical regression | **Retired** |

Then the career record takes over, and every number in it is derived from recorded outcomes —
nothing is self-assigned, and there is no field an agent can write to:

```
VANTA

Assignments completed:      47
Verified first-pass rate:   93%
Critical regressions:       0
Review overturn rate:       3%
Mean repair cycles:         0.11

Specializations earned:
  ✓ WebGPU
  ✓ shader optimization
  ✓ animation profiling

Current rank:
  Principal

Promotion candidacy:
  Department Head
```

An agent that repeatedly fails is narrowed, reconfigured, or retired — `CareerLedger` raises
the concern by itself. An agent whose verdicts keep getting overturned has its judgement
flagged, because being trusted to judge is also a measured competency. An agent that
repeatedly discovers a new discipline can become the parent of a new department.

That is what turns the "baby agent factory" from a visual gimmick into organizational
evolution: **the org chart is downstream of measured outcomes.**

## Watching it happen

Births are genuinely uncommon — roughly one run in eight, and only when something really did
go wrong repeatedly in one domain:

```bash
npm run foundry -- --seed alpha --rehearsal "Build a checkout flow that never loses a customer's work"
```

Most seeds produce a gap, a genome, a refusal, and a clear statement of why.
