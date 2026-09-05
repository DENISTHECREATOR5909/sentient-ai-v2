/**
 * The agent executor interface.
 *
 * An executor is the *body* an agent's role contract is animated by. The organization's laws,
 * routing, gates and evidence rules live one level up and do not change when the body does —
 * which is the point: the constitution must hold whether a task was carried out by Opus 5 or
 * by a deterministic stand-in.
 *
 * Two executors ship:
 *   • `ClaudeExecutor`    — real model calls.
 *   • `RehearsalExecutor` — deterministic, offline, and *honest about being a rehearsal*:
 *                           it records a capability degradation, which blocks release.
 */

import type { Resident, ModelRoute, Task, Domain } from "@agent-city/core";

export interface AgentAssignment {
  readonly task: Task;
  readonly resident: Resident;
  readonly route: ModelRoute;
  /** Prior artifacts and findings this agent is entitled to see. */
  readonly context: readonly ContextItem[];
  /** Set on a repair cycle: what the verifier said was wrong. */
  readonly repairBrief?: string;
  readonly cycle: number;
}

export interface ContextItem {
  readonly from: string;
  readonly kind: string;
  readonly summary: string;
  readonly detail?: string;
}

export interface ProducedArtifact {
  readonly kind: string;
  readonly summary: string;
  /** Evidence URI this artifact is registered under, when it is executable evidence. */
  readonly evidenceUri?: string;
  readonly detail?: string;
}

export interface AgentOutput {
  /** One line, for the activity ticker. Never chain of thought. */
  readonly summary: string;
  readonly artifacts: readonly ProducedArtifact[];
  /** Claims this agent asserts, each with the pointers that would make it verifiable. */
  readonly claims: readonly { claim: string; pointers: readonly string[]; substantiated: boolean }[];
  /** Structured messages to other residents. */
  readonly messages: readonly { to: string; subject: string; body: string }[];
  readonly tokensIn: number;
  readonly tokensOut: number;
  /** Set when this executor could not do the work at the requested capability. */
  readonly degraded?: { requested: string; used: string; consequence: string };
}

export interface VerificationAssignment {
  readonly task: Task;
  readonly verifier: Resident;
  readonly route: ModelRoute;
  readonly method: string;
  readonly artifacts: readonly ProducedArtifact[];
  readonly cycle: number;
}

export interface VerificationOutput {
  readonly passed: boolean;
  readonly summary: string;
  /** Executed-evidence URIs the verification produced. Required for a pass. */
  readonly evidenceUris: readonly string[];
  readonly requiredAction: "repair_and_retest" | "redesign" | "escalate" | "none";
  readonly tokensIn: number;
  readonly tokensOut: number;
}

export interface ResearchQuestion {
  readonly question: string;
  readonly branches: readonly string[];
}

export interface ResearchFinding {
  readonly worker: string;
  readonly branch: string;
  readonly finding: string;
  readonly sources: readonly string[];
  readonly confidence: number;
}

export interface Executor {
  /** Human-readable name, shown in the city's status bar so the mode is never ambiguous. */
  readonly name: string;
  /** `live` means real model calls. `rehearsal` means the release gate will block. */
  readonly mode: "live" | "rehearsal";

  interpret(objective: string, route: ModelRoute): Promise<{
    successCriteria: readonly string[];
    risks: readonly string[];
    uncertainties: readonly string[];
    tokensIn: number;
    tokensOut: number;
  }>;

  perform(assignment: AgentAssignment): Promise<AgentOutput>;

  verify(assignment: VerificationAssignment): Promise<VerificationOutput>;

  investigate(
    branch: string,
    worker: string,
    question: ResearchQuestion,
    route: ModelRoute,
  ): Promise<ResearchFinding>;

  synthesize(
    question: ResearchQuestion,
    findings: readonly ResearchFinding[],
    route: ModelRoute,
  ): Promise<{ summary: string; claims: readonly { claim: string; pointers: readonly string[]; substantiated: boolean }[]; contradictions: readonly string[]; tokensIn: number; tokensOut: number }>;
}

/** Methods a verifier can use, mapped to the domain each verifier owns judgement over. */
export const VERIFICATION_METHODS: Readonly<Record<string, { method: string; evidenceScheme: string }>> = {
  argus: { method: "functional_test", evidenceScheme: "test" },
  aegis: { method: "security_scan", evidenceScheme: "scan" },
  mercy: { method: "a11y_audit", evidenceScheme: "audit" },
  flux: { method: "performance_benchmark", evidenceScheme: "bench" },
  nyx: { method: "adversarial_review", evidenceScheme: "browser" },
  pax: { method: "evidence_manifest", evidenceScheme: "trace" },
  mnemos: { method: "provenance_check", evidenceScheme: "trace" },
  verity: { method: "source_check", evidenceScheme: "trace" },
};

export function methodFor(verifier: string): { method: string; evidenceScheme: string } {
  return VERIFICATION_METHODS[verifier] ?? { method: "independent_review", evidenceScheme: "browser" };
}

/** Domains whose artifacts a given verification method is competent to judge. */
export const METHOD_DOMAINS: Readonly<Record<string, readonly Domain[]>> = {
  functional_test: ["frontend", "backend", "product", "ux", "motion"],
  security_scan: ["frontend", "backend", "security"],
  a11y_audit: ["frontend", "ux", "visual", "motion"],
  performance_benchmark: ["frontend", "backend", "motion", "performance"],
  adversarial_review: ["product", "research", "frontend", "backend", "security", "ux"],
};
