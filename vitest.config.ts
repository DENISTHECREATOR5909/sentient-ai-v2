import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    // Always test the source, never a stale dist. A green suite against yesterday's build is
    // exactly the kind of false pass this whole system exists to prevent.
    alias: {
      "@agent-city/core": src("./packages/core/src/index.ts"),
      "@agent-city/runtime": src("./packages/runtime/src/index.ts"),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "evals/**/*.test.ts"],
    environment: "node",
    passWithNoTests: false,
  },
});
