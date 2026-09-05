/**
 * The Quality Constitution, expressed as data the runtime can check against rather than as
 * prose the agents can merely be encouraged to follow.
 *
 * `CLAUDE.md` at the repository root is the human-readable copy. This module is the machine
 * copy, and the two are kept in step by `constitution.test.ts`.
 */

export type ArticleId =
  | "A1_OWNER_BELIEF_IS_NOT_COMPLETION"
  | "A2_CONFIDENCE_IS_NOT_TRUTH"
  | "A3_CODE_IS_NOT_FUNCTION"
  | "A4_APPEARANCE_IS_NOT_READINESS"
  | "A5_FAILURE_RETURNS_TO_REPAIR"
  | "A6_BUILDER_IS_NOT_JUDGE"
  | "A7_IRREVERSIBLE_ACTIONS_ESCALATE"
  | "A8_NO_SILENT_DOWNGRADE"
  | "A9_NO_THEATER"
  | "A10_INTELLIGENCE_NOT_HEADCOUNT";

export interface Article {
  readonly id: ArticleId;
  readonly title: string;
  /** What the article forbids, stated so a reviewer can test for a violation. */
  readonly rule: string;
  /** Where in the codebase the article is mechanically enforced. */
  readonly enforcedBy: readonly string[];
}

export const PRIME_DIRECTIVE =
  "The organization's purpose is to produce the strongest verifiably correct, useful, " +
  "original and complete result attainable within the authorized scope. Speed, convenience, " +
  "appearance, token savings, prior investment, agent agreement or schedule pressure may not " +
  "override a release-blocking correctness, security, privacy, functionality or evidence " +
  "requirement.";

export const ARTICLES: readonly Article[] = [
  {
    id: "A1_OWNER_BELIEF_IS_NOT_COMPLETION",
    title: "A task is not complete because its owner believes it is complete",
    rule: "A task may only enter `complete` when its acceptance criteria are satisfied and an independent verifier has recorded a verdict.",
    enforcedBy: ["tasks.ts:canComplete", "gates.ts:evaluateGate"],
  },
  {
    id: "A2_CONFIDENCE_IS_NOT_TRUTH",
    title: "A critical claim is not true because an agent is confident",
    rule: "A claim may only be marked `verified` when it carries at least one resolvable evidence pointer.",
    enforcedBy: ["evidence.ts:recordClaim"],
  },
  {
    id: "A3_CODE_IS_NOT_FUNCTION",
    title: "A feature is not working because code exists",
    rule: "Implementation artifacts do not satisfy a functional gate; only executed verification results do.",
    enforcedBy: ["gates.ts:RELEASE_GATES", "evidence.ts:EVIDENCE_KINDS"],
  },
  {
    id: "A4_APPEARANCE_IS_NOT_READINESS",
    title: "A product is not ready because it looks finished",
    rule: "Release evaluation is fail-closed: an unknown gate is a blocked gate.",
    enforcedBy: ["gates.ts:evaluateRelease"],
  },
  {
    id: "A5_FAILURE_RETURNS_TO_REPAIR",
    title: "Failed verification returns the artifact to repair",
    rule: "A failed verdict transitions the owning task to `repair`; no path converts a failure to a pass without new evidence.",
    enforcedBy: ["tasks.ts:applyVerdict", "runtime/repair.ts"],
  },
  {
    id: "A6_BUILDER_IS_NOT_JUDGE",
    title: "The builder is never the final judge of its own work",
    rule: "The set of agents holding `implement` authority over an artifact and the set holding `verify` authority over it must be disjoint.",
    enforcedBy: ["permissions.ts:checkSeparationOfPowers"],
  },
  {
    id: "A7_IRREVERSIBLE_ACTIONS_ESCALATE",
    title: "Irreversible actions remain permission-controlled",
    rule: "An action classified irreversible requires an explicit grant; absent one it escalates to the owner rather than proceeding.",
    enforcedBy: ["permissions.ts:evaluateAction"],
  },
  {
    id: "A8_NO_SILENT_DOWNGRADE",
    title: "No capability downgrade may be silently represented as maximum-capability execution",
    rule: "If a required capability route was unavailable, the release gate reports NOT SATISFIED and names the outstanding work.",
    enforcedBy: ["routing.ts:recordDegradation", "gates.ts:GATE_capability_route"],
  },
  {
    id: "A9_NO_THEATER",
    title: "The city is never theater",
    rule: "Every rendered entity carries the id of the runtime entity it depicts; the renderer refuses to draw an entity with no backing event.",
    enforcedBy: ["events.ts:assertCorrespondence", "apps/city/src/world/correspondence.ts"],
  },
  {
    id: "A10_INTELLIGENCE_NOT_HEADCOUNT",
    title: "Maximum potential means maximum useful intelligence, not maximum agent count",
    rule: "Worker count is a function of measured decomposability; an allocation exceeding the complexity budget is rejected.",
    enforcedBy: ["routing.ts:planAllocation"],
  },
] as const;

export const ARTICLE_INDEX: ReadonlyMap<ArticleId, Article> = new Map(
  ARTICLES.map((a) => [a.id, a] as const),
);

/**
 * A constitutional violation. These are *not* thrown as ordinary errors: they are published
 * onto the bus and recorded against the release manifest, because an organization that
 * silently swallows its own violations is exactly the failure mode Article 8 forbids.
 */
export interface Violation {
  readonly article: ArticleId;
  readonly detail: string;
  readonly subject: string;
  readonly at: number;
}

export function violation(article: ArticleId, subject: string, detail: string, at = Date.now()): Violation {
  return { article, subject, detail, at };
}

export function describeViolation(v: Violation): string {
  const article = ARTICLE_INDEX.get(v.article);
  return `${v.article} — ${article?.title ?? "unknown article"}\n  subject: ${v.subject}\n  detail:  ${v.detail}`;
}
