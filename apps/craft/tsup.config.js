import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: false,
  entry: ["src/index.ts", "src/generate.ts"],
  format: ["esm"],
  noExternal: [
    "@apical-ts/core-utils",
    "@apical-ts/client-generator",
    "@apical-ts/server-generator",
    "@apical-ts/route-generator",
  ],
  outDir: "dist",
  sourcemap: true,
  target: "es2022",
});
