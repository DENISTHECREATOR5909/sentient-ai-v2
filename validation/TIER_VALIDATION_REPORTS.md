# AeroLoop — 25-Lens Validation Reports

**Subject:** AeroLoop Master Product & Design Blueprint v2 (July 2026)
**Method:** All 25 specialist lenses run directly against the blueprint and the design
decisions established in working sessions. Findings are labeled **[GROUNDED]** (supported by
the blueprint text or known industry fact) or **[ASSUMPTION]** (plausible but not yet
validated against first-party data).
**Known limitation:** The referenced Hybrid Demo 1.0 source and investor deck were not
available in the repository at review time, so code-level and pixel-level validation is
deferred (see Backend / Frontend / Implementation Validator lenses).

Output grammar per lens: ✅ VALIDATED · ⚠️ CONCERNS · 🔄 REQUIRED CHANGES · ✓ PEER REVIEW.

---

## TIER 1 — DISCOVERY

### 1. Market Researcher
✅ **VALIDATED** — [GROUNDED] The transaction + advisory layer is genuine white space.
Incumbents (ILS, PartsBase, Locatory, Aeroxchange, ePlaneAI) are listing/RFQ/broadcast
engines; none own deal *creation*, private compatibility, or outcome intelligence.
⚠️ **CONCERNS** — [ASSUMPTION] Market *size for the advisory layer specifically* is
unquantified. Aftermarket is large, but willingness to pay for an advisor vs. a cheaper
directory is unproven.
🔄 **REQUIRED CHANGES** — Size the reachable segment (independent traders, small/mid
distributors, repair stations) rather than citing whole-aftermarket TAM.
✓ **PEER REVIEW** — Problem Validator, Competitive Analyzer.

### 2. Data Analyst
✅ **VALIDATED** — The metric set the blueprint proposes (time-to-first-qualified-opportunity,
false-opportunity prevention, notification usefulness, match-to-close) is the *right* KPI
spine for the stated goal.
⚠️ **CONCERNS** — [GROUNDED] **Zero first-party data.** Every scoring weight (20/15/20/15/
10/10/5/5) and notification band is invented. Nothing to validate patterns against. This is
the binding constraint on the whole exercise.
🔄 **REQUIRED CHANGES** — Instrument time-to-qualified-opportunity as the North Star from
day one; treat all weights as directional buckets (high/med/low) until real deals tune them.
✓ **PEER REVIEW** — Financial Analyst, QA/Test Architect.

### 3. Problem Validator
✅ **VALIDATED** — [GROUNDED] Ghost inventory, RFQ noise, price-fishing, authority ambiguity
and documentation gaps are real, well-documented aftermarket pains.
⚠️ **CONCERNS** — [GROUNDED] "Deals right away" over-promises. Aviation transactions are
gated by inspection, trace verification and export clearance — friction that is **not
software-solvable**. The advisor compresses discovery/qualification, not the physical/legal
close.
🔄 **REQUIRED CHANGES** — Reframe the headline promise to *time-to-qualified-opportunity*,
not "deal right away."
✓ **PEER REVIEW** — Market Researcher, Legal/Compliance.

### 4. User Researcher
✅ **VALIDATED** — Personas (seller/owner, buyer/procurement, repair station, broker/Deal
Sponsor) are coherent and map to the authority model.
⚠️ **CONCERNS** — [ASSUMPTION] JTBD unvalidated by real interviews. Risk: traders/brokers
*value control, relationships and the phone*; an advisor that "does it for you" may read as
removing their edge — alienating the power users you most need.
🔄 **REQUIRED CHANGES** — 3–4 real trader interviews before locking advisor autonomy
defaults; position the advisor as leverage *for* the expert, not a replacement.
✓ **PEER REVIEW** — Problem Validator, UX Designer.

**TIER 1 GATE:** ⚠️ CONDITIONAL PASS — proceeds, but the data gap and the promise-reframe
are carried forward as open items.

---

## TIER 2 — STRATEGY

### 5. Business Strategist
✅ **VALIDATED** — Neutrality (no pay-to-rank) is a real wedge against incumbents whose
revenue *requires* noise. Advisor + created deals is defensible positioning.
⚠️ **CONCERNS** — [GROUNDED] **Liquidity cold-start is the #1 existential risk** and outranks
every design question. A two-sided advisor network with a handful of participants has
near-zero organic match probability.
🔄 **REQUIRED CHANGES** — A concrete density strategy: seed one narrow part-family/niche, or
run seller-side-first with concierge-sourced demand. No design work matters until this is
answered.
✓ **PEER REVIEW** — Financial Analyst, Risk Manager.

### 6. Financial Analyst
✅ **VALIDATED** — Hybrid subscription + capped success fee aligns incentives and is a sound
starting model.
⚠️ **CONCERNS** — [ASSUMPTION] Unit economics may be thin: success-fee caps ($1,500–$4,000)
are small against high-value serialized components; CAC in a relationship-driven niche is
high; concierge pilot burn is heavy; LTV depends on retention which depends on liquidity
(circular until proven).
🔄 **REQUIRED CHANGES** — Model 3 scenarios (low/base/high) on real deal sizes once data
arrives; stress the cap structure against a realistic deal-value distribution.
✓ **PEER REVIEW (cross-team: Finance reviews Business)** — Approved with the density caveat
inherited from Business Strategist.

### 7. Competitive Analyzer
✅ **VALIDATED** — Differentiation (advisory + privacy + multi-party created deals + outcome
graph) is real and slow to copy.
⚠️ **CONCERNS** — [GROUNDED] Defensibility is **data + execution + speed**, NOT legal lock.
Workflow/UX is largely unpatentable (Alice). Any claim that the concept can be made
"un-buildable" is false and risks strategic complacency.
🔄 **REQUIRED CHANGES** — Reframe the moat around the outcome data graph and trade-secret
scoring; pursue at most a narrow utility patent on the private-limit comparison *method*.
✓ **PEER REVIEW** — Business Strategist, Legal/Compliance.

### 8. Risk Manager
✅ **VALIDATED** — Blueprint already names most product risks (ghost inventory, false urgency,
model error) with sensible controls.
⚠️ **CONCERNS** — Top unmitigated risks: (1) liquidity cold-start; (2) advisor error causing
real financial/safety harm; (3) a private-limit leak destroying trust irrecoverably; (4)
regulatory exposure (below).
🔄 **REQUIRED CHANGES** — Rank risks by (impact × likelihood); assign an owner and a kill-
switch to each of the four.
✓ **PEER REVIEW (Legal reviews Risk)** — Approved; Legal escalates export control (below).

### 9. Legal / Compliance
✅ **VALIDATED** — Airworthiness disclaimers, evidence-ladder language and the narrow,
disclosed anti-circumvention stance are mature and correct.
⚠️ **CONCERNS** — 🚩 [GROUNDED] **Biggest omission in the entire blueprint: export control.**
Cross-border aviation parts trigger **ITAR / EAR licensing**, plus **SUP (Suspected
Unapproved Parts)** liability. The blueprint is nearly silent on both. For a cross-border
parts platform this is a *gating* regulatory workstream, not a "review later" footnote. Also
flag: money-handling/escrow (regulated), and broker-of-record status in some jurisdictions.
🔄 **REQUIRED CHANGES** — Export-control + SUP legal review by qualified counsel **before
pilot**; add an export-screening gate to the eligibility engine; keep funds with regulated
processors only.
✓ **PEER REVIEW** — Risk Manager, Solutions Architect.

**TIER 2 GATE:** ⚠️ CONDITIONAL PASS — two hard blockers escalated to Final: **liquidity
plan** and **export/SUP legal review.**

---

## TIER 3 — PRODUCT DESIGN

### 10. Product Architect
✅ **VALIDATED** — Six-passport object model (Participant/Asset/Requirement/Goal/Opportunity/
Outcome) is clean and maps 1:1 to schemas and screens. Separation of hard eligibility /
trust confidence / opportunity probability is the single best architectural decision.
⚠️ **CONCERNS** — MVP feature set (§66) is broad for a pre-liquidity product.
🔄 **REQUIRED CHANGES** — Narrow v-next to one mission loop end-to-end (see Build Planner).
✓ **PEER REVIEW** — Solutions Architect, User Flow Validator.

### 11. UX / Service Designer
✅ **VALIDATED** — Conversational intake (not bulk upload), the one-item "test-drive," and the
anti-regret advisor briefing before any introduction are strong, differentiating mechanics.
⚠️ **CONCERNS** — [GROUNDED] **Calm-vs-dense tension unresolved.** Blueprint promises a calm,
few-decision surface but specifies dense screens (8 score components, 7 trust dimensions,
per-field provenance). Both are valid products; they are not the same product.
🔄 **REQUIRED CHANGES** — Define the progressive-disclosure hierarchy (default "one number +
one action" view vs. expandable evidence drawer) **before** any wireframe.
✓ **PEER REVIEW** — Interaction Designer, User Researcher.

### 12. Interaction Designer
✅ **VALIDATED** — Semantic color system (buyer/seller/verified/private meanings) and the
notification taxonomy (silent→critical) are systematic and shape the UI well.
⚠️ **CONCERNS** — Six saturated accents on near-black risks the "sci-fi theater" the blueprint
says to avoid. Buyer-blue (#7587FF) vs private-purple (#B78CFF) are close in hue and both
load-bearing. Seven parallel confidence vocabularies overload the user.
🔄 **REQUIRED CHANGES** — Demote two accents to shape/label roles; run a deuteranopia/
protanopia pass as a hard palette gate; unify the *display grammar* of confidence even where
underlying evidence differs.
✓ **PEER REVIEW** — UX Designer, Frontend Architect.

### 13. User Flow Validator
✅ **VALIDATED** — Goal→Model→Qualify→Match→Approve→Execute→Verify is coherent; states map to
the appendix state machine.
⚠️ **CONCERNS** — The **test-drive → top-tier upgrade** path — the single most important
conversion flow — is under-specified. AI-error-recovery ("advisor was wrong") is not designed
as a first-class flow. Empty/cold-start state is under-designed relative to execution screens.
🔄 **REQUIRED CHANGES** — Fully spec: (a) one-item test-drive to "aha," (b) correction/undo
loop, (c) day-one empty state.
✓ **PEER REVIEW** — Product Architect, UX Designer.

**Cross-tier (Technical Architect reviews Product feasibility):** Feasible. Conversational
intake + deterministic gate + explainable score are all buildable with today's stack; the
hard part is the private-price engine (Tier 4), not the UI.

**TIER 3 GATE:** ✅ PASS with three specs required before build.

---

## TIER 4 — TECHNICAL ARCHITECTURE

### 14. Solutions Architect
✅ **VALIDATED** — Deterministic-engine / AI-assist / human-authority separation is the
correct safety architecture. Event-ledger-centric design supports auditability and the moat.
⚠️ **CONCERNS** — Advisor-to-advisor "protocol" must be a state machine over authenticated
messages, never free-form model chat (blueprint agrees — enforce it).
🔄 **REQUIRED CHANGES** — Lock the rule: no LLM output ever crosses a trust/fee/identity
boundary without a deterministic check in between.
✓ **PEER REVIEW** — Backend Architect, Security Architect.

### 15. Backend Architect
✅ **VALIDATED** — Passport versioning + provenance/confidence/freshness per field is the
right data contract.
⚠️ **CONCERNS** — [GROUNDED] **The private-price comparison is the hardest correctness
requirement in the system.** Server-side math is necessary but insufficient: repeated queries
and directional hints enable **inference attacks** that reconstruct a private limit over time.
Code-level validation deferred (source not available).
🔄 **REQUIRED CHANGES** — Treat inference-resistance as a first-class, formally specified
property: query accounting, noise/binning, and a "no directional leakage" invariant with its
own test suite.
✓ **PEER REVIEW** — Security Architect, Database Specialist.

### 16. Database Specialist
✅ **VALIDATED** — Versioned passports, immutable event ledger, separate protected store for
private limits — correct for audit and privacy.
⚠️ **CONCERNS** — Private limits must be physically segregated and excluded from analytics and
model prompts; "exclude where possible" (blueprint) should become "exclude, full stop."
🔄 **REQUIRED CHANGES** — Dedicated encrypted store for private_minimum/maximum with no
ordinary admin export path; tamper-evident ledger (hash-chained).
✓ **PEER REVIEW** — Backend Architect, Infrastructure Specialist.

### 17. Frontend Architect
✅ **VALIDATED** — TanStack/React foundation (per blueprint's migration note) is a reasonable
reusable base; component model suits passports and cards.
⚠️ **CONCERNS** — [GROUNDED] Cannot validate current component/state architecture — demo
source not present. Design system tokens exist on paper but need a real implementation to
verify contrast/responsive behavior.
🔄 **REQUIRED CHANGES** — Provide the demo repo, or build v-next fresh with a tokenized design
system and Storybook for the ~8 core components.
✓ **PEER REVIEW** — Interaction Designer, Solutions Architect.

### 18. Infrastructure Specialist
✅ **VALIDATED** — Multi-tenant isolation, encryption in transit/at rest, document access logs
are named and correct for MVP.
⚠️ **CONCERNS** — "Continuous sweeps" are compute cost; fine at pilot scale, needs a plan
before scale. Add an export-screening service to the gateway (Legal dependency).
🔄 **REQUIRED CHANGES** — Define tenant-isolation authorization tests as a CI gate; budget
sweep frequency by plan.
✓ **PEER REVIEW** — Security Architect, Database Specialist.

**Cross-tier (Product validates technical desirability):** The architecture serves the
product thesis; no feature is blocked by the stack. The one place tech risk maps directly to
product trust is the private-price engine — resource it accordingly.

**TIER 4 GATE:** ⚠️ CONDITIONAL PASS — private-limit inference-resistance spec required;
demo-source review deferred.

---

## TIER 5 — SECURITY & QUALITY

### 19. Security Architect
✅ **VALIDATED** — "LLM is never the sole enforcement layer for privacy/eligibility/fees/
identity" is exactly right and must be inviolable. Permissioned, revocable, watermarked
document room is correct.
⚠️ **CONCERNS** — Novel threat surface = **private-limit inference** (see Backend). Standard
surfaces: tenant isolation, document exfiltration, prompt-injection via uploaded documents
feeding the advisor.
🔄 **REQUIRED CHANGES** — Threat-model the advisor's document ingestion (prompt injection);
formal inference-attack test suite; red-team the identity-unlock flow.
✓ **PEER REVIEW** — Solutions Architect, QA/Test Architect.

### 20. QA / Test Architect
✅ **VALIDATED** — The historical-simulation harness (§69) is the right QA instrument for
matching correctness.
⚠️ **CONCERNS** — [GROUNDED] 20 completed + 20 failed cases **cannot tune 8 weighted factors**
without overfitting. Matching is near-untestable without real ground truth.
🔄 **REQUIRED CHANGES** — Use the harness for *direction and regression*, not calibration;
add golden-path E2E tests for the deterministic gate (which IS fully testable).
✓ **PEER REVIEW** — Data Analyst, Performance Auditor.

### 21. Performance Auditor
✅ **VALIDATED** — No performance blocker at pilot scale; deterministic gate is cheap; LLM
calls are the cost/latency driver.
⚠️ **CONCERNS** — "Advisor works continuously" implies async job orchestration; freshness of
the advisor's *own analysis* must be surfaced, not just data freshness.
🔄 **REQUIRED CHANGES** — Set budgets: intake→structured record < a few seconds; sweep→
notification latency target; show "last swept / next review" in the advisor rail.
✓ **PEER REVIEW** — Infrastructure Specialist, QA/Test Architect.

**TIER 5 GATE:** ✅ PASS with the inference-resistance and prompt-injection work scheduled.

---

## TIER 6 — EXECUTION

### 22. Build Planner
✅ **VALIDATED** — Blueprint's phased delivery (rules → controlled MVP → verified
transactions → integrations) is sequenced correctly.
⚠️ **CONCERNS** — MVP still broad for pre-liquidity. Recommend a **single-loop wedge for Demo
v2:** seller-side liquidation of surplus/as-removed material, one part-family, concierge
specialists behind the advisor, CSV/PDF/manual intake only.
🔄 **REQUIRED CHANGES** — Cut v-next to that one loop; everything else is Phase 2.
✓ **PEER REVIEW** — Product Architect, Integration Specialist.

### 23. Integration Specialist
✅ **VALIDATED** — Integration order (files → email intake → one ERP → logistics/payment →
marketplaces) is right; defer all ERP for v-next.
⚠️ **CONCERNS** — Payment/escrow and export-screening are the only *external* integrations
that gate a real close; both are legal-dependent.
🔄 **REQUIRED CHANGES** — For Demo v2, stub payment/export as concierge steps; don't build
integrations yet.
✓ **PEER REVIEW** — Build Planner, Infrastructure Specialist.

### 24. Implementation Validator
✅ **VALIDATED** — Nothing to contradict: greenfield (repo empty).
⚠️ **CONCERNS** — [GROUNDED] Cannot validate spec-adherence of the prior demo — source not
provided. This is the one open gate that only you can close.
🔄 **REQUIRED CHANGES** — Provide the Hybrid Demo 1.0 repo/zip, OR authorize a fresh Demo v2
build against the narrowed wedge and PRODUCTION_BLUEPRINT.md.
✓ **PEER REVIEW** — Build Planner, Solutions Architect.

**TIER 6 GATE:** ✅ PASS — execution path is clear once the wedge is chosen.

---

## TIER 7 — FINAL APPROVAL

### 25a. Chief Validator (coherence review of all lenses)
The vision is coherent and the differentiation is real — stronger than most seed-stage
product docs. Three blockers recur across tiers and **cannot be validated away by more
analysis**:
1. **No ground-truth data** (Data Analyst, Financial Analyst, QA) — blocks scoring, economics,
   and matching validation.
2. **Export-control / SUP regulatory gap** (Legal, Risk, Infra) — a gating legal workstream
   the blueprint omits.
3. **Liquidity cold-start with no GTM** (Business, Risk) — the existential product risk.

Two engineering must-dos before any real transaction: **private-limit inference resistance**
and **no-LLM-in-the-enforcement-path**. One open dependency only the founder can close:
**provide the demo source** or authorize a fresh build.

### 25b. Executive Synthesizer
See GREENLIGHT_STATUS.md for the GO / NEEDS_REFINEMENT decision and the exact gates.
