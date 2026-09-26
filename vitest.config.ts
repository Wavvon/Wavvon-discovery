import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // The `@/*` alias comes from tsconfig; vitest does not read it, so a module
  // importing `@/data/providers.json` resolves under `next build` and fails
  // under `vitest run` unless it is repeated here.
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
