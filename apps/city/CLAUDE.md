# `apps/city` — the rendered world

Article 9 is this directory's whole job. Everything else is craft.

- **Draw only what an event grounds.** Ask `Correspondence` before rendering an agent, task or
  swarm worker. A refusal is surfaced in the UI, never swallowed into the console.
- **Never interpolate across a gap.** If the sequence has a hole, say so in the interface. A
  smoothed-over gap is a city that never happened.
- **The idle bob is the only decoration.** Every other motion on screen — travel, flows,
  status colour, the Foundry door — is the visual consequence of a specific event.
- **DOM for reading, canvas for the world.** Inspectors, tables, evidence and the gate matrix
  are real text: selectable, searchable, screen-reader reachable. Four hundred moving agents
  are not.
- **The game layer is never mandatory.** Operations view must stay usable, and complete, on
  its own.
- **Honour `prefers-reduced-motion`,** keep focus visible, and keep contrast at or above the
  stated target — Mercy blocks releases for less.
