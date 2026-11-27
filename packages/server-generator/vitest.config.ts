import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        branches: 93,
        functions: 81,
        lines: 84,
        statements: 84,
      },
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
  },
});
