import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "json-summary", "html"],
      thresholds: {
        branches: 76,
        functions: 90,
        lines: 82,
        statements: 82,
      },
    },
    environment: "node",
    globalSetup: ["tests/integrations/global-setup.ts"],
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
  },
});
