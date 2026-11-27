import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        branches: 61,
        functions: 68,
        lines: 62,
        statements: 62,
      },
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
  },
});
