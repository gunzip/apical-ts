import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 78,
        statements: 78,
      },
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
    passWithNoTests: true,
  },
});
