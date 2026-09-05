/**
 * The resident intelligence community.
 *
 * Permanent identities correspond to durable organizational competencies — not to units of
 * parallelism. Massive temporary parallelism lives *underneath* residents as ephemeral
 * workers (see `routing.ts`). The city therefore has two populations: fifteen residents with
 * memory, authority and a career record, and spawned specialists created for one bounded
 * problem and then released.
 *
 * The names and coats make the organization emotionally legible. They do not create the
 * competence. Competence comes from model selection, context, role contract, tool envelope,
 * memory and — above all — from the fact that nobody here grades their own work.
 */

import type { ModelClass } from "./routing.js";

export type ResidentId =
  | "atlas"
  | "verity"
  | "nova"
  | "sol"
  | "iris"
  | "kinetic"
  | "rune"
  | "vector"
  | "aegis"
  | "argus"
  | "flux"
  | "mercy"
  | "nyx"
  | "mnemos"
  | "pax";

export type District =
  | "command-spire"
  | "observatory"
  | "strategy-chamber"
  | "design-atelier"
  | "motion-studio"
  | "engineering-foundry"
  | "systems-foundry"
  | "security-citadel"
  | "verification-arena"
  | "performance-lab"
  | "civic-hall"
  | "red-team-annex"
  | "great-archive"
  | "release-tower"
  | "genesis-foundry";

/** Work domains. Authority is granted per domain, and `implement` ∩ `verify` must be empty. */
export type Domain =
  | "orchestration"
  | "research"
  | "product"
  | "ux"
  | "visual"
  | "motion"
  | "frontend"
  | "backend"
  | "security"
  | "quality"
  | "performance"
  | "accessibility"
  | "adversarial"
  | "knowledge"
  | "release";

export interface ToolEnvelope {
  /** Explicitly permitted tool classes. */
  readonly allow: readonly string[];
  /** Explicitly forbidden. Deny always beats allow — see `permissions.ts`. */
  readonly deny: readonly string[];
}

export interface Resident {
  readonly id: ResidentId;
  readonly name: string;
  /** Human-equivalent responsibility, stated the way an org chart would state it. */
  readonly title: string;
  readonly district: District;
  /** Sprite/portrait description. Consumed by the renderer; carries no runtime authority. */
  readonly appearance: string;
  /** One line: what this resident is allowed to decide on their own. */
  readonly authority: string;
  readonly reportsTo: ResidentId | null;
  /** Domains this resident may produce work in. */
  readonly implementsDomains: readonly Domain[];
  /** Domains this resident may render an independent verdict on. */
  readonly verifiesDomains: readonly Domain[];
  /** Default model class. Individual tasks may route higher; never silently lower. */
  readonly modelClass: ModelClass;
  readonly tools: ToolEnvelope;
  /** What this resident must return. An output missing a contract field is not a submission. */
  readonly outputContract: readonly string[];
  /** Namespace in the Great Archive. Residents cannot read each other's private memory. */
  readonly memoryNamespace: string;
  /** True only for Pax. Exactly one resident may hold it. */
  readonly releaseAuthority: boolean;
}

const RESEARCH_TOOLS = ["read", "search", "web_search", "collection_search", "code_execution"];
const BUILD_TOOLS = ["read", "write", "search", "code_execution", "test_runner", "worktree"];
const NO_PRODUCTION = ["deployment", "credentials", "production_database", "payment_actions"];

export const RESIDENTS: readonly Resident[] = [
  {
    id: "atlas",
    name: "Atlas",
    title: "Chief executive agent · chief systems architect · chief of staff",
    district: "command-spire",
    appearance: "Graphite coat, luminous map gauntlet projecting the live task graph",
    authority: "Decomposition, routing, prioritization, resource allocation, re-planning on stall",
    reportsTo: null,
    implementsDomains: ["orchestration"],
    verifiesDomains: [],
    modelClass: "deep",
    tools: {
      allow: ["read", "search", "task_graph", "spawn_subagent", "spawn_workflow", "message"],
      deny: [...NO_PRODUCTION, "release_approve"],
    },
    outputContract: ["objective_interpretation", "success_criteria", "task_graph", "routing_plan", "risk_map"],
    memoryNamespace: "archive/atlas",
    releaseAuthority: false,
  },
  {
    id: "verity",
    name: "Verity",
    title: "Research director · investigative scientist",
    district: "observatory",
    appearance: "White-gold field jacket, prism visor resolving source constellations",
    authority: "Evidence and source standards; may reject a claim for insufficient sourcing",
    reportsTo: "atlas",
    implementsDomains: ["research"],
    verifiesDomains: ["knowledge"],
    modelClass: "deep",
    tools: { allow: [...RESEARCH_TOOLS, "swarm", "message"], deny: [...NO_PRODUCTION, "write"] },
    outputContract: ["findings", "evidence_ledger", "contradictions", "confidence", "open_questions"],
    memoryNamespace: "archive/verity",
    releaseAuthority: false,
  },
  {
    id: "nova",
    name: "Nova",
    title: "Chief product officer · strategist",
    district: "strategy-chamber",
    appearance: "Black suit, floating amber product cards rearranged mid-air",
    authority: "Product definition, scope and priority; may cut scope, may not cut a gate",
    reportsTo: "atlas",
    implementsDomains: ["product"],
    verifiesDomains: [],
    modelClass: "deep",
    tools: { allow: ["read", "search", "message", "task_graph"], deny: [...NO_PRODUCTION, "write"] },
    outputContract: ["product_definition", "acceptance_criteria", "priorities", "tradeoffs", "non_goals"],
    memoryNamespace: "archive/nova",
    releaseAuthority: false,
  },
  {
    id: "sol",
    name: "Sol",
    title: "Principal UX architect",
    district: "design-atelier",
    appearance: "Architectural cloak, grid lens overlaying flow diagrams on the room",
    authority: "Flows, information architecture, usability structure",
    reportsTo: "nova",
    implementsDomains: ["ux"],
    verifiesDomains: [],
    modelClass: "standard",
    tools: { allow: ["read", "search", "write", "message"], deny: NO_PRODUCTION },
    outputContract: ["flows", "information_architecture", "states", "edge_cases", "rationale"],
    memoryNamespace: "archive/sol",
    releaseAuthority: false,
  },
  {
    id: "iris",
    name: "Iris",
    title: "Creative director · visual systems",
    district: "design-atelier",
    appearance: "Chromatic modular jacket that shifts palette with the active design system",
    authority: "Art direction and the visual system",
    reportsTo: "nova",
    implementsDomains: ["visual"],
    verifiesDomains: [],
    modelClass: "standard",
    tools: { allow: ["read", "search", "write", "message"], deny: NO_PRODUCTION },
    outputContract: ["visual_system", "type_scale", "palette", "composition_rules", "rationale"],
    memoryNamespace: "archive/iris",
    releaseAuthority: false,
  },
  {
    id: "kinetic",
    name: "Kinetic",
    title: "Interaction and motion director",
    district: "motion-studio",
    appearance: "Animated edge suit, trailing the easing curve of whatever it last shipped",
    authority: "Motion language, state transitions, response behaviour",
    reportsTo: "nova",
    implementsDomains: ["motion"],
    verifiesDomains: [],
    modelClass: "standard",
    tools: { allow: ["read", "write", "code_execution", "message"], deny: NO_PRODUCTION },
    outputContract: ["motion_spec", "state_machine", "timing", "reduced_motion_fallback"],
    memoryNamespace: "archive/kinetic",
    releaseAuthority: false,
  },
  {
    id: "rune",
    name: "Rune",
    title: "Principal frontend engineer",
    district: "engineering-foundry",
    appearance: "Utility jacket, display bracers mirroring the current viewport",
    authority: "Client implementation",
    reportsTo: "atlas",
    implementsDomains: ["frontend"],
    verifiesDomains: [],
    modelClass: "standard",
    tools: { allow: BUILD_TOOLS.concat("message"), deny: NO_PRODUCTION },
    outputContract: ["implementation", "tests", "self_review_notes", "known_limitations"],
    memoryNamespace: "archive/rune",
    releaseAuthority: false,
  },
  {
    id: "vector",
    name: "Vector",
    title: "Principal systems / backend architect",
    district: "systems-foundry",
    appearance: "Dark shell, topology projection orbiting one shoulder",
    authority: "Data models, APIs, infrastructure design",
    reportsTo: "atlas",
    implementsDomains: ["backend"],
    verifiesDomains: [],
    modelClass: "deep",
    tools: { allow: BUILD_TOOLS.concat("message"), deny: ["credentials", "payment_actions", "deployment"] },
    outputContract: ["system_design", "interfaces", "data_model", "failure_modes", "implementation"],
    memoryNamespace: "archive/vector",
    releaseAuthority: false,
  },
  {
    id: "aegis",
    name: "Aegis",
    title: "Chief security engineer",
    district: "security-citadel",
    appearance: "Armored silhouette, shield insignia lit by whatever it is currently refusing",
    authority: "Permissions, privacy, threat review; may block release unilaterally",
    reportsTo: "atlas",
    implementsDomains: ["security"],
    verifiesDomains: ["frontend", "backend", "product", "quality", "adversarial", "knowledge"],
    modelClass: "deep",
    tools: { allow: ["read", "search", "code_execution", "security_scan", "message"], deny: ["write", "deployment", "payment_actions"] },
    outputContract: ["threat_model", "findings", "severity", "evidence", "required_mitigations"],
    memoryNamespace: "archive/aegis",
    releaseAuthority: false,
  },
  {
    id: "argus",
    name: "Argus",
    title: "Director of QA and evaluation",
    district: "verification-arena",
    appearance: "Multi-lens visor, each lens locked to a different acceptance criterion",
    authority: "Independent validation; a failed verdict is not appealable without new evidence",
    reportsTo: "atlas",
    implementsDomains: ["quality"],
    verifiesDomains: [
      "orchestration",
      "research",
      "product",
      "ux",
      "visual",
      "motion",
      "frontend",
      "backend",
      "security",
      "performance",
      "accessibility",
      "adversarial",
      "knowledge",
    ],
    modelClass: "standard",
    tools: { allow: ["read", "search", "code_execution", "test_runner", "browser_run", "message"], deny: ["write", ...NO_PRODUCTION] },
    outputContract: ["verdict", "method", "evidence", "reproduction", "severity"],
    memoryNamespace: "archive/argus",
    releaseAuthority: false,
  },
  {
    id: "flux",
    name: "Flux",
    title: "Performance specialist",
    district: "performance-lab",
    appearance: "Live telemetry suit streaming frame times down both sleeves",
    authority: "Latency, load and rendering budgets; may block release on a budget breach",
    reportsTo: "atlas",
    implementsDomains: ["performance"],
    verifiesDomains: ["frontend", "backend", "motion"],
    modelClass: "standard",
    tools: { allow: ["read", "code_execution", "performance_profiler", "test_runner", "message"], deny: ["write", ...NO_PRODUCTION] },
    outputContract: ["benchmark_before", "benchmark_after", "budget", "verdict", "evidence"],
    memoryNamespace: "archive/flux",
    releaseAuthority: false,
  },
  {
    id: "mercy",
    name: "Mercy",
    title: "Accessibility and human-factors lead",
    district: "civic-hall",
    appearance: "High-contrast technical uniform, deliberately legible at any zoom",
    authority: "Inclusive usability; may block release on a conformance failure",
    reportsTo: "atlas",
    implementsDomains: ["accessibility"],
    verifiesDomains: ["ux", "visual", "frontend", "motion", "product"],
    modelClass: "standard",
    tools: { allow: ["read", "search", "code_execution", "a11y_audit", "browser_run", "message"], deny: ["write", ...NO_PRODUCTION] },
    outputContract: ["conformance_findings", "severity", "affected_users", "evidence", "required_fixes"],
    memoryNamespace: "archive/mercy",
    releaseAuthority: false,
  },
  {
    id: "nyx",
    name: "Nyx",
    title: "Red-team critic · professional skeptic",
    district: "red-team-annex",
    appearance: "Matte cloak, diagnostic monocle; casts no reflection on the marketing render",
    authority: "Break assumptions; findings cannot be closed by the author of the artifact",
    reportsTo: "atlas",
    implementsDomains: ["adversarial"],
    verifiesDomains: [
      "orchestration",
      "product",
      "research",
      "frontend",
      "backend",
      "security",
      "ux",
      "quality",
      "performance",
      "accessibility",
      "release",
    ],
    modelClass: "deep",
    tools: { allow: ["read", "search", "code_execution", "browser_run", "message"], deny: ["write", ...NO_PRODUCTION] },
    outputContract: ["pre_mortem", "failure_modes", "unexamined_assumptions", "contradictions", "severity"],
    memoryNamespace: "archive/nyx",
    releaseAuthority: false,
  },
  {
    id: "mnemos",
    name: "Mnemos",
    title: "Knowledge and memory architect",
    district: "great-archive",
    appearance: "Indexed memory modules orbiting in provenance order, newest closest",
    authority: "Provenance and durable context; may refuse to archive an unsourced claim",
    reportsTo: "atlas",
    implementsDomains: ["knowledge"],
    verifiesDomains: ["research"],
    modelClass: "fast",
    tools: { allow: ["read", "search", "write", "collection_search", "message"], deny: NO_PRODUCTION },
    outputContract: ["index_entry", "provenance", "supersedes", "retention_class"],
    memoryNamespace: "archive/mnemos",
    releaseAuthority: false,
  },
  {
    id: "pax",
    name: "Pax",
    title: "Release governor",
    district: "release-tower",
    appearance: "White formal uniform, launch key that will not turn while a gate is red",
    authority: "Final release authority; may only approve against a complete evidence manifest",
    reportsTo: null,
    implementsDomains: ["release"],
    // Pax does not *verify* anything: it adjudicates a deterministic gate matrix against an
    // evidence manifest. Its own decision is checked independently by Nyx, so Article 6 holds
    // here with no exception — and the roster deliberately contains none.
    verifiesDomains: [],
    modelClass: "deep",
    tools: { allow: ["read", "search", "release_approve", "message"], deny: ["write", "code_execution", "deployment"] },
    outputContract: ["evidence_manifest", "gate_matrix", "decision", "outstanding_work"],
    memoryNamespace: "archive/pax",
    releaseAuthority: true,
  },
] as const;

export const RESIDENT_INDEX: ReadonlyMap<ResidentId, Resident> = new Map(
  RESIDENTS.map((r) => [r.id, r] as const),
);

export function resident(id: ResidentId): Resident {
  const r = RESIDENT_INDEX.get(id);
  if (!r) throw new Error(`unknown resident: ${id}`);
  return r;
}

/** The Adversarial Quality Council — the residents whose verdicts can block a release. */
export const QUALITY_COUNCIL: readonly ResidentId[] = ["argus", "nyx", "aegis", "mercy", "flux"] as const;

/** Which resident owns work in a given domain. Exactly one owner per domain, always. */
export const DOMAIN_OWNER: Readonly<Record<Domain, ResidentId>> = {
  orchestration: "atlas",
  research: "verity",
  product: "nova",
  ux: "sol",
  visual: "iris",
  motion: "kinetic",
  frontend: "rune",
  backend: "vector",
  security: "aegis",
  quality: "argus",
  performance: "flux",
  accessibility: "mercy",
  adversarial: "nyx",
  knowledge: "mnemos",
  release: "pax",
};

/** District a resident is normally found in. Movement events are relative to this home. */
export function homeDistrict(id: ResidentId): District {
  return resident(id).district;
}

export function verifiersFor(domain: Domain): readonly ResidentId[] {
  return RESIDENTS.filter((r) => r.verifiesDomains.includes(domain)).map((r) => r.id);
}
