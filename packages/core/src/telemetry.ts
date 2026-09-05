/**
 * Telemetry.
 *
 * Spans follow the OpenTelemetry GenAI semantic-convention shape (`gen_ai.*`) so a run can be
 * traced across model calls, tool invocations and token usage rather than reconstructed by
 * guesswork. Multi-agent debugging is otherwise close to impossible: by the time a release is
 * blocked, the interesting decision happened forty events ago inside a worker that no longer
 * exists.
 */

export interface SpanAttributes {
  readonly [key: string]: string | number | boolean | undefined;
}

export interface Span {
  readonly id: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly startedAt: number;
  endedAt: number | null;
  readonly attributes: Record<string, string | number | boolean>;
  status: "unset" | "ok" | "error";
  error?: string;
}

export interface TokenUsage {
  readonly input: number;
  readonly output: number;
  readonly cacheRead?: number;
}

export class Tracer {
  #n = 0;
  readonly #spans: Span[] = [];
  readonly #stack: string[] = [];
  readonly #now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.#now = now;
  }

  start(name: string, attributes: SpanAttributes = {}): Span {
    const span: Span = {
      id: `span-${String(++this.#n).padStart(5, "0")}`,
      parentId: this.#stack[this.#stack.length - 1] ?? null,
      name,
      startedAt: this.#now(),
      endedAt: null,
      attributes: Object.fromEntries(
        Object.entries(attributes).filter((e): e is [string, string | number | boolean] => e[1] !== undefined),
      ),
      status: "unset",
    };
    this.#spans.push(span);
    this.#stack.push(span.id);
    return span;
  }

  end(span: Span, status: "ok" | "error" = "ok", error?: string): void {
    span.endedAt = this.#now();
    span.status = status;
    if (error) span.error = error;
    const idx = this.#stack.lastIndexOf(span.id);
    if (idx >= 0) this.#stack.splice(idx, 1);
  }

  /** Record a model call using the GenAI attribute names. */
  modelCall(opts: {
    readonly model: string;
    readonly operation: "chat" | "generate_content" | "execute_tool";
    readonly agent: string;
    readonly usage?: TokenUsage;
    readonly effort?: string;
  }): Span {
    return this.start(`${opts.operation} ${opts.model}`, {
      "gen_ai.system": "anthropic",
      "gen_ai.operation.name": opts.operation,
      "gen_ai.request.model": opts.model,
      "gen_ai.agent.name": opts.agent,
      "gen_ai.request.effort": opts.effort,
      "gen_ai.usage.input_tokens": opts.usage?.input,
      "gen_ai.usage.output_tokens": opts.usage?.output,
      "gen_ai.usage.cache_read_input_tokens": opts.usage?.cacheRead,
    });
  }

  toolCall(agent: string, tool: string, taskId?: string): Span {
    return this.start(`execute_tool ${tool}`, {
      "gen_ai.system": "anthropic",
      "gen_ai.operation.name": "execute_tool",
      "gen_ai.tool.name": tool,
      "gen_ai.agent.name": agent,
      "foundry.task.id": taskId,
    });
  }

  get spans(): readonly Span[] {
    return this.#spans;
  }

  totals(): { spans: number; inputTokens: number; outputTokens: number; errors: number; wallMs: number } {
    let inputTokens = 0;
    let outputTokens = 0;
    let errors = 0;
    let earliest = Number.POSITIVE_INFINITY;
    let latest = 0;
    for (const s of this.#spans) {
      const i = s.attributes["gen_ai.usage.input_tokens"];
      const o = s.attributes["gen_ai.usage.output_tokens"];
      if (typeof i === "number") inputTokens += i;
      if (typeof o === "number") outputTokens += o;
      if (s.status === "error") errors += 1;
      earliest = Math.min(earliest, s.startedAt);
      latest = Math.max(latest, s.endedAt ?? s.startedAt);
    }
    return {
      spans: this.#spans.length,
      inputTokens,
      outputTokens,
      errors,
      wallMs: this.#spans.length === 0 ? 0 : latest - earliest,
    };
  }

  /** Newline-delimited JSON, the least surprising thing to pipe into a collector. */
  exportNdjson(): string {
    return this.#spans.map((s) => JSON.stringify(s)).join("\n");
  }
}
