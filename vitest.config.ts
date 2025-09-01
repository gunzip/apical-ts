import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["src/tests/**/*"],
      include: ["src/**/*"],
      reporter: ["text", "json", "html"],
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"],
  },
});
