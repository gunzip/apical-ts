# @apical-ts/route-generator

## 0.16.2

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

- Updated dependencies [f5824ac]
- Updated dependencies [992e2a7]
- Updated dependencies [33fe1da]
  - @apical-ts/core-utils@0.23.2

## 0.16.1

### Patch Changes

- Updated dependencies
  - @apical-ts/core-utils@0.23.1

## 0.16.0

### Minor Changes

- 594a604: Add support for typed headers in responses

### Patch Changes

- Updated dependencies [594a604]
  - @apical-ts/core-utils@0.23.0

## 0.15.6

### Patch Changes

- 0b253b7: Optimize generated types
- 20dc17e: Generate imports with TypeScript extension
- Updated dependencies [0b253b7]
- Updated dependencies [20dc17e]
- Updated dependencies [e0003c1]
- Updated dependencies [ee305ff]
  - @apical-ts/core-utils@0.22.3

## 0.15.5

### Patch Changes

- Updated dependencies [58130e3]
  - @apical-ts/core-utils@0.22.2

## 0.15.4

### Patch Changes

- Updated dependencies [c853dd9]
  - @apical-ts/core-utils@0.22.1

## 0.15.3

### Patch Changes

- Updated dependencies [3bbfb0a]
- Updated dependencies [2b53eec]
- Updated dependencies [78e7035]
  - @apical-ts/core-utils@0.22.0

## 0.15.2

### Patch Changes

- Updated dependencies [d6d3660]
  - @apical-ts/core-utils@0.21.1

## 0.15.1

### Patch Changes

- Updated dependencies [32695bd]
  - @apical-ts/core-utils@0.21.0

## 0.15.0

### Minor Changes

- 1b8a744: Keep inherited auth headers in generated route params: optional on
  client operations and required on server handlers unless an operation-level
  security override replaces them.

### Patch Changes

- Updated dependencies [1b8a744]
  - @apical-ts/core-utils@0.20.0

## 0.14.2

### Patch Changes

- Updated dependencies [391ae05]
  - @apical-ts/core-utils@0.19.2

## 0.14.1

### Patch Changes

- Updated dependencies [3b00ec0]
- Updated dependencies [bbd19f8]
- Updated dependencies [bf6211f]
  - @apical-ts/core-utils@0.19.1

## 0.14.0

### Minor Changes

- Added support for custom string formats via user provided zod schemas.

### Patch Changes

- Updated dependencies
  - @apical-ts/core-utils@0.19.0

## 0.13.2

### Patch Changes

- Updated dependencies [aa76151]
  - @apical-ts/core-utils@0.18.0

## 0.13.1

### Patch Changes

- Updated dependencies [59c77ea]
  - @apical-ts/core-utils@0.17.0

## 0.13.0

### Minor Changes

- 135a1af: Fix import collision and nullable default

### Patch Changes

- Updated dependencies [135a1af]
  - @apical-ts/core-utils@0.16.0

## 0.12.4

### Patch Changes

- Updated dependencies [4040acc]
  - @apical-ts/core-utils@0.15.2

## 0.12.3

### Patch Changes

- 41cce07: Refactored code to remove unused exports
- 48f3218: Remove duplicated code and upgraded packages
- Updated dependencies [41cce07]
- Updated dependencies [48f3218]
  - @apical-ts/core-utils@0.15.1

## 0.12.2

### Patch Changes

- Updated dependencies [67a3a53]
  - @apical-ts/core-utils@0.15.0

## 0.12.1

### Patch Changes

- Updated dependencies [9749b97]
  - @apical-ts/core-utils@0.14.0

## 0.12.0

### Minor Changes

- ad7faec: Fix edge cases when generating client and server

### Patch Changes

- Updated dependencies [ad7faec]
  - @apical-ts/core-utils@0.13.0

## 0.11.2

### Patch Changes

- b9d5b8f: Upgraded dependencies
- Updated dependencies [b9d5b8f]
  - @apical-ts/core-utils@0.12.1

## 0.11.1

### Patch Changes

- Updated dependencies [04dddb6]
  - @apical-ts/core-utils@0.12.0

## 0.11.0

### Minor Changes

- eb5d356: Refactor monorepo splitting packages

### Patch Changes

- Updated dependencies [eb5d356]
  - @apical-ts/core-utils@0.11.0
