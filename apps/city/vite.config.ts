import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@agent-city/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4173",
      "/stream": { target: "ws://127.0.0.1:4173", ws: true },
    },
  },
  build: { outDir: "dist", emptyOutDir: true, target: "es2022" },
});
