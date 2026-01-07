import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/generate.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  target: "es2022",
  outDir: "dist",
  external: [
    "@apical-ts/core-utils",
    "@apical-ts/client-generator",
    "@apical-ts/server-generator",
    "@apical-ts/route-generator",
  ],
});
