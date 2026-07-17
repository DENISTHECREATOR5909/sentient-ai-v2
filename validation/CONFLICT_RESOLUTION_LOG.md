# AeroLoop — Conflict Resolution Log

Conflicts surfaced between lenses, and how each was resolved (consensus, escalation, or
executive override). "Conflict" here also includes tensions between the blueprint's stated
intent and a specialist finding.

---

### C-1 — "Deals right away" vs. domain reality
- **Positions:** Business/Marketing intent = "make deals right away." Problem Validator +
  Legal = physical inspection, trace verification and export clearance make a *literal*
  same-moment close impossible.
- **Resolution:** CONSENSUS. Reframe the promise to **time-to-qualified-opportunity**, which
  the software genuinely can compress to minutes. The close itself is honestly represented as
  gated. No loss of differentiation — competitors don't even deliver the qualified
  opportunity fast.

### C-2 — Legal moat: "un-copyable" vs. unpatentable workflow
- **Positions:** Founder intent = design so no one can legally build something similar.
  Competitive Analyzer + Legal = UX/workflow is largely unpatentable (Alice); the claim is
  false and risks complacency.
- **Resolution:** OVERRIDE toward the grounded view. Moat = **outcome data graph + execution
  speed + trade-secret scoring**, with at most a *narrow* utility patent on the private-limit
  comparison method, plus trademark and disclosed contractual protection. Documented in
  PRODUCTION_BLUEPRINT.md §Moat.

### C-3 — Calm surface vs. dense information
- **Positions:** UX intent (blueprint) = calm, few decisions. Product/Interaction reality =
  screens carry 8 score components, 7 trust dimensions, per-field provenance.
- **Resolution:** CONSENSUS via **progressive disclosure**: default view = one number + one
  action + protected-items chips; everything else lives in an expandable evidence drawer
  ("silence on top, receipts on demand"). Must be specified before wireframing.

### C-4 — Advisor autonomy vs. trader control
- **Positions:** Product intent = advisor does the work. User Researcher = power users value
  control and relationships; full autonomy may alienate them.
- **Resolution:** CONSENSUS. Launch at **Level 1–2 only** (blueprint already agrees), position
  the advisor as *leverage for the expert*, and make every action approval-gated with an
  interrogatable briefing. Autonomy earns its way up per user.

### C-5 — Scoring weights: precise numbers vs. no data
- **Positions:** Blueprint presents specific weights (20/15/20/…). Data Analyst + QA = no data
  to justify them; 40 historical cases can't calibrate 8 factors.
- **Resolution:** CONSENSUS. Demote weights to **high/medium/low buckets** for Demo v2; use
  the historical-simulation harness for direction and regression only, not calibration.

### C-6 — Export control: omitted vs. gating
- **Positions:** Blueprint treats regulatory as airworthiness-disclaimer + anti-circumvention.
  Legal/Compliance = **ITAR/EAR export licensing and SUP liability are gating** and largely
  absent.
- **Resolution:** ESCALATED to Executive as a hard GO gate. Add an export-screening step to
  the eligibility engine; obtain counsel review before pilot. Non-negotiable.

### C-7 — Private-price engine: "server-side math is enough" vs. inference attacks
- **Positions:** Blueprint = compare private limits server-side, throttle probing. Backend +
  Security = repeated queries/directional hints enable **statistical reconstruction** of a
  private limit over time.
- **Resolution:** CONSENSUS. Elevate **inference resistance** to a formally specified security
  property (query accounting, binning/noise, no-directional-leakage invariant) with a
  dedicated test suite. This is the highest-severity engineering item.

### C-8 — MVP scope: broad vs. pre-liquidity reality
- **Positions:** Blueprint MVP (§66) is broad. Build Planner = too broad before liquidity
  exists.
- **Resolution:** CONSENSUS. Demo v2 = **one loop** (seller-side surplus/as-removed
  liquidation, one part-family, concierge-backed). Everything else Phase 2.

---

## Unresolved (require founder input, not more analysis)
1. **Ground-truth data** — anonymized real inventory/requirements/closed deals. Blocks C-5 and
   economics. *Only the founder can supply.*
2. **Export/SUP legal review** — blocks C-6. *Requires qualified counsel.*
3. **Liquidity plan** — which niche/family gets seeded first. *Founder market judgment.*
4. **Demo source** — the Hybrid Demo 1.0 repo/zip, to validate or supersede. *Founder to
   provide or authorize fresh build.*
