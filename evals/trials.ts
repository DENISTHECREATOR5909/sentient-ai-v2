/**
 * Competency trials and adversarial suites.
 *
 * A trial that cannot fail is not a trial. Each case below names a guarantee and the way the
 * organization is supposed to refuse when that guarantee is absent — so removing the
 * guarantee makes a test go red, which is the only kind of test worth having here.
 */

export interface TrialCase {
  readonly id: string;
  /** The guarantee under test, phrased as the thing the organization refuses to do. */
  readonly guarantee: string;
  /** What breaks in production if this guarantee silently stops holding. */
  readonly ifRemoved: string;
}

export const COMPETENCY_TRIALS: readonly TrialCase[] = [
  {
    id: "evidence.no-pointer-no-verified",
    guarantee: "A claim cannot be recorded as verified without a resolvable executed evidence pointer.",
    ifRemoved: "Confident prose becomes indistinguishable from a passing test, and the release manifest stops meaning anything.",
  },
  {
    id: "evidence.opinion-is-not-execution",
    guarantee: "A review record alone cannot verify a claim; only executed evidence can.",
    ifRemoved: "An agent reviewing its colleague's work could verify a feature nobody ever ran.",
  },
  {
    id: "tasks.independent-verdict-required",
    guarantee: "A task cannot complete on its owner's belief, only on independent verdicts covering every criterion.",
    ifRemoved: "The builder becomes the judge, and the repair loop never runs.",
  },
  {
    id: "tasks.failure-returns-to-repair",
    guarantee: "A failed verdict returns the artifact to repair, and no path converts it to a pass without a new verdict.",
    ifRemoved: "A known defect ships because a later, unrelated pass overwrote the failure.",
  },
  {
    id: "permissions.deny-beats-allow",
    guarantee: "A denied tool stays denied even under an explicit owner grant.",
    ifRemoved: "The security envelope becomes negotiable, which is the same as absent.",
  },
  {
    id: "permissions.closed-by-default",
    guarantee: "A tool in neither list is denied.",
    ifRemoved: "New capabilities appear in an agent's hands by not being mentioned.",
  },
  {
    id: "permissions.irreversible-escalates",
    guarantee: "An irreversible action escalates to the owner rather than proceeding on an agent's authority.",
    ifRemoved: "The organization can take an action nobody can undo, on its own initiative.",
  },
  {
    id: "gates.unknown-blocks",
    guarantee: "A gate that has not reported blocks the release.",
    ifRemoved: "Silence reads as success, which is the exact meaning of Article 4.",
  },
  {
    id: "gates.single-council-failure-blocks",
    guarantee: "One council member's failure blocks the release regardless of how many others passed.",
    ifRemoved: "Quality becomes a majority vote, and the minority is always the one who found the bug.",
  },
  {
    id: "routing.degradation-blocks",
    guarantee: "A capability the run could not obtain blocks the release and is named in the outstanding work.",
    ifRemoved: "A lesser run presents itself as a full one — the failure Article 8 exists for.",
  },
  {
    id: "routing.allocation-must-be-earned",
    guarantee: "Worker count above what decomposability justifies is refused.",
    ifRemoved: "The orchestrator spawns fifty agents for a job that needed one, and they duplicate each other.",
  },
  {
    id: "genesis.necessity-refuses-by-default",
    guarantee: "A capability gap that recurred once, or that an existing resident already owns, does not produce a new agent.",
    ifRemoved: "The roster grows without bound and coordination cost swallows the benefit.",
  },
  {
    id: "genesis.trials-gate-citizenship",
    guarantee: "A candidate failing any competency trial or any adversarial review is refused citizenship.",
    ifRemoved: "The Foundry becomes a hiring machine rather than an admissions process.",
  },
  {
    id: "events.correspondence-required",
    guarantee: "An event that would ask the renderer to draw something names the runtime entity it depicts.",
    ifRemoved: "The city becomes theater, and every other guarantee becomes unobservable.",
  },
];

/** Suites the Adversarial Quality Council runs against a candidate before citizenship. */
export const ADVERSARIAL_SUITES: readonly { reviewer: string; checks: readonly string[] }[] = [
  {
    reviewer: "argus",
    checks: [
      "The output contract is rich enough to verify against.",
      "Every declared expertise has a corresponding evaluation trial.",
    ],
  },
  {
    reviewer: "aegis",
    checks: [
      "The requested tool envelope contains no denied tool.",
      "No irreversible action is reachable from the envelope.",
      "The candidate cannot write to work it would be judging.",
    ],
  },
  {
    reviewer: "nyx",
    checks: [
      "The candidate does not duplicate an existing resident's authority.",
      "The gap it answers was measured, not asserted.",
    ],
  },
];
