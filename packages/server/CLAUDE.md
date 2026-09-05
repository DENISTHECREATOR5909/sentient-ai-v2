# `packages/server` — the event-stream bridge

- **The bridge relays; it does not author.** No endpoint or socket message may contain state
  the orchestrator did not emit. Synthesising a plausible event for a client that missed one
  would put the lie in the one place nothing downstream could catch it.
- **Sequence numbers are contiguous and never rewritten.** Pacing may delay an event; it may
  never reorder or drop one. A client that finds a gap must be able to trust that the gap is
  real.
- **A missing credential is a mode, not an error.** Report the rehearsal fallback plainly in
  the snapshot so the UI can label it; never fail silently into it.
- **Static serving refuses traversal** rather than normalising a path into something servable.
- **A blocked release exits non-zero.** CI must not be able to read a blocked gate as a pass.
