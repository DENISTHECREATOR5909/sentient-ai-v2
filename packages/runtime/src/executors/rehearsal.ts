/**
 * The rehearsal executor.
 *
 * It runs the whole organization — the task graph, the swarm fan-out, the repair loop, the
 * gate matrix — without making a single model call. Every step is deterministic from a seed,
 * so a run is reproducible and a failure is diagnosable.
 *
 * What it deliberately does *not* do is pretend. Article 8 is the reason this file exists in
 * the shape it does: a rehearsal declares a capability degradation on its very first act, so
 * the release gate blocks and the manifest names what was never actually done. A rehearsal can
 * demonstrate the machine. It cannot produce a release.
 */

import { createRng, hash32, type ModelRoute } from "@agent-city/core";
import type {
  AgentAssignment,
  AgentOutput,
  Executor,
  ResearchFinding,
  ResearchQuestion,
  VerificationAssignment,
  VerificationOutput,
} from "../executor.js";
import { methodFor } from "../executor.js";

export interface RehearsalOptions {
  readonly seed?: string;
  /**
   * Probability that a first-cycle artifact carries a defect the council will catch. The
   * default is high on purpose: a demonstration in which nothing ever fails teaches nothing
   * about a system whose entire thesis is what happens when something does.
   */
  readonly defectRate?: number;
}

/** A defect that survives one repair — some things are not fixed on the first try. */
function stubborn(taskId: string, verifier: string): boolean {
  return hash32(`stubborn:${taskId}:${verifier}`) % 5 === 0;
}

function defective(seed: string, taskId: string, verifier: string, cycle: number, rate: number): boolean {
  if (cycle === 0) {
    return createRng(`${seed}:defect:${taskId}:${verifier}`)() < rate;
  }
  if (cycle === 1) {
    return stubborn(taskId, verifier) && createRng(`${seed}:defect2:${taskId}:${verifier}`)() < rate;
  }
  return false; // The repair loop is allowed unlimited internal correction; it is not allowed to loop forever.
}

const DEFECTS: Readonly<Record<string, readonly string[]>> = {
  functional_test: [
    "form state is lost after a failed submission",
    "the empty state renders before the first fetch resolves",
    "a second click re-submits the request",
    "the error path leaves the control disabled",
  ],
  security_scan: [
    "an identifier is interpolated into a query without parameterisation",
    "the session cookie is missing SameSite",
    "an error response echoes the request body back to the client",
  ],
  a11y_audit: [
    "contrast on the primary action measures 2.9:1 against a 4.5:1 requirement",
    "focus order skips the dialog's first control",
    "the status region is not announced on update",
    "the motion has no reduced-motion fallback",
  ],
  performance_benchmark: [
    "p95 frame time 26.4ms against a 16.7ms budget",
    "the initial payload is 412KB against a 250KB budget",
    "layout thrash on every scroll frame",
  ],
  adversarial_review: [
    "the happy path assumes the upstream response is always well-formed",
    "two components disagree about who owns the retry",
    "the design has no answer for a partial failure mid-sequence",
  ],
};

export class RehearsalExecutor implements Executor {
  readonly name = "rehearsal (deterministic, offline)";
  readonly mode = "rehearsal" as const;
  readonly #seed: string;
  readonly #defectRate: number;
  #calls = 0;

  constructor(opts: RehearsalOptions = {}) {
    this.#seed = opts.seed ?? "foundry";
    this.#defectRate = opts.defectRate ?? 0.45;
  }

  #tokens(scale: number): { tokensIn: number; tokensOut: number } {
    const rng = createRng(`${this.#seed}:tokens:${++this.#calls}`);
    return {
      tokensIn: Math.floor(1200 * scale + rng() * 800 * scale),
      tokensOut: Math.floor(400 * scale + rng() * 600 * scale),
    };
  }

  async interpret(objective: string, _route: ModelRoute) {
    const words = objective.split(/\s+/).filter(Boolean);
    const subject = words.slice(0, 6).join(" ");
    return {
      successCriteria: [
        `A user can complete "${subject}" end to end without an unrecoverable state`,
        "Every acceptance criterion has an independent verifier assigned before work starts",
        "No release-blocking finding is outstanding at handoff",
      ],
      risks: [
        "Scope is stated as an outcome, not as a set of observable criteria",
        "The verification method for at least one criterion is not yet mechanised",
      ],
      uncertainties: [
        "External evidence for the demand assumption has not been gathered",
        "Performance budget has not been agreed with the owner",
      ],
      ...this.#tokens(1),
    };
  }

  async perform(a: AgentAssignment): Promise<AgentOutput> {
    const rng = createRng(`${this.#seed}:perform:${a.task.id}:${a.cycle}`);
    const isRepair = a.cycle > 0;
    const kind = a.resident.outputContract[0] ?? "artifact";
    const uriBase = `${a.task.id}/${a.resident.id}/c${a.cycle}`;

    const artifacts = a.resident.outputContract.slice(0, 3).map((contractField, i) => ({
      kind: contractField,
      summary: isRepair
        ? `${contractField} revised — ${a.repairBrief ?? "verifier finding addressed"}`
        : `${contractField} for "${a.task.title}"`,
      evidenceUri: `build://sha/${hash32(`${uriBase}:${i}`).toString(16).padStart(8, "0")}`,
      detail: `${a.resident.name} · ${a.task.domain} · cycle ${a.cycle}`,
    }));

    return {
      summary: isRepair
        ? `Repaired ${a.task.title} (cycle ${a.cycle})`
        : `Produced ${artifacts.length} artifact(s) for ${a.task.title}`,
      artifacts,
      claims: [
        {
          claim: `${a.task.title} satisfies its stated acceptance criteria`,
          // The builder never supplies executed evidence for its own work. That evidence can
          // only come from an independent verifier — which is the whole of Article 6.
          pointers: artifacts.map((x) => x.evidenceUri).filter((u): u is string => Boolean(u)),
          substantiated: false,
        },
      ],
      messages:
        rng() < 0.5
          ? [{ to: a.task.verifiers[0] ?? "argus", subject: `${a.task.id} ready for verification`, body: `${artifacts.length} artifact(s) submitted.` }]
          : [],
      ...this.#tokens(1.5),
      ...(a.cycle === 0
        ? {
            degraded: {
              requested: `${a.route.model} (${a.route.modelClass} tier)`,
              used: "deterministic rehearsal executor",
              consequence: `work on "${a.task.title}" was simulated, not performed`,
            },
          }
        : {}),
    };
  }

  async verify(v: VerificationAssignment): Promise<VerificationOutput> {
    const fails = defective(this.#seed, v.task.id, v.verifier.id, v.cycle, this.#defectRate);
    const { evidenceScheme } = methodFor(v.verifier.id);
    const runId = hash32(`${this.#seed}:${v.task.id}:${v.verifier.id}:${v.cycle}`) % 1000;
    const evidenceUris = [`${evidenceScheme}://${v.method}/${v.task.id}-${runId}`];

    if (!fails) {
      return {
        passed: true,
        summary: `${v.method} passed on ${v.artifacts.length} artifact(s)`,
        evidenceUris,
        requiredAction: "none",
        ...this.#tokens(0.8),
      };
    }

    const catalogue = DEFECTS[v.method] ?? ["an unexamined assumption in the happy path"];
    const defect = catalogue[hash32(`${v.task.id}:${v.verifier.id}:${v.cycle}`) % catalogue.length]!;
    return {
      passed: false,
      summary: defect,
      // A failure carries evidence too — a reproduction is evidence.
      evidenceUris: [...evidenceUris, `browser://repro/${v.task.id}-${runId}`],
      requiredAction: "repair_and_retest",
      ...this.#tokens(0.8),
    };
  }

  async investigate(branch: string, worker: string, question: ResearchQuestion, _route: ModelRoute): Promise<ResearchFinding> {
    const rng = createRng(`${this.#seed}:investigate:${worker}:${branch}`);
    const n = 2 + Math.floor(rng() * 4);
    return {
      worker,
      branch,
      finding: `${branch}: ${n} corroborating record(s); no disconfirming record found within the searched scope`,
      sources: Array.from({ length: n }, (_, i) => `source://rehearsal/${hash32(`${branch}:${i}`).toString(16).slice(0, 6)}`),
      confidence: 0.5 + rng() * 0.4,
    };
  }

  async synthesize(question: ResearchQuestion, findings: readonly ResearchFinding[], _route: ModelRoute) {
    const sources = findings.flatMap((f) => f.sources);
    // Contradictions are surfaced, never averaged away. Low-confidence branches are exactly
    // where a synthesis is most tempted to smooth over disagreement.
    const contradictions = findings
      .filter((f) => f.confidence < 0.6)
      .map((f) => `${f.branch}: confidence ${f.confidence.toFixed(2)} — insufficient to support a load-bearing claim`);
    return {
      summary: `${findings.length} investigator report(s) across ${sources.length} source(s) on "${question.question}"`,
      claims: findings.map((f) => ({
        claim: f.finding,
        pointers: f.sources,
        // Source evidence substantiates a research claim's provenance, but a research claim is
        // never `verified` — only executed evidence reaches that status.
        substantiated: f.confidence >= 0.6,
      })),
      contradictions,
      ...this.#tokens(2),
    };
  }
}
