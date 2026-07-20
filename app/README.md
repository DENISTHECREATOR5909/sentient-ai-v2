# AeroLoop — web app (your own codebase)

The real AeroLoop application. **100% your code** — React + Vite + TypeScript + Tailwind, no
third-party builder, no vendor lock-in. Deploys as a static site to any host.

## Run it

```bash
cd app
npm install
npm run dev      # http://localhost:5173
```

## Build & preview a production bundle

```bash
npm run build    # outputs static site to app/dist
npm run preview  # serves the built site
```

## Deploy (any static host — you own it)

`npm run build` produces `app/dist`. Point any of these at it:
- **Vercel / Netlify / Cloudflare Pages** — set build command `npm run build`, output dir `dist`,
  root `app/`.
- Or drop `dist/` on any static host / your own server.

For SPA routing (deep links like `/pilot`), enable a catch-all rewrite to `/index.html`
(one line in the host's config — I can add the exact file for whichever host you pick).

## What's here now

| Area | State |
|------|-------|
| Design system (six semantic accents, dark) | `tailwind.config.js` + `src/index.css` |
| App shell (nav rail + top bar) | `src/components/Shell.tsx` |
| Advisor Home (briefing, metrics, recommendation, rail) | `src/routes/Advisor.tsx` |
| **Pilot flow** (intake → qualify → decision → Deal Card) | `src/routes/PilotFlow.tsx` |
| Missions / Inventory / Requirements / Opportunities / Deal Room / Outcomes / Organization | scaffolded placeholders — built next |

## Roadmap (build order)

1. Flesh out the product screens (Inventory / Requirements / Opportunities / Deal Room / Outcomes).
2. Real state (a store) so the pilot flow feeds the other screens.
3. Your own backend — Supabase or Postgres you own: accounts, passports, event ledger.
4. The honest engine: deterministic hard-eligibility gate + inference-safe private-price
   comparison as real server code (the gate to a real pilot).
