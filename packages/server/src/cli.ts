#!/usr/bin/env node
/**
 * The headless CLI.
 *
 * The city is the point, but a run must be legible without it — in CI, in a terminal, in a
 * log. Same orchestrator, same events, same gate matrix; only the rendering differs.
 */

import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { describeEvent, renderCareer, renderManifest } from "@agent-city/core";
import { Session } from "./session.js";

const QUIET_KINDS = new Set(["agent.state", "agent.moved", "message.sent", "swarm.worker.reported"]);

export async function main(argv: readonly string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      seed: { type: "string", default: "foundry" },
      "defect-rate": { type: "string" },
      rehearsal: { type: "boolean", default: false },
      verbose: { type: "boolean", short: "v", default: false },
      quiet: { type: "boolean", short: "q", default: false },
      grant: { type: "string", multiple: true, default: [] },
      trace: { type: "string" },
      careers: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    process.stdout.write(
      [
        "",
        "  foundry — run an objective through The Foundry",
        "",
        '  usage: foundry "<objective>" [options]',
        "",
        "    --seed <s>           deterministic seed (default: foundry)",
        "    --defect-rate <0-1>  rehearsal defect injection rate (default: 0.45)",
        "    --rehearsal          force the offline executor even if an API key is present",
        "    --grant <tool>       authorize an irreversible tool for this run (repeatable)",
        "    --trace <file>       write OpenTelemetry-shaped GenAI spans as NDJSON",
        "    --careers            print career records at the end",
        "    -v, --verbose        include movement, state and message events",
        "    -q, --quiet          print only the manifest",
        "",
        "  Without ANTHROPIC_API_KEY the run executes as a rehearsal, and the release",
        "  gate blocks — a rehearsal demonstrates the organization, it does not release.",
        "",
      ].join("\n"),
    );
    return 0;
  }

  const objective = positionals.join(" ").trim() || "Build a checkout flow that never loses a customer's work";
  const session = new Session("cli", {
    objective,
    seed: values.seed as string,
    ...(values["defect-rate"] ? { defectRate: Number(values["defect-rate"]) } : {}),
    ...(values.rehearsal ? { forceRehearsal: true } : {}),
    ownerGrants: values.grant as string[],
  });

  const snapshot = session.snapshot();
  if (!values.quiet) {
    process.stdout.write(`\n  THE FOUNDRY · ${snapshot.mode} · ${snapshot.executor}\n  objective: ${objective}\n\n`);
    session.subscribe((e) => {
      if (!values.verbose && QUIET_KINDS.has(e.kind)) return;
      process.stdout.write(`  ${describeEvent(e)}\n`);
    });
  }

  const result = await session.start();

  process.stdout.write(`\n${renderManifest(result.manifest)}\n`);

  const ops = result.tasks.operations();
  process.stdout.write(
    [
      "",
      "OPERATIONS",
      `  WORKING    ${ops.working}`,
      `  VERIFYING  ${ops.verifying}`,
      `  BLOCKED    ${ops.blocked}`,
      `  WAITING    ${ops.waiting}`,
      `  FAILED     ${ops.failed}`,
      `  COMPLETE   ${ops.complete}`,
      "",
      `  repair cycles ${result.tasks.all.reduce((s, t) => s + t.cycles, 0)} · events ${result.events.length} · tokens ${result.tokensIn} in / ${result.tokensOut} out · ${(result.elapsedMs / 1000).toFixed(1)}s`,
      "",
    ].join("\n"),
  );

  if (result.genesis.length > 0) {
    process.stdout.write("GENESIS FOUNDRY\n");
    for (const g of result.genesis) {
      process.stdout.write(`  ${g.gap.domain}: ${g.admitted ? "ADMITTED" : "refused"} — ${g.rationale}\n`);
      if (g.card) process.stdout.write(`\n${g.card}\n\n`);
    }
    process.stdout.write("\n");
  }

  if (values.careers) {
    process.stdout.write("CAREER RECORDS\n\n");
    for (const record of session.foundry.careers.all()) {
      process.stdout.write(`${renderCareer(record)}\n\n`);
    }
  }

  if (values.trace) {
    await writeFile(values.trace as string, session.foundry.tracer.exportNdjson(), "utf8");
    process.stdout.write(`  spans written to ${values.trace}\n\n`);
  }

  // A blocked release is a non-zero exit. CI should not be able to mistake it for a pass.
  return result.manifest.decision === "approved" ? 0 : 1;
}

const invokedDirectly = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("cli.ts") || process.argv[1]?.endsWith("cli.js");
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((err) => {
      process.stderr.write(`\n  run failed: ${err instanceof Error ? err.message : String(err)}\n\n`);
      process.exit(2);
    });
}
