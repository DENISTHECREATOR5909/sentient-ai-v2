/**
 * The Claude executor — the residents' real body.
 *
 * Every call is structured: the request carries the resident's role contract as the system
 * prompt and constrains the response with `output_config.format`, so an agent's output is a
 * typed artifact rather than prose someone has to interpret. Agents never return chain of
 * thought as dialogue; thinking is the model's own and stays there.
 *
 * Model configuration is per-family and not interchangeable. The current Opus and Sonnet
 * generation takes adaptive thinking plus an `effort` level and rejects a fixed
 * `budget_tokens` outright; Haiku takes a budget and rejects `effort`. `ModelRoute` carries
 * whichever shape its family accepts, and `#request` passes it through untouched.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ModelRoute, Resident } from "@agent-city/core";
import type {
  AgentAssignment,
  AgentOutput,
  Executor,
  ResearchFinding,
  ResearchQuestion,
  VerificationAssignment,
  VerificationOutput,
} from "../executor.js";

export interface ClaudeExecutorOptions {
  readonly client?: Anthropic;
  /** Streaming is on by default: these are long outputs and a timeout mid-run is expensive. */
  readonly stream?: boolean;
  readonly maxTokens?: number;
}

type Schema = Record<string, unknown>;

const obj = (properties: Record<string, Schema>, required: string[]): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const str = (description: string): Schema => ({ type: "string", description });
const arr = (items: Schema, description: string): Schema => ({ type: "array", items, description });
const bool = (description: string): Schema => ({ type: "boolean", description });
const num = (description: string): Schema => ({ type: "number", description });

const INTERPRET_SCHEMA = obj(
  {
    successCriteria: arr(str("An observable criterion, checkable by a named method"), "What 'done' means, stated so it can be tested"),
    risks: arr(str("A risk to the outcome"), "What could make this fail"),
    uncertainties: arr(str("Something unknown at planning time"), "What is not yet known"),
  },
  ["successCriteria", "risks", "uncertainties"],
);

const PERFORM_SCHEMA = obj(
  {
    summary: str("One line for the activity ticker. Not reasoning — what you did"),
    artifacts: arr(
      obj({ kind: str("Which output-contract field this satisfies"), summary: str("One line"), detail: str("The artifact itself") }, ["kind", "summary"]),
      "The artifacts produced, one per output-contract field",
    ),
    claims: arr(
      obj(
        {
          claim: str("A material assertion about the work"),
          pointers: arr(str("An evidence URI, e.g. build://sha/abc123"), "Evidence supporting this claim"),
          substantiated: bool("False unless a pointer resolves to executed evidence"),
        },
        ["claim", "pointers", "substantiated"],
      ),
      "Claims this work asserts. Do not mark your own work substantiated — a verifier does that",
    ),
    messages: arr(obj({ to: str("Resident id"), subject: str("Subject"), body: str("Body") }, ["to", "subject", "body"]), "Structured messages to other residents"),
  },
  ["summary", "artifacts", "claims", "messages"],
);

const VERIFY_SCHEMA = obj(
  {
    passed: bool("Whether the artifact satisfies the criterion under this method"),
    summary: str("If failed, the specific defect. If passed, what was checked"),
    findings: arr(str("A specific, reproducible finding"), "Defects found"),
    requiredAction: { type: "string", enum: ["repair_and_retest", "redesign", "escalate", "none"] },
  },
  ["passed", "summary", "findings", "requiredAction"],
);

const INVESTIGATE_SCHEMA = obj(
  {
    finding: str("What this branch establishes, stated as a claim"),
    sources: arr(str("A source URL or citation"), "Sources supporting the finding"),
    confidence: num("0–1. Report low confidence honestly; a smoothed-over gap is worse than a stated one"),
  },
  ["finding", "sources", "confidence"],
);

const SYNTHESIZE_SCHEMA = obj(
  {
    summary: str("The synthesis, in one paragraph"),
    claims: arr(
      obj({ claim: str("A claim"), pointers: arr(str("A source"), "Sources"), substantiated: bool("Whether the sources actually support it") }, ["claim", "pointers", "substantiated"]),
      "The claims this research supports",
    ),
    contradictions: arr(str("Two sources disagreeing, stated with both positions"), "Surface contradictions; never average them away"),
  },
  ["summary", "claims", "contradictions"],
);

/** The role contract, rendered as a system prompt. Short and specific beats long and vague. */
function systemFor(r: Resident, extra?: string): string {
  return [
    `You are ${r.name}, ${r.title}, in The Foundry.`,
    `Authority: ${r.authority}`,
    `You must return every field of your output contract: ${r.outputContract.join(", ")}.`,
    "",
    "Standing rules:",
    "- A task is not complete because you believe it is complete.",
    "- A claim is not true because you are confident. Every material claim carries an evidence pointer.",
    "- Report what you could not establish as plainly as what you could. A stated gap is worth more than a smoothed-over one.",
    "- You never grade your own work, and you never mark your own output substantiated.",
    ...(extra ? ["", extra] : []),
  ].join("\n");
}

export class ClaudeExecutor implements Executor {
  readonly name = "Claude (live)";
  readonly mode = "live" as const;
  readonly #client: Anthropic;
  readonly #stream: boolean;
  readonly #maxTokens: number;

  constructor(opts: ClaudeExecutorOptions = {}) {
    this.#client = opts.client ?? new Anthropic();
    this.#stream = opts.stream ?? true;
    // Streaming is on by default, so give the model room; a truncated artifact costs a retry.
    this.#maxTokens = opts.maxTokens ?? 32_000;
  }

  /**
   * One structured request. Thinking and effort are passed exactly as the route declares
   * them, because the families disagree about which is legal and the wrong one is a 400.
   */
  async #request<T>(opts: {
    route: ModelRoute;
    system: string;
    prompt: string;
    schema: Schema;
  }): Promise<{ value: T; tokensIn: number; tokensOut: number }> {
    const params = {
      model: opts.route.model,
      max_tokens: this.#maxTokens,
      system: opts.system,
      messages: [{ role: "user" as const, content: opts.prompt }],
      output_config: {
        format: { type: "json_schema" as const, schema: opts.schema },
        ...(opts.route.effort ? { effort: opts.route.effort } : {}),
      },
      ...(opts.route.thinking ? { thinking: opts.route.thinking } : {}),
    };

    const message = this.#stream
      ? await (this.#client.messages.stream(params as never) as never as { finalMessage(): Promise<Anthropic.Message> }).finalMessage()
      : await (this.#client.messages.create(params as never) as Promise<Anthropic.Message>);

    if (message.stop_reason === "refusal") {
      throw new Error(`model declined the request (${message.stop_details?.category ?? "unspecified"})`);
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    let value: T;
    try {
      value = JSON.parse(text) as T;
    } catch {
      throw new Error(`structured output did not parse as JSON: ${text.slice(0, 240)}`);
    }

    return {
      value,
      tokensIn: message.usage.input_tokens + (message.usage.cache_read_input_tokens ?? 0),
      tokensOut: message.usage.output_tokens,
    };
  }

  async interpret(objective: string, route: ModelRoute) {
    const { value, tokensIn, tokensOut } = await this.#request<{
      successCriteria: string[];
      risks: string[];
      uncertainties: string[];
    }>({
      route,
      system: [
        "You are Atlas, chief executive agent of The Foundry.",
        "Interpret an owner's objective into observable success criteria, risks and uncertainties.",
        "A success criterion that names no checking method is not a criterion — restate it until it does.",
      ].join("\n"),
      prompt: `Objective from the owner:\n\n${objective}`,
      schema: INTERPRET_SCHEMA,
    });
    return { ...value, tokensIn, tokensOut };
  }

  async perform(a: AgentAssignment): Promise<AgentOutput> {
    const context = a.context.map((c) => `- [${c.from} · ${c.kind}] ${c.summary}`).join("\n") || "- (none)";
    const prompt = [
      `Task ${a.task.id}: ${a.task.title}`,
      `Domain: ${a.task.domain}`,
      "",
      "Acceptance criteria (each will be checked independently by another resident):",
      ...a.task.acceptance.map((c) => `- ${c.id}: ${c.text} — checked by ${c.method}`),
      "",
      "Context you have been given:",
      context,
      ...(a.repairBrief
        ? ["", `This is repair cycle ${a.cycle}. A verifier returned this artifact:`, a.repairBrief, "", "Fix the cause, not the symptom."]
        : []),
    ].join("\n");

    const { value, tokensIn, tokensOut } = await this.#request<{
      summary: string;
      artifacts: { kind: string; summary: string; detail?: string }[];
      claims: { claim: string; pointers: string[]; substantiated: boolean }[];
      messages: { to: string; subject: string; body: string }[];
    }>({ route: a.route, system: systemFor(a.resident), prompt, schema: PERFORM_SCHEMA });

    return {
      summary: value.summary,
      // A builder's own claims are never substantiated by its own say-so, whatever it returned.
      artifacts: value.artifacts,
      claims: value.claims.map((c) => ({ ...c, substantiated: false })),
      messages: value.messages,
      tokensIn,
      tokensOut,
    };
  }

  async verify(v: VerificationAssignment): Promise<VerificationOutput> {
    const prompt = [
      `Verify task ${v.task.id}: ${v.task.title}`,
      `Method: ${v.method}`,
      "",
      "Acceptance criteria:",
      ...v.task.acceptance.map((c) => `- ${c.id}: ${c.text}`),
      "",
      "Artifacts submitted:",
      ...v.artifacts.map((a) => `- [${a.kind}] ${a.summary}${a.detail ? `\n  ${a.detail}` : ""}`),
      "",
      "You did not build this and you are not being asked whether it is impressive.",
      "State pass or fail against the criteria, and if it fails, say exactly what is wrong.",
    ].join("\n");

    const { value, tokensIn, tokensOut } = await this.#request<{
      passed: boolean;
      summary: string;
      findings: string[];
      requiredAction: "repair_and_retest" | "redesign" | "escalate" | "none";
    }>({
      route: v.route,
      system: systemFor(v.verifier, `You hold independent verification authority over ${v.task.domain}. A pass you cannot evidence is a fail.`),
      prompt,
      schema: VERIFY_SCHEMA,
    });

    const runId = `${v.task.id}-c${v.cycle}`;
    return {
      passed: value.passed,
      summary: value.passed ? value.summary : (value.findings[0] ?? value.summary),
      evidenceUris: value.passed
        ? [`trace://${v.method}/${runId}`]
        : [`trace://${v.method}/${runId}`, `browser://repro/${runId}`],
      requiredAction: value.requiredAction,
      tokensIn,
      tokensOut,
    };
  }

  async investigate(branch: string, worker: string, question: ResearchQuestion, route: ModelRoute): Promise<ResearchFinding> {
    const { value } = await this.#request<{ finding: string; sources: string[]; confidence: number }>({
      route,
      system: [
        `You are an independent investigator in The Foundry's Research Cloud, working branch "${branch}".`,
        "You are one of several working in parallel. Do not try to answer the whole question — answer your branch.",
        "Report a low confidence honestly. Another investigator may contradict you, and that is the point.",
      ].join("\n"),
      prompt: `Overall question: ${question.question}\n\nYour branch: ${branch}`,
      schema: INVESTIGATE_SCHEMA,
    });
    return { worker, branch, finding: value.finding, sources: value.sources, confidence: value.confidence };
  }

  async synthesize(question: ResearchQuestion, findings: readonly ResearchFinding[], route: ModelRoute) {
    const { value, tokensIn, tokensOut } = await this.#request<{
      summary: string;
      claims: { claim: string; pointers: string[]; substantiated: boolean }[];
      contradictions: string[];
    }>({
      route,
      system: [
        "You are Verity, research director of The Foundry, synthesising parallel investigator reports.",
        "Where investigators disagree, surface the disagreement. Never average two incompatible findings into one confident sentence.",
        "A claim with no source is not a claim you may make.",
      ].join("\n"),
      prompt: [
        `Question: ${question.question}`,
        "",
        "Investigator reports:",
        ...findings.map((f) => `- [${f.worker} · ${f.branch} · confidence ${f.confidence.toFixed(2)}] ${f.finding}\n  sources: ${f.sources.join(", ") || "(none)"}`),
      ].join("\n"),
      schema: SYNTHESIZE_SCHEMA,
    });
    return { ...value, tokensIn, tokensOut };
  }
}
