# @apical-ts/core-utils

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
