import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    globalSetup: ["tests/integrations/global-setup.ts"],
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
  },
});
