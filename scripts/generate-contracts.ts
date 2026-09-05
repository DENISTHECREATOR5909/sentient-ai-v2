#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { RESIDENTS } from "@agent-city/core";
import { renderContract, renderIndex } from "./contracts.js";

const root = new URL("../../agents/", import.meta.url);
await mkdir(new URL("residents/", root), { recursive: true });
await writeFile(new URL("README.md", root), renderIndex(), "utf8");
for (const r of RESIDENTS) {
  await writeFile(new URL(`residents/${r.id}.md`, root), renderContract(r), "utf8");
}
process.stdout.write(`wrote ${RESIDENTS.length + 1} contract file(s) to ${fileURLToPath(root)}\n`);
