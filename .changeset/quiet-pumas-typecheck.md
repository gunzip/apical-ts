---
"@apical-ts/core-utils": patch
"@apical-ts/craft": patch
---

Use `tsrs` for generated typechecking, drop the chunked `tsc` fallback, and move
to Node.js 24

Generated packages now typecheck with
[`tsrs`](https://github.com/oxc-project/tsrs) (`scripts.typecheck: "tsrs"`,
`devDependencies.tsrs`) instead of invoking the native TypeScript compiler.
`tsrs` checks the whole generated project in one pass without the out-of-memory
failures that motivated the previous sharding, so the chunked typechecking
mechanism (`typecheck.mjs` + `CHUNKED_BUILD_FILE_THRESHOLD` heuristic) is gone;
stale `typecheck.mjs` files are removed on regeneration.

This release also upgrades the toolchain to Node.js 24
(`engines.node >= "24.0.0"`, `.node-version`, `@tsconfig/node24`, CI matrix) and
drops `tsx` from the examples, which now execute TypeScript directly with
`node`. Shared dependencies were refreshed in the workspace catalog (Zod
`4.6.7`, `vitest`/`@vitest/coverage-v8` `5.0.5`, `vite` `8.3.5`, `@types/node`
`24.19.2`) and `pnpm audit` findings dropped from 51 to 2 (one high, dev-only,
pending an upstream `postman-collection` release; one low with no patched
version available).
