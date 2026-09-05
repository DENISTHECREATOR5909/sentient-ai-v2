/**
 * The permission layer.
 *
 * Two separate ideas, deliberately kept separate:
 *   • **Permission** — is this agent allowed to attempt this action at all?
 *   • **Sandbox**    — supposing it is allowed, what can the action actually reach?
 *
 * A permitted action inside a tight sandbox is still constrained; a denied action is never
 * attempted. Conflating the two is how systems end up believing an approval widened a
 * boundary it never touched.
 *
 * Deny always beats allow. There is no priority ordering, no "most specific wins", no escape
 * hatch — a rule that can be out-argued is not a constraint.
 */

import type { Domain, Resident, ResidentId } from "./residents.js";
import { RESIDENTS, resident } from "./residents.js";
import { violation, type Violation } from "./constitution.js";

export type Reversibility = "reversible" | "consequential" | "irreversible";

export interface ActionRequest {
  readonly agent: ResidentId | string;
  readonly tool: string;
  /** What the agent intends to do with the tool, for the audit record. */
  readonly intent: string;
  readonly taskId?: string;
  readonly reversibility?: Reversibility;
}

export type DecisionOutcome = "allow" | "deny" | "escalate";

export interface Decision {
  readonly outcome: DecisionOutcome;
  /** The rule that produced this outcome, quoted so the denial is explainable. */
  readonly rule: string;
  readonly request: ActionRequest;
}

/**
 * Actions that cannot be undone by the organization acting alone. These never proceed on an
 * agent's own authority, however confident the agent is (Article 7).
 */
export const IRREVERSIBLE_TOOLS: readonly string[] = [
  "deployment",
  "payment_actions",
  "production_database",
  "credentials",
  "external_publish",
  "email_send",
  "dns_change",
  "data_deletion",
] as const;

/** Organization-wide denials. No resident may hold these, and no genome may request them. */
export const GLOBAL_DENY: readonly string[] = ["credential_exfiltration", "audit_log_delete", "gate_override"] as const;

export interface PolicyOptions {
  /** Tools the owner has explicitly authorized for this run. Absent ⇒ nothing irreversible. */
  readonly ownerGrants?: readonly string[];
}

/**
 * Evaluate one action against the layered policy.
 *
 * Order matters only in that deny is checked first and cannot be reached past. Everything
 * after it is a narrowing, never a widening.
 */
export function evaluateAction(agentResident: Resident, req: ActionRequest, opts: PolicyOptions = {}): Decision {
  const grants = new Set(opts.ownerGrants ?? []);

  // 1. Global deny — beats everything, including an owner grant.
  if (GLOBAL_DENY.includes(req.tool)) {
    return { outcome: "deny", rule: `GLOBAL_DENY includes "${req.tool}"`, request: req };
  }

  // 2. Role deny — the resident's own envelope. Deny precedence within the envelope too.
  if (agentResident.tools.deny.includes(req.tool)) {
    return {
      outcome: "deny",
      rule: `${agentResident.name}'s envelope denies "${req.tool}"`,
      request: req,
    };
  }

  // 3. Irreversible actions escalate unless the owner granted them for this run.
  const reversibility = req.reversibility ?? (IRREVERSIBLE_TOOLS.includes(req.tool) ? "irreversible" : "reversible");
  if (reversibility === "irreversible" && !grants.has(req.tool)) {
    return {
      outcome: "escalate",
      rule: `"${req.tool}" is irreversible and carries no owner grant for this run`,
      request: req,
    };
  }

  // 4. Allow-list. Absence from the allow list is a denial, not a maybe: the envelope is
  //    closed by default so a new tool cannot appear by simply not being mentioned.
  if (!agentResident.tools.allow.includes(req.tool)) {
    return {
      outcome: "deny",
      rule: `${agentResident.name}'s envelope does not grant "${req.tool}" (closed by default)`,
      request: req,
    };
  }

  return { outcome: "allow", rule: `${agentResident.name} is granted "${req.tool}"`, request: req };
}

export function evaluateFor(agentId: ResidentId, req: Omit<ActionRequest, "agent">, opts?: PolicyOptions): Decision {
  return evaluateAction(resident(agentId), { ...req, agent: agentId }, opts);
}

/**
 * Article 6. The set of agents that implemented an artifact and the set that judge it must
 * be disjoint — not "should be", and not "unless the schedule is tight".
 */
export function checkSeparationOfPowers(
  implementers: readonly ResidentId[],
  verifiers: readonly ResidentId[],
  subject: string,
): Violation | null {
  const overlap = verifiers.filter((v) => implementers.includes(v));
  if (overlap.length === 0) return null;
  return violation(
    "A6_BUILDER_IS_NOT_JUDGE",
    subject,
    `${overlap.join(", ")} appear as both implementer and verifier`,
  );
}

/** Residents who may render an independent verdict on `domain` without being its builder. */
export function independentVerifiers(domain: Domain, implementers: readonly ResidentId[]): readonly ResidentId[] {
  return RESIDENTS.filter((r) => r.verifiesDomains.includes(domain) && !implementers.includes(r.id)).map((r) => r.id);
}

/** Exactly one resident may hold release authority. More than one is a governance failure. */
export function checkReleaseAuthority(): Violation | null {
  const holders = RESIDENTS.filter((r) => r.releaseAuthority);
  if (holders.length === 1) return null;
  return violation(
    "A6_BUILDER_IS_NOT_JUDGE",
    "release-authority",
    `expected exactly one release authority, found ${holders.length} (${holders.map((h) => h.id).join(", ") || "none"})`,
  );
}

/**
 * The PreToolUse hook layer.
 *
 * Hooks are genuinely useful — they intercept a tool call before it executes — but a hook
 * that crashes, times out or emits malformed output **fails open**: execution proceeds unless
 * the hook explicitly returned a denial. That single property is why a hook is never the sole
 * enforcement mechanism for anything the Prime Directive depends on.
 *
 * `runHook` therefore reports the fail-open outcome honestly rather than pretending a crashed
 * hook denied anything, and callers are expected to have already consulted `evaluateAction`.
 */
export interface HookResult {
  readonly denied: boolean;
  readonly reason: string;
  /** True when the hook did not return a usable verdict and execution proceeded regardless. */
  readonly failedOpen: boolean;
}

export function runHook(hook: ((req: ActionRequest) => boolean | string) | undefined, req: ActionRequest): HookResult {
  if (!hook) return { denied: false, reason: "no hook installed", failedOpen: true };
  try {
    const out = hook(req);
    if (typeof out === "string") return { denied: true, reason: out, failedOpen: false };
    if (out === true) return { denied: false, reason: "hook approved", failedOpen: false };
    if (out === false) return { denied: true, reason: "hook denied", failedOpen: false };
    return { denied: false, reason: "hook returned a malformed verdict", failedOpen: true };
  } catch (err) {
    return {
      denied: false,
      reason: `hook threw (${err instanceof Error ? err.message : String(err)}); execution proceeds — this is why hooks are never the only layer`,
      failedOpen: true,
    };
  }
}
