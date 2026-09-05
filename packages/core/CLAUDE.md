# `packages/core` — domain law

Scoped rules for the domain layer. These narrow the root constitution; they never relax it.

- **Zero runtime dependencies.** If a change here needs a package, the change belongs in
  `packages/runtime` instead. The constitution must be testable without booting an
  organization.
- **Data plus pure functions.** Behaviour that mutates lives in the few explicit classes
  (`TaskGraph`, `EvidenceLedger`, `EventBus`, `CareerLedger`, `Tracer`). Everything else takes
  state and returns a verdict.
- **A rule that can be out-argued is not a rule.** No `force`, `override`, `skipValidation` or
  `allowUnverified` parameter may be added to any function in this package. If a caller needs
  an exception, the answer is that the caller is wrong.
- **Every article needs an enforcement site.** Adding an article to `constitution.ts` without
  a function that mechanically enforces it makes the constitution decorative.
- **Refusals name the article.** A thrown `TaskGraphError`, `EvidenceRejected` or
  `AllocationRefused` carries the `Violation` it is refusing on, so the message explains the
  principle rather than only the symptom.
- **Every gate, permission rule and lifecycle transition ships with a test**, and the test
  asserts the *refusal* path, not only the happy one.
