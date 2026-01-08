import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["server-examples/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["server-examples/**/*.ts"],
      exclude: ["server-examples/**/*.test.ts"],
    },
  },
});
