# `evals` — competency trials and adversarial suites

- **A trial that cannot fail is not a trial.** Every suite here must contain at least one case
  the current implementation would fail if a specific guarantee were removed.
- **Assert the refusal.** These suites exist to prove the organization says no: no evidence,
  no verification; no independent verifier, no completion; no capability, no release.
- **Never weaken a suite to make a run pass.** If a trial blocks a candidate, that is the
  trial working. Changing the threshold to admit a candidate is the exact failure mode the
  Genesis Foundry exists to prevent.
