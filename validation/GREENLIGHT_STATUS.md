# AeroLoop — Greenlight Status

**Decision date:** 2026-07-17
**Scope of decision:** Proceed to build the **second interactive demo (Demo v2)**.

---

## EXECUTIVE DECISION

### 🟢 GO — to build Demo v2 (the narrowed, concierge-backed single-loop prototype)
### 🔶 NEEDS REFINEMENT — before a real commercial pilot or production launch

This split is deliberate and honest. The **design is strong enough to build against now** —
stronger than most seed-stage blueprints — so building Demo v2 is greenlit. But a real pilot
with real money and cross-border parts is **not** greenlit until three founder-owned gates are
closed. Building the demo does not require closing them; launching a pilot does.

---

## Why GO for the demo
- Vision is coherent; differentiation (advisory + privacy + created deals + outcome graph) is
  real and validated across tiers.
- The two hero screens and the single seller-side loop are fully specifiable today
  (PRODUCTION_BLUEPRINT.md).
- The demo's job is to prove the *experience and the "aha,"* which needs no first-party data
  and no regulatory clearance — concierge-seeded counterparties are acceptable and expected.

## Gates that remain OPEN for a real pilot (not the demo)
| # | Gate | Owner | Blocks |
|---|------|-------|--------|
| 1 | Anonymized ground-truth data (≈30–50 inventory, 10–20 requirements, 10–20 closed/dead deals w/ outcomes) | Founder | Scoring calibration, unit economics |
| 2 | Export-control (ITAR/EAR) + SUP liability review by qualified counsel | Counsel | Any cross-border close |
| 3 | Concrete liquidity plan (which part-family/niche is seeded first, and how) | Founder | Whether matches exist at all |
| 4 | Private-limit inference-resistance spec + test suite | Eng | Trust integrity of any real deal |
| 5 | Demo source review OR authorize fresh build | Founder | Reuse-vs-rebuild decision |

Gates 4 and 5 are addressed *inside* the Demo v2 build; Gates 1–3 are pilot prerequisites.

---

## The system this framework establishes (repeatable, going forward)
This validation is not a one-off. It is the **loop we run each design iteration**:

1. **Design / revise** a piece of the product.
2. **Run the 25 lenses** (directly, high-signal — not cargo-cult agent theater) to surface
   grounded concerns and conflicts.
3. **Resolve conflicts** to consensus or escalate (CONFLICT_RESOLUTION_LOG pattern).
4. **Refine the build spec** (PRODUCTION_BLUEPRINT).
5. **Greenlight** the next buildable increment; keep pilot gates visible.
6. **Build → observe → feed outcomes back** into the data graph, which re-grounds the next
   pass (this is what turns assumptions into validated facts over time).

The honesty rule that keeps the system elite: **every claim is labeled grounded or
assumption, and no green checkmark is issued on invented data.**

---

## Immediate next action (recommended)
**Build the Lovable prototype of the two hero screens** — Conversational Intake +
Interrogatable Decision Queue — with mocked advisor logic and a real deterministic gate stub.
This is the fastest way to make the design *felt* and to start the coach → refine → rebuild
loop toward the accepted product.

Founder decision required to proceed: **(a) Lovable prototype or in-repo build first?** and
**(b) which part-family** anchors the demo?
