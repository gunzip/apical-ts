import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        branches: 84,
        functions: 88,
        lines: 87,
        statements: 87,
      },
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
  },
});
