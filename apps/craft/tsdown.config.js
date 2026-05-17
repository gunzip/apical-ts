import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["src/index.ts", "src/generate.ts"],
  format: ["esm"],
  outDir: "dist",
  platform: "node",
  sourcemap: true,
  target: "es2022",
  deps: {
    neverBundle: ["swagger2openapi"],
    alwaysBundle: [
      "@apical-ts/core-utils",
      "@apical-ts/client-generator",
      "@apical-ts/server-generator",
      "@apical-ts/route-generator",
    ],
  },
});
