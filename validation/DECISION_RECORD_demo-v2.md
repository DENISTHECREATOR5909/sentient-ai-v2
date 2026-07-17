# Decision Record — Demo v2 anchor & build path

Applies the validation system to the two open decisions from GREENLIGHT_STATUS.md, using
external market research (grounded) plus the relevant specialist lenses.

---

## Decision 1 — Which part-family anchors Demo v2?

### Research (grounded)
- Commercial aftermarket ≈ **$44.6B (2025)**, growing to ~$61.7B by 2031 (5.55% CAGR).
- **Narrowbody = 59.87% of share (2025)** — high cycle counts drive wear on wheels/brakes,
  ECS, and **line-replaceable avionics (LRUs)**; avionics is the fastest-growing component
  category (**6.35% CAGR**).
- **USM (Used Serviceable Material) ≈ $6B+**, ~700 aircraft retired/yr, 40–60% savings vs new
  — this is the *as-removed / teardown* supply the blueprint's inclusive-inventory model is
  built for.
- Most actively traded rotables: engine modules, landing gear, APUs, **actuators, generators,
  avionics LRUs**.

### Lens read
- **Market Researcher ✅** — Avionics LRUs sit in the fastest-growing, narrowbody-heavy,
  actively-traded band with a deep USM/as-removed supply. Real density is plausible.
- **Product Architect ✅** — LRUs are **high-value + serialized + trace/document-sensitive**
  with active **repair, exchange and evaluation** markets. That means one family naturally
  exercises *every* AeroLoop mechanic: private-price bridge, trace routing, repair-station
  bridge, exchange/core structure, and the anti-regret briefing. A commodity family
  (e.g. wheels/brakes) is higher-volume but too undifferentiated to show the advisor's
  structuring intelligence.
- **Build Planner ✅** — Consistent with the blueprint's own worked example (EFIS Display Unit
  PN 7003110-901), so demo copy and logic already have a reference.
- **Risk Manager ⚠️** — Engine LLPs/QEC and landing gear carry the heaviest trace/regulatory
  burden; keep them OUT of the demo. Avionics LRUs are serialized but lighter on
  airworthiness-critical life-limits, lowering demo legal risk while still showing trace.

### DECISION
**Anchor Demo v2 on narrowbody avionics LRUs** (EFIS/display, radios, computers), with
**hydraulic actuators as the adjacent second family** for the multi-source/exchange showcase.
Demo scenario = seller-side liquidation of **as-removed / repairable** LRUs routed to
installation-ready buyers, repair stations, or exchange — exactly the USM flow with real
supply.

---

## Decision 2 — Lovable prototype vs in-repo build first?

### Lens read
- **UX/Service Designer ✅** — The demo's job is to make the *experience* felt (the "aha"):
  conversational intake + interrogatable decision queue + the Jarvis-style briefing. Lovable
  reaches a premium, clickable feel fastest.
- **Solutions Architect ⚠️** — The one thing a pure UI mock must NOT fake convincingly is the
  **private-price engine** — faking it teaches the wrong lesson. Keep a real deterministic
  gate + an honest "private-limit never exposed" stub even in the prototype.
- **Build Planner ✅** — Two-step path: (1) Lovable prototype of the two hero screens to lock
  the experience and get founder reactions; (2) port the validated flow into an in-repo build
  on the TanStack stack with the real gate + inference-safe private-price handling.
- **Financial Analyst ⚠️** — Lovable runs on founder credits; scope the prototype tightly to
  the two screens + one scripted deal to control spend.

### DECISION
**Start with a Lovable prototype of the two hero screens**, tightly scoped to one scripted
avionics-LRU deal, with a real deterministic-gate stub and honest private-limit handling.
Then port to the in-repo build.

---

## Net: ready to build
Both open build decisions are now closed with evidence. The three *pilot* gates (real data,
export/SUP legal review, liquidity plan) remain — but none block building Demo v2.

**Founder go-ahead needed:** approve starting the Lovable prototype (spends Lovable credits).
