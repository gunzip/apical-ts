# @apical-ts/core-utils

## 0.23.2

### Patch Changes

- f5824ac: Fix typecheck failures on specs with parameterized media types or
  case-colliding operation IDs

  Two generator bugs made the generated client/server fail `tsc` (TS2678 /
  TS2724 / TS1149):

  - Route request maps corrupted content-type keys containing `;` (e.g.
    `text/plain;charset=UTF-8` became `text/plain,charset=UTF-8`) when
    converting the type-shape map into an object literal via
    `replaceAll(";", ",")`. The request map keys no longer matched the client's
    content-type switch cases, so `case` expressions were not comparable to
    `keyof RequestMap`. The conversion now only rewrites statement-terminating
    semicolons (end of line), preserving semicolons inside quoted keys.
  - Operation IDs whose sanitized identifiers collide only by casing (e.g.
    `DeleteWebhook` vs `deleteWebhook`) produced function/file names that clash
    on case-insensitive filesystems and failed typechecking with TS1149. A new
    `renameSanitizationConflictingOperationIds` preprocess step renames the
    colliding operation IDs deterministically with a numeric suffix (mirroring
    the existing schema conflict handling), so client, server, routes, schemas
    and index barrels stay consistent. The step is a single linear pass over
    operations (O(n), plus a tiny per-collision-group sort), so it adds no
    meaningful cost even for very large specifications.

- 992e2a7: Use `tsrs` for generated typechecking, drop the chunked `tsc`
  fallback, and move to Node.js 24

  Generated packages now typecheck with
  [`tsrs`](https://github.com/oxc-project/tsrs) (`scripts.typecheck: "tsrs"`,
  `devDependencies.tsrs`) instead of invoking the native TypeScript compiler.
  `tsrs` checks the whole generated project in one pass without the
  out-of-memory failures that motivated the previous sharding, so the chunked
  typechecking mechanism (`typecheck.mjs` + `CHUNKED_BUILD_FILE_THRESHOLD`
  heuristic) is gone; stale `typecheck.mjs` files are removed on regeneration.

  This release also upgrades the toolchain to Node.js 24
  (`engines.node >= "24.0.0"`, `.node-version`, `@tsconfig/node24`, CI matrix)
  and drops `tsx` from the examples, which now execute TypeScript directly with
  `node`. Shared dependencies were refreshed in the workspace catalog (Zod
  `4.6.7`, `vitest`/`@vitest/coverage-v8` `5.0.5`, `vite` `8.3.5`, `@types/node`
  `24.19.2`) and `pnpm audit` findings dropped from 51 to 2 (one high, dev-only,
  pending an upstream `postman-collection` release; one low with no patched
  version available).

- 33fe1da: Upgrade Zod package to 4.6.0

## 0.23.1

### Patch Changes

- Switch generated packages from `@typescript/native-preview` (tsgo) to stable
  TypeScript (`tsc`) and upgrade the toolchain (pnpm 12, vite 8, vitest 5,
  TypeScript 7, zod 4.5)

## 0.23.0

### Minor Changes

- 594a604: Add support for typed headers in responses

## 0.22.3

### Patch Changes

- 0b253b7: Optimize generated types
- 20dc17e: Generate imports with TypeScript extension
- e0003c1: Refactor handling of exclusive unions with oneOf
- ee305ff: Optimize unions for wildcard statuses

## 0.22.2

### Patch Changes

- 58130e3: Fix default values on allOf

## 0.22.1

### Patch Changes

- c853dd9: Preserve defaults on $ref, anyOf, and oneOf generated schema

## 0.22.0

### Minor Changes

- 3bbfb0a: Add support for patternProperties and propertyNames
- 2b53eec: Support discriminator mapping

### Patch Changes

- 78e7035: Support regexes in patternProperties keys

## 0.21.1

### Patch Changes

- d6d3660: Upgrade Zod package

## 0.21.0

### Minor Changes

- 32695bd: Support resolution of $dynamicRefs

## 0.20.0

### Minor Changes

- 1b8a744: Keep inherited auth headers in generated route params: optional on
  client operations and required on server handlers unless an operation-level
  security override replaces them.

## 0.19.2

### Patch Changes

- 391ae05: Fallback to simple union when one of the member in oneOf is an array

## 0.19.1

### Patch Changes

- 3b00ec0: Make OpenAPI spec parsing more sound
- bbd19f8: Make OpenAPI parsing more tolerant against wrong specs
- bf6211f: Fix null serialization in client generator

## 0.19.0

### Minor Changes

- Added support for custom string formats via user provided zod schemas.

## 0.18.0

### Minor Changes

- aa76151: Fix method name

## 0.17.0

### Minor Changes

- 59c77ea: Generate Typescript configuration file

## 0.16.0

### Minor Changes

- 135a1af: Fix import collision and nullable default

## 0.15.2

### Patch Changes

- 4040acc: Fix lowercase widlcards

## 0.15.1

### Patch Changes

- 41cce07: Refactored code to remove unused exports
- 48f3218: Remove duplicated code and upgraded packages

## 0.15.0

### Minor Changes

- 67a3a53: Support int64 to BigInt conversion

## 0.14.0

### Minor Changes

- 9749b97: Fix recursive typings

## 0.13.0

### Minor Changes

- ad7faec: Fix edge cases when generating client and server

## 0.12.1

### Patch Changes

- b9d5b8f: Upgraded dependencies

## 0.12.0

### Minor Changes

- 04dddb6: Added zod metadata (describe) for objects descriptions

## 0.11.0

### Minor Changes

- eb5d356: Refactor monorepo splitting packages
