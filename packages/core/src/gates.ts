/**
 * Release gates — the Release Tower's locks.
 *
 * Fail-closed by construction: a gate whose evidence has not been produced evaluates to
 * `unknown`, and `unknown` blocks. This is the difference between "we found no problem" and
 * "we looked and there was no problem", and the whole design turns on it.
 *
 * The launch sequence cannot occur while a blocking gate is red. Not "should not" — the
 * approval function has no branch that returns `approved` with a red gate.
 */

import type { ResidentId } from "./residents.js";
import type { EvidenceLedger } from "./evidence.js";
import type { TaskGraph } from "./tasks.js";
import type { Degradation } from "./routing.js";
import type { Violation } from "./constitution.js";

export type GateStatus = "pass" | "fail" | "unknown";

export interface GateContext {
  readonly tasks: TaskGraph;
  readonly evidence: EvidenceLedger;
  readonly degradations: readonly Degradation[];
  readonly violations: readonly Violation[];
  /** Verdicts recorded by each council member, keyed by resident. */
  readonly councilVerdicts: ReadonlyMap<ResidentId, { passed: boolean; summary: string; evidenceIds: readonly string[] }>;
}

export interface GateResult {
  readonly gateId: string;
  readonly title: string;
  readonly owner: ResidentId;
  readonly status: GateStatus;
  readonly detail: string;
  readonly blocking: boolean;
}

export interface Gate {
  readonly id: string;
  readonly title: string;
  readonly owner: ResidentId;
  /** A non-blocking gate is advisory. There are deliberately very few of them. */
  readonly blocking: boolean;
  evaluate(ctx: GateContext): { status: GateStatus; detail: string };
}

function councilGate(id: string, title: string, owner: ResidentId): Gate {
  return {
    id,
    title,
    owner,
    blocking: true,
    evaluate(ctx) {
      const verdict = ctx.councilVerdicts.get(owner);
      if (!verdict) {
        return { status: "unknown", detail: `${owner} has not reported; unknown is not a pass` };
      }
      return verdict.passed
        ? { status: "pass", detail: `${verdict.summary} (${verdict.evidenceIds.length} evidence record(s))` }
        : { status: "fail", detail: verdict.summary };
    },
  };
}

export const RELEASE_GATES: readonly Gate[] = [
  councilGate("functional", "Functional verification", "argus"),
  councilGate("security", "Security and privacy review", "aegis"),
  councilGate("accessibility", "Accessibility conformance", "mercy"),
  councilGate("performance", "Performance budgets", "flux"),
  councilGate("adversarial", "Adversarial review", "nyx"),
  {
    id: "task_completion",
    title: "All release-scoped tasks complete",
    owner: "atlas",
    blocking: true,
    evaluate(ctx) {
      const open = ctx.tasks.all.filter((t) => t.state !== "complete");
      if (ctx.tasks.size === 0) return { status: "unknown", detail: "no tasks in scope" };
      if (open.length === 0) return { status: "pass", detail: `${ctx.tasks.size} task(s) complete` };
      const failed = open.filter((t) => t.state === "failed" || t.state === "blocked");
      return {
        status: failed.length > 0 ? "fail" : "unknown",
        detail: `${open.length} task(s) not complete: ${open.slice(0, 5).map((t) => `${t.id}[${t.state}]`).join(", ")}${open.length > 5 ? " …" : ""}`,
      };
    },
  },
  {
    id: "evidence_completeness",
    title: "Evidence manifest complete",
    owner: "pax",
    blocking: true,
    evaluate(ctx) {
      const verified = ctx.evidence.byStatus("verified").length;
      const unsubstantiated = ctx.evidence.byStatus("unsubstantiated");
      const contested = ctx.evidence.contested;
      if (verified === 0) return { status: "unknown", detail: "no verified claims recorded" };
      if (contested.length > 0) {
        return {
          status: "fail",
          detail: `${contested.length} contested claim(s) awaiting resolution: ${contested.map((c) => c.claim).slice(0, 3).join("; ")}`,
        };
      }
      if (unsubstantiated.length > 0) {
        return {
          status: "fail",
          detail: `${unsubstantiated.length} claim(s) carry no resolvable evidence: ${unsubstantiated.map((c) => c.claim).slice(0, 3).join("; ")}`,
        };
      }
      const sourced = ctx.evidence.sourced.length;
      return {
        status: "pass",
        detail:
          `${verified} verified claim(s)` +
          (sourced > 0 ? ` and ${sourced} sourced claim(s)` : "") +
          ` across ${ctx.evidence.sourceCount} evidence record(s)`,
      };
    },
  },
  {
    id: "provenance",
    title: "Decision provenance archived",
    owner: "mnemos",
    blocking: true,
    evaluate(ctx) {
      const withPointers = ctx.evidence.claims.filter((c) => c.pointers.length > 0).length;
      if (ctx.evidence.claims.length === 0) return { status: "unknown", detail: "archive empty" };
      const ratio = withPointers / ctx.evidence.claims.length;
      return ratio === 1
        ? { status: "pass", detail: `${withPointers} claim(s) archived with provenance` }
        : { status: "fail", detail: `${ctx.evidence.claims.length - withPointers} archived claim(s) lack provenance` };
    },
  },
  {
    id: "capability_route",
    title: "Maximum-capability route honoured",
    owner: "atlas",
    blocking: true,
    evaluate(ctx) {
      if (ctx.degradations.length === 0) {
        return { status: "pass", detail: "every required capability route was available and used" };
      }
      return {
        status: "fail",
        detail:
          `maximum-capability route unavailable: ` +
          ctx.degradations.map((d) => `${d.capability} (wanted ${d.requested}, used ${d.used})`).join("; "),
      };
    },
  },
  {
    id: "constitutional_integrity",
    title: "No unresolved constitutional violations",
    owner: "pax",
    blocking: true,
    evaluate(ctx) {
      if (ctx.violations.length === 0) return { status: "pass", detail: "no violations recorded" };
      return {
        status: "fail",
        detail: `${ctx.violations.length} violation(s): ${ctx.violations.map((v) => v.article).join(", ")}`,
      };
    },
  },
];

export interface ReleaseManifest {
  readonly id: string;
  readonly objectiveId: string;
  readonly decision: "approved" | "blocked";
  readonly gates: readonly GateResult[];
  readonly blockingGates: readonly string[];
  /** Named work that must still happen. Empty only when the decision is `approved`. */
  readonly outstanding: readonly string[];
  readonly at: number;
}

export function evaluateGate(gate: Gate, ctx: GateContext): GateResult {
  const { status, detail } = gate.evaluate(ctx);
  return { gateId: gate.id, title: gate.title, owner: gate.owner, status, detail, blocking: gate.blocking };
}

/**
 * Evaluate the whole matrix. There is exactly one way to reach `approved`: every blocking
 * gate returns `pass`. `unknown` is not neutral — it is the absence of the evidence the gate
 * exists to demand, which is precisely what Article 4 forbids treating as readiness.
 */
export function evaluateRelease(
  objectiveId: string,
  ctx: GateContext,
  gates: readonly Gate[] = RELEASE_GATES,
): ReleaseManifest {
  const results = gates.map((g) => evaluateGate(g, ctx));
  const blocking = results.filter((r) => r.blocking && r.status !== "pass");
  const outstanding: string[] = blocking.map((r) => `${r.title} — ${r.detail}`);
  for (const d of ctx.degradations) {
    outstanding.push(`${d.capability}: ${d.consequence}`);
  }
  return {
    id: `rel-${objectiveId}`,
    objectiveId,
    decision: blocking.length === 0 ? "approved" : "blocked",
    gates: results,
    blockingGates: blocking.map((r) => r.gateId),
    outstanding,
    at: Date.now(),
  };
}

/** The report Pax posts on the Release Tower door. Deliberately blunt. */
export function renderManifest(m: ReleaseManifest): string {
  const lines: string[] = [];
  const width = 74;
  lines.push("═".repeat(width));
  lines.push(m.decision === "approved" ? "RELEASE APPROVED" : "QUALITY GATE: NOT SATISFIED");
  lines.push("═".repeat(width));
  lines.push(`Manifest:  ${m.id}`);
  lines.push(`Objective: ${m.objectiveId}`);
  lines.push("");
  lines.push("GATE MATRIX");
  for (const g of m.gates) {
    const mark = g.status === "pass" ? "✔" : g.status === "fail" ? "✘" : "?";
    lines.push(`  ${mark} ${g.gateId.padEnd(26)} ${g.status.toUpperCase().padEnd(8)} ${g.owner.padEnd(8)} ${g.detail}`);
  }
  if (m.outstanding.length > 0) {
    lines.push("");
    lines.push("OUTSTANDING");
    for (const o of m.outstanding) lines.push(`  - ${o}`);
  }
  lines.push("");
  lines.push(`RELEASE STATUS: ${m.decision === "approved" ? "APPROVED" : "BLOCKED"}`);
  lines.push("═".repeat(width));
  return lines.join("\n");
}
