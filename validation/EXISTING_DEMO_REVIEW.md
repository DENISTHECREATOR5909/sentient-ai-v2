# Grounded review — existing AeroLoop v1 demo (baseline for Demo v2)

**Artifact reviewed:** `demo/AeroLoop_v1_baseline.html` (the uploaded AeroLoop 2 Interactive
Demo) + the 23-slide investor deck montage.
**Status of gates it closes:** GREENLIGHT gate #5 (demo source review) is now **CLOSED** — we
have the real artifact. Frontend Architect and Implementation Validator lenses re-run below,
now **[GROUNDED]** instead of deferred.

---

## What the artifact actually is
A single-file, vanilla HTML/CSS/JS (~150KB) investor demo of exceptional polish. It contains:
- An intro/hero with the Vector orb, live Matchability score, and private-limit bridge.
- An app shell with a **persona switcher** (seller / buyer / partner / repair / investor).
- **Ten views:** Advisor briefing (command), Vector chat, Match map, Market pulse,
  Inventory/Revenue Twin, Package builder, **Bridge Room** (advisor-to-advisor with the
  private limit visually protected), Deal Card close (with signatures), Impact/receipt, and
  Investor.
- The exact visual system from the blueprint (#05070B bg; cyan/blue/gold/lime/purple
  semantics; Inter; glass panels; 14–28px radii; subtle motion).

**Verdict:** This is not a throwaway. It is a strong design baseline that already embodies the
Design DNA. Demo v2 should **evolve it, not restart.**

---

## Lens re-run (now grounded)

### Interaction Designer ✅/⚠️
✅ Visual language is premium and on-spec; the deck and demo are consistent.
⚠️ The palette in code has **grown beyond the six semantic accents** (adds `--blue2 --aqua
--orange` on top of blue/cyan/gold/lime/red/purple). This is exactly the accent-sprawl the
validation flagged. 🔄 Consolidate to the six semantic roles; run the colorblind pass;
unify the confidence display grammar.

### UX / Service Designer ⚠️
⚠️ It's a **"show everything" investor tour (10 views)**, not the focused pilot-facing wedge.
For the pilot product, the breadth dilutes the core promise.
⚠️ A **universal search box** sits in the topbar — the founder explicitly does *not* want
search-first. 🔄 For Demo v2, demote search; lead with conversational intake.
⚠️ Intake is via **modal forms** (`form-grid`), not dialogue. 🔄 Make intake conversational —
the advisor builds the Goal Contract by asking only outcome-changing questions — and support
a **one-part test-drive**.

### Product Architect ✅
✅ The full opportunity lifecycle is represented end-to-end (briefing → match → bridge → deal
card → close → impact), and the Bridge Room already visually protects the private limit.
🔄 Keep the lifecycle; for Demo v2 collapse it around the single seller-side avionics-LRU loop.

### Frontend Architect ✅/⚠️ (was deferred)
✅ Clean vanilla structure, sensible tokens, responsive breakpoints already present. No
framework lock-in; easy to evolve.
⚠️ Client-side seeded data + view-switching only (no real gate). Fine for a demo, but the
private-price logic must not be faked convincingly. 🔄 Add a real **deterministic gate stub**
and honest "private-limit never exposed" handling.

### Implementation Validator ✅ (was blocked)
✅ Artifact now available; matches the blueprint's design intent closely. The prior "cannot
validate" gate is cleared. The v1 demo is an accurate expression of the design — the gap is
*focus and honesty of logic*, not visual quality.

---

## Revised build-path decision (updates DECISION_RECORD_demo-v2.md, Decision 2)
The earlier recommendation (Lovable-first) assumed no strong artifact existed. **It does.**
Given the quality of `AeroLoop_v1_baseline.html`, the options re-rank:

| Path | Pro | Con | Fit |
|------|-----|-----|-----|
| **A. Evolve the existing single-file demo** | Fastest; preserves premium polish; zero credits; already on-brand | Not a scalable app skeleton | **Best for Demo v2 as a sharper pilot-facing demo** |
| B. Lovable rebuild | Real app scaffold + Supabase backend for later | Costs credits; re-creates polish that already exists | Better when we need a real backend |
| C. In-repo React port | Long-term product seed | Slowest; throws away working artifact now | Later, once the flow is validated |

**Revised recommendation:** **Path A — evolve the existing demo into Demo v2**, focused on the
two hero flows, with the validation fixes applied. Move to Lovable/React only when we add a
real backend. This is faster, cheaper, and preserves the design equity you already built.

---

## Source-integration note — Partner Brief (added after review)
The uploaded **Vector AI Partner Brief** and the clean-extracted **investor deck** were folded
in after this review. Two honest updates:
- **Correction to the export-control finding (Conflict C-6 / Legal lens).** I earlier called
  export control the blueprint's "biggest omission / nearly silent." The Partner Brief
  explicitly lists *"sanctions/export screening integrations"* as intended production
  architecture. Accurate statement: export screening is **acknowledged but undeveloped**, and
  absent from the master blueprint's main legal section. The gate still stands (it must become
  a concrete, counsel-scoped workstream before a cross-border pilot) — but "biggest omission"
  was too strong. Record corrected.
- **Demo v2 realizes two named Partner-Brief features.** The conversational intake IS the
  Brief's **"Deal Strategy Interview"**; the masked private-price bridge IS the **"Advisor-to-
  Advisor Bridge."** Build is aligned to the source, not improvised.
- **Investor-view framing to keep:** "Version 1 is a better aviation transaction network;
  Version 2 is a scalable commercial-intelligence company," backed by the four graphs
  (Evidence / Opportunity / Reliability / Advisor Outcome), the last being the hardest to copy.

## Demo v2 change-list (what "evolve" means concretely)
1. **Reframe entry to conversational intake** (advisor asks; builds Goal Contract); keep a
   one-part test-drive path. Demote the search box.
2. **Sharpen the two hero screens** — Intake + the interrogatable Decision Queue (the
   briefing/opportunity surface) — to a calm default (one number + one action + protected
   chips) with an expandable evidence drawer.
3. **Honest logic:** real deterministic gate stub; private limit provably never exposed
   (keep the Bridge Room's protection, make it truthful).
4. **Per-item, range-based match thresholds** with a live "how many opportunities this
   implies" count (the deck's user-threshold band is the seed).
5. **Two-directional advice** in the advisor copy (raise / hold / repackage, not only reduce).
6. **Notification personality dial** on top of the existing toast system.
7. **Consolidate accents to six**; colorblind pass; unify confidence labels.
8. **Anchor content on avionics LRUs** (EFIS/display + actuators) per the decision record.
9. Keep the **Investor view separate** as its own narrative surface (blueprint agrees).
