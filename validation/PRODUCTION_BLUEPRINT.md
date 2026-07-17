# AeroLoop — Production Blueprint (Demo v2 build spec)

**Purpose:** The design as *refined by the 25-lens validation* — reduced to a build-ready
specification for the **second interactive demo**. This supersedes the broad MVP scope where
the two conflict. It is the single source of truth for what we build next.

**North Star for Demo v2:** A pilot user drops in **one part** and, within minutes, the
advisor returns **one real, qualified, explained opportunity** — including a smart structural
recommendation (not just "lower your price") — protecting the user's private limit the whole
time. That single "aha" is the entire demo. Everything else is cut.

---

## 1. The wedge (what Demo v2 is)
- **One mission loop:** seller-side liquidation of **surplus / as-removed** material.
- **One part-family** (chosen with the founder for density — e.g., a common avionics or
  rotable family where demand is realistic).
- **Concierge-backed:** AeroLoop specialists may stand behind the advisor to supply/curate
  the counterparty side so the loop actually closes during the pilot (blueprint explicitly
  permits this).
- **Intake:** conversational + CSV/PDF/manual only. **No ERP, no payment rails, no mobile.**

## 2. The two hero screens (build these to a premium bar; stub the rest)
### A. Conversational Intake ("tell the advisor, don't fill a form")
- Advisor asks *only outcome-changing questions*, broker-style: "Only one, or more where it
  came from? Firm on trace, or open to an evaluation path if the money's right? What's your
  real floor — I'll never show it to anyone?"
- Builds the **Goal Contract** through dialogue; user can drop a single SKU as a test.
- Captures the **private minimum** into a segregated store, never displayed or approximated.

### B. Interrogatable Decision Queue ("calm on top, receipts on demand")
- Default card = **one number + one action + protected-items chips + estimated user time.**
- Expandable evidence drawer reveals: hard-gate pass/fail, compatibility dimensions,
  confidence, blockers, and *what changes the outcome*.
- **Anti-regret briefing:** before any introduction, the user can ask the advisor "why this
  buyer, what's the risk, show me deeper" and get a detailed, evidence-backed answer. Nothing
  irreversible from an ambiguous moment.
- **Two-directional advice:** the recommendation engine can say *raise price / hold / repackage*
  when market context supports it — not only "reduce."

## 3. Design decisions locked by validation
- **Promise = time-to-qualified-opportunity**, not "deal right away" (Conflict C-1).
- **Progressive disclosure** is mandatory: one number + one action by default; evidence
  behind a click (C-3).
- **Advisor Level 1–2 only**, approval-gated, positioned as leverage for the expert (C-4).
- **Scoring shown as high/med/low buckets + explanation**, never a bare magical number (C-5).
- **Per-item, range-based match thresholds** the user sets, with a **live count** of how many
  opportunities each threshold implies ("85%+ ≈ 3/wk; 75%+ ≈ 9/wk").
- **Notifications:** silent / digest / recommendation / opportunity / action / critical, with a
  user-tunable *voice/personality* dial. Meaningful only — no engagement pings.
- **Color/taxonomy:** demote two of six accents to shape/label; colorblind pass as a hard
  gate; unified confidence display grammar (C-3, Interaction Designer).

## 4. Engineering must-dos (non-negotiable, even in a demo)
- **Deterministic gate before the score.** A mandatory failure can never be averaged away.
- **No LLM in the enforcement path** for privacy, eligibility, fees, or identity unlock.
- **Private-limit inference resistance** as a first-class property: segregated encrypted
  store, query accounting, binning/noise, a "no directional leakage" invariant, and a
  dedicated test suite (Conflict C-7 — highest-severity item).
- **Event ledger** records every recommendation, permission, disclosure and state change from
  day one — this is the moat substrate.

## 5. The moat (corrected)
Not legal lock. The defensible position is the **outcome data graph** (every closed deal makes
the advisor smarter and stickier), **execution speed**, and **trade-secret scoring** — plus a
possible narrow utility patent on the *private-limit comparison method*, trademark, and
narrow, disclosed contractual protection (Conflict C-2).

## 6. Explicitly OUT of Demo v2
Native mobile, always-listening voice, ERP/accounting, autonomous negotiation, custody of
funds, public marketplace browsing, public star ratings, blockchain framing, full Trade Mesh,
decorative dashboards. (All per blueprint §67, plus the scope cut in Conflict C-8.)

## 7. Data model for the demo (minimum)
Six passports, versioned, each field carrying provenance/confidence/freshness/visibility:
Participant, Asset, Requirement, Goal Contract, Opportunity, Outcome. For Demo v2 the buyer
side may be concierge-seeded, but every object is real and auditable.

## 8. Regulatory guardrails present even in the demo
- Never imply airworthiness, installation eligibility, legal title, tax, or regulator
  acceptance. Verification ladder language (L0–L5) describes *scope of evidence*, not
  certification.
- Add a placeholder **export-screening step** in the eligibility flow (concierge-executed for
  the demo) so the real ITAR/EAR/SUP workstream has a home before pilot (Conflict C-6).

## 9. What "acceptance" looks like (demo success criteria)
- A user gives one part + a private floor, and the advisor returns a qualified opportunity
  with a structural recommendation, in minutes.
- The user can interrogate *why* and see the protected items that stayed hidden.
- The private minimum is provably never exposed or approximable.
- The user says a version of the blueprint's target line: *"It understood what I'd do,
  protected what I wouldn't expose, and brought me something I'd not have structured myself"* —
  and is willing to upgrade to a higher tier.

## 10. Build path options (choose one to start)
1. **Lovable prototype** (connected to this session): fastest way to a clickable, premium
   feel of the two hero screens with mocked advisor logic. Best for founder pressure-testing
   the *experience*. (Runs on your Lovable credits.)
2. **In-repo build** on the existing stack (TanStack/React per the migration note) with a real
   deterministic gate + inference-safe private-price stub. Best for a demo that's also the
   seed of the real product.

Recommendation: **start with the Lovable prototype of the two hero screens** to lock the
experience, then port the validated flow into the in-repo build with the real gate.
