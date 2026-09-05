/**
 * Atlas's plan template.
 *
 * A production run is not improvised. The shape below is the dependency-aware graph a major
 * product objective decomposes into, and it encodes two things the organization refuses to
 * negotiate: research and the pre-mortem both run *before* anything is designed, and every
 * criterion names the resident who will check it before the work starts.
 *
 * Atlas refines the criteria per objective; it does not get to remove a verifier.
 */

import type { Domain, ResidentId } from "@agent-city/core";
import type { WorkClass } from "@agent-city/core";

export interface PlannedCriterion {
  readonly text: string;
  /** The independent verifier. Chosen at plan time so it can never be chosen at excuse time. */
  readonly by: ResidentId;
  readonly method: string;
}

export interface PlannedTask {
  readonly key: string;
  readonly title: string;
  readonly domain: Domain;
  readonly workClass: WorkClass;
  readonly owner: ResidentId;
  readonly dependsOn: readonly string[];
  readonly criteria: readonly PlannedCriterion[];
  /** Signals for `planAllocation`. Branches are what makes parallelism legitimate. */
  readonly branches: number;
  readonly dependencyDepth: number;
  readonly consequence: number;
}

const argus = (text: string): PlannedCriterion => ({ text, by: "argus", method: "functional_test" });
const aegis = (text: string): PlannedCriterion => ({ text, by: "aegis", method: "security_scan" });
const mercy = (text: string): PlannedCriterion => ({ text, by: "mercy", method: "a11y_audit" });
const flux = (text: string): PlannedCriterion => ({ text, by: "flux", method: "performance_benchmark" });
const nyx = (text: string): PlannedCriterion => ({ text, by: "nyx", method: "adversarial_review" });

export const PRODUCTION_PLAN: readonly PlannedTask[] = [
  {
    key: "research",
    title: "Establish the evidence base",
    domain: "research",
    workClass: "deep_research",
    owner: "verity",
    dependsOn: [],
    criteria: [
      nyx("Every load-bearing claim carries a source, and contradictions are surfaced rather than averaged"),
      argus("The evidence ledger resolves: no claim points at an artifact that does not exist"),
    ],
    branches: 12,
    dependencyDepth: 1,
    consequence: 0.7,
  },
  {
    key: "premortem",
    title: "Pre-mortem: assume this shipped and failed",
    domain: "adversarial",
    workClass: "adversarial_review",
    owner: "nyx",
    dependsOn: [],
    criteria: [
      argus("Each named failure mode is specific enough to write a test against"),
      aegis("The security and privacy failure modes are enumerated, not gestured at"),
    ],
    branches: 1,
    dependencyDepth: 1,
    consequence: 0.8,
  },
  {
    key: "product",
    title: "Define the product and its acceptance criteria",
    domain: "product",
    workClass: "product_definition",
    owner: "nova",
    dependsOn: ["research", "premortem"],
    criteria: [
      argus("Every acceptance criterion names an observable check, not an intention"),
      nyx("The non-goals are explicit, and the pre-mortem's failure modes are answered or accepted in writing"),
      mercy("The definition names who this excludes and what is done about it"),
    ],
    branches: 1,
    dependencyDepth: 2,
    consequence: 0.9,
  },
  {
    key: "ux",
    title: "Flows, information architecture and states",
    domain: "ux",
    workClass: "design",
    owner: "sol",
    dependsOn: ["product"],
    criteria: [
      mercy("Every flow has a keyboard path and an announced state change"),
      argus("Every state in the flow — including empty, partial, error and offline — is specified"),
      nyx("The design has an answer for a failure occurring mid-sequence"),
    ],
    branches: 1,
    dependencyDepth: 3,
    consequence: 0.7,
  },
  {
    key: "visual",
    title: "Visual system: type, colour, composition",
    domain: "visual",
    workClass: "design",
    owner: "iris",
    dependsOn: ["product"],
    criteria: [
      mercy("Contrast is measured against the stated conformance target, not judged by eye"),
      argus("The system is expressed as reusable tokens rather than per-screen decisions"),
    ],
    branches: 1,
    dependencyDepth: 3,
    consequence: 0.5,
  },
  {
    key: "systems",
    title: "System design: interfaces, data model, failure modes",
    domain: "backend",
    workClass: "implementation",
    owner: "vector",
    dependsOn: ["product"],
    criteria: [
      aegis("Every boundary states what it trusts, and no credential crosses one it should not"),
      argus("Each interface has a specified behaviour under partial failure"),
      flux("The data path has a stated latency budget with a measurement point"),
    ],
    branches: 3,
    dependencyDepth: 3,
    consequence: 0.85,
  },
  {
    key: "motion",
    title: "Motion language and state transitions",
    domain: "motion",
    workClass: "design",
    owner: "kinetic",
    dependsOn: ["ux"],
    criteria: [
      mercy("Every motion has a reduced-motion fallback that is not simply 'no animation'"),
      flux("No transition costs more than its frame budget on the target device"),
    ],
    branches: 1,
    dependencyDepth: 4,
    consequence: 0.4,
  },
  {
    key: "frontend",
    title: "Client implementation",
    domain: "frontend",
    workClass: "implementation",
    owner: "rune",
    dependsOn: ["ux", "visual", "systems"],
    criteria: [
      argus("Every specified state is reachable and behaves as specified"),
      mercy("The implementation conforms to the stated accessibility target"),
      flux("Interaction stays inside the frame budget under the stated load"),
      aegis("No credential, token or private value reaches the client bundle"),
    ],
    branches: 4,
    dependencyDepth: 5,
    consequence: 0.9,
  },
  {
    key: "integration",
    title: "Integrate and exercise the whole path",
    domain: "backend",
    workClass: "implementation",
    owner: "vector",
    dependsOn: ["frontend", "motion"],
    criteria: [
      argus("The whole path runs end to end, including the failure branches"),
      nyx("The integration is exercised against the pre-mortem's failure modes, not only the happy path"),
      flux("End-to-end latency is measured, not estimated"),
      aegis("The integrated surface passes a scan with no unmitigated finding"),
    ],
    branches: 2,
    dependencyDepth: 6,
    consequence: 0.95,
  },
  {
    key: "archive",
    title: "Archive decisions and provenance",
    domain: "knowledge",
    workClass: "mechanical",
    owner: "mnemos",
    dependsOn: ["integration"],
    criteria: [
      argus("Every archived decision resolves to the evidence it was made on"),
      nyx("The record includes what was rejected and why, not only what was chosen"),
    ],
    branches: 1,
    dependencyDepth: 7,
    consequence: 0.4,
  },
];

/** Where a resident goes to do a given kind of work. Movement follows work, never the reverse. */
export const WORK_DISTRICT: Readonly<Record<Domain, string>> = {
  orchestration: "command-spire",
  research: "observatory",
  product: "strategy-chamber",
  ux: "design-atelier",
  visual: "design-atelier",
  motion: "motion-studio",
  frontend: "engineering-foundry",
  backend: "systems-foundry",
  security: "security-citadel",
  quality: "verification-arena",
  performance: "performance-lab",
  accessibility: "civic-hall",
  adversarial: "red-team-annex",
  knowledge: "great-archive",
  release: "release-tower",
};
