/**
 * The evidence layer.
 *
 * Every material claim carries a pointer to the thing that makes it true. No pointer, no
 * `verified` — and the ledger enforces that rather than trusting callers to remember it.
 *
 * A pointer is a URI whose scheme names the *kind* of evidence, so a reviewer can tell at a
 * glance whether a claim rests on an executed test or on someone's opinion:
 *
 *     test://checkout/decline-01        an executed test case
 *     browser://run/889                 a recorded browser session
 *     build://sha/45fa0c1               a specific build
 *     bench://render/frame-time-p95     a measured benchmark
 *     scan://security/dep-audit-12      a security scan result
 *     audit://a11y/contrast-sweep-3     an accessibility audit
 *     source://https/example.org/spec   an external source
 *     review://nyx/pre-mortem-4         an independent review record
 *     trace://span/9f2c                 an execution trace
 */

import { violation, type Violation } from "./constitution.js";

export const EVIDENCE_KINDS = [
  "test",
  "browser",
  "build",
  "bench",
  "scan",
  "audit",
  "source",
  "review",
  "trace",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** Kinds that constitute *executed* verification. An opinion is not one of these. */
export const EXECUTED_KINDS: readonly EvidenceKind[] = ["test", "browser", "bench", "scan", "audit", "trace"];

/**
 * `verified` is reserved for executed evidence. Research is not executed, so a well-sourced
 * research claim is `sourced` — a real status with a real requirement, rather than a claim
 * quietly promoted to `verified` because it was well written.
 */
export type ClaimStatus = "verified" | "sourced" | "refuted" | "unsubstantiated" | "contested";

export interface EvidencePointer {
  readonly kind: EvidenceKind;
  readonly path: string;
  readonly uri: string;
}

export interface Claim {
  readonly id: string;
  readonly claim: string;
  readonly status: ClaimStatus;
  readonly pointers: readonly EvidencePointer[];
  readonly recordedBy: string;
  readonly at: number;
  readonly taskId?: string;
  /** Id of an earlier claim this one resolves. The ledger is append-only; nothing is edited. */
  readonly supersedes?: string;
}

export function parsePointer(uri: string): EvidencePointer | null {
  const m = /^([a-z_]+):\/\/(.+)$/.exec(uri.trim());
  if (!m) return null;
  const [, scheme, path] = m;
  if (!scheme || !path) return null;
  if (!(EVIDENCE_KINDS as readonly string[]).includes(scheme)) return null;
  return { kind: scheme as EvidenceKind, path, uri: uri.trim() };
}

export class EvidenceRejected extends Error {
  constructor(
    message: string,
    readonly violation: Violation,
  ) {
    super(message);
    this.name = "EvidenceRejected";
  }
}

export interface RecordClaimInput {
  readonly claim: string;
  readonly status: ClaimStatus;
  readonly pointers: readonly string[];
  readonly recordedBy: string;
  readonly taskId?: string;
  readonly supersedes?: string;
}

/**
 * The evidence ledger. Append-only by construction: there is no update or delete, because a
 * claim that can be quietly rewritten is not evidence of anything.
 */
export class EvidenceLedger {
  readonly #claims: Claim[] = [];
  readonly #known = new Set<string>();
  #seq = 0;

  /** Register a real artifact so pointers to it resolve. Unregistered pointers are dangling. */
  register(uri: string): void {
    const p = parsePointer(uri);
    if (p) this.#known.add(p.uri);
  }

  registerAll(uris: readonly string[]): void {
    for (const u of uris) this.register(u);
  }

  has(uri: string): boolean {
    return this.#known.has(uri.trim());
  }

  /**
   * Record a claim. Article 2 is enforced here: a `verified` claim must carry at least one
   * *executed* pointer that resolves to a registered artifact. Everything else may be
   * recorded, but only under a status that says what it actually is.
   */
  record(input: RecordClaimInput): Claim {
    const parsed: EvidencePointer[] = [];
    const malformed: string[] = [];
    for (const raw of input.pointers) {
      const p = parsePointer(raw);
      if (p) parsed.push(p);
      else malformed.push(raw);
    }

    if (input.status === "sourced") {
      const resolvable = parsed.filter((p) => this.#known.has(p.uri));
      if (resolvable.length === 0) {
        const v = violation(
          "A2_CONFIDENCE_IS_NOT_TRUTH",
          input.claim,
          parsed.length === 0
            ? "no source pointer supplied; a claim with no source is not sourced"
            : `source pointer(s) do not resolve: ${parsed.map((p) => p.uri).join(", ")}`,
        );
        throw new EvidenceRejected(`cannot record "${input.claim}" as sourced — ${v.detail}`, v);
      }
    }

    if (input.status === "verified") {
      if (malformed.length > 0) {
        const v = violation(
          "A2_CONFIDENCE_IS_NOT_TRUTH",
          input.claim,
          `malformed evidence pointer(s): ${malformed.join(", ")}`,
        );
        throw new EvidenceRejected(`cannot verify "${input.claim}" — ${v.detail}`, v);
      }
      const executed = parsed.filter((p) => EXECUTED_KINDS.includes(p.kind));
      if (executed.length === 0) {
        const v = violation(
          "A2_CONFIDENCE_IS_NOT_TRUTH",
          input.claim,
          parsed.length === 0
            ? "no evidence pointer supplied"
            : `only non-executed evidence supplied (${parsed.map((p) => p.kind).join(", ")}); a claim is not verified by an opinion`,
        );
        throw new EvidenceRejected(`cannot verify "${input.claim}" — ${v.detail}`, v);
      }
      const dangling = executed.filter((p) => !this.#known.has(p.uri));
      if (dangling.length > 0) {
        const v = violation(
          "A2_CONFIDENCE_IS_NOT_TRUTH",
          input.claim,
          `evidence pointer(s) do not resolve to a recorded artifact: ${dangling.map((p) => p.uri).join(", ")}`,
        );
        throw new EvidenceRejected(`cannot verify "${input.claim}" — ${v.detail}`, v);
      }
    }

    const claim: Claim = {
      id: `evd-${String(++this.#seq).padStart(4, "0")}`,
      claim: input.claim,
      status: input.status,
      pointers: parsed,
      recordedBy: input.recordedBy,
      at: Date.now(),
      ...(input.taskId ? { taskId: input.taskId } : {}),
      ...(input.supersedes ? { supersedes: input.supersedes } : {}),
    };
    this.#claims.push(claim);
    return claim;
  }

  get claims(): readonly Claim[] {
    return this.#claims;
  }

  byTask(taskId: string): readonly Claim[] {
    return this.#claims.filter((c) => c.taskId === taskId);
  }

  byStatus(status: ClaimStatus): readonly Claim[] {
    return this.#claims.filter((c) => c.status === status);
  }

  get sourceCount(): number {
    const uris = new Set<string>();
    for (const c of this.#claims) for (const p of c.pointers) uris.add(p.uri);
    return uris.size;
  }

  /**
   * Contested claims still awaiting a resolution.
   *
   * A contradiction is surfaced, never averaged away — but it is also not a permanent block.
   * Recording a later claim that `supersedes` it is how the organization resolves one, and
   * that resolution is itself a claim with its own evidence requirement.
   */
  get contested(): readonly Claim[] {
    const resolved = new Set(this.#claims.map((c) => c.supersedes).filter(Boolean));
    return this.byStatus("contested").filter((c) => !resolved.has(c.id));
  }

  /** Claims resting on sources rather than execution. Legitimate, and never `verified`. */
  get sourced(): readonly Claim[] {
    return this.byStatus("sourced");
  }
}
