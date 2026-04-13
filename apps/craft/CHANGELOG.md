# @apical-ts/craft

## 0.16.1

### Patch Changes

- 41cce07: Refactored code to remove unused exports
- 48f3218: Remove duplicated code and upgraded packages

## 0.16.0

### Minor Changes

- cdf09a9: Update packages

## 0.15.0

### Minor Changes

- dcf2928: Fix recursive handling in allOf
- 9749b97: Fix recursive typings

## 0.14.0

### Minor Changes

- Sanitize operationId

## 0.13.1

### Patch Changes

- b9d5b8f: Upgraded dependencies

## 0.13.0

### Minor Changes

- Improve server wrappers handling of wildcard statuses ie. 5XX, 4XX

## 0.12.0

### Minor Changes

- 81536ba: Add `--routes` CLI flag to generate only schemas and route metadata

  This new flag allows developers to generate type-safe schemas and route
  metadata without the full client or server implementations, enabling custom
  client/server implementations using preferred frameworks or tools.

## 0.11.2

### Patch Changes

- Fix NPM package publish action
- 9db49a8: Fix package generation for NPM registry

## 0.11.1

### Patch Changes

- Fix NPM package publishing
- 9db49a8: Fix package generation for NPM registry

## 0.11.0

### Minor Changes

- eb5d356: Refactor monorepo splitting packages

### Patch Changes

- Updated dependencies [eb5d356]
  - @apical-ts/client-generator@0.11.0
  - @apical-ts/server-generator@0.11.0
  - @apical-ts/route-generator@0.11.0
  - @apical-ts/core-utils@0.11.0

## 0.10.0

### Minor Changes

- 4cd88dc: Allow generated operation functions to be called without arguments
  when all parameters are optional. Generated clients now add zero-argument
  overloads and default parameter values for operations that have no required
  path parameters, body, or other required inputs.

## 0.9.0

### Minor Changes

- 0a04a4e: ## Breaking changes

  - The generated `GlobalConfig.headers` now only accepts the declared auth
    header keys. Supplying fewer keys or injecting arbitrary default headers now
    fails type-checking, so update your configuration factories to fill every
    generated key and push ad-hoc headers through `params.headers` instead of
    `config.headers`.
  - Optional parameters: `query`/`headers`/`path` properties only appear in
    client calls when the OpenAPI spec actually defined them.

  ## Migration guidance

  1. Regenerate your client/server and update any helper that builds
     `globalConfig` so it hydrates all generated auth headers (you can store
     credentials elsewhere and spread them in).
  2. Refactor call sites that invoked operations without arguments to pass an
     explicit params object, and update code that assumed
     `params.path/query/headers` were always present.
  3. Adjust server handlers to handle the new optional param sections (or
     destructure with defaults) before referencing them.

### Patch Changes

- b4cada3: Fix qs CVE

## 0.8.0

### Minor Changes

- 6bfdd81: Add support for readOnly and writeOnly qualifiers

## 0.7.3

### Patch Changes

- 591b920: Fix condition on nullable recursive objects

## 0.7.2

### Patch Changes

- 183b1fa: Mod generated zod imports to save some space when bundling

## 0.7.1

### Patch Changes

- 9bbcdcc: Fix wrong URLs concatenation

## 0.7.0

### Minor Changes

- def0286: Add command line flags to control additional properties handling in
  schema generation

## 0.6.0

### Minor Changes

- 36cfb82: BREAKING: Moved shema definitions for parameters in their own modules

## 0.5.1

### Patch Changes

- 7a5d15f: Fix oneOf typings

## 0.4.0

### Minor Changes

- 777b004: Improve path parameters and headers serialization in client generator

## 0.3.1

### Patch Changes

- 6609bf0: Fix generated server barrel file

## 0.3.0

### Minor Changes

- bfd5240: Advanced handling of query parameters

## 0.2.0

### Minor Changes

- 44649a0: BREAKING: Add support for range status code in OpenAPI specs (ie.
  4XX, 5XX)

## 0.1.1

### Patch Changes

- Add support for OpenAPI consts and mixed enums

## 0.1.0

### Minor Changes

- First stable minor release

## 0.0.44

### Patch Changes

- d9117a4: Refactor command line flags

## 0.0.43

### Patch Changes

- Fix missing response schema

## 0.0.42

### Patch Changes

- Fix collisions in schema names

## 0.0.41

### Patch Changes

- Fix reference to response components

## 0.0.40

### Patch Changes

- Fix reference to components responses

## 0.0.39

### Patch Changes

- Fix for reserved keywords

## 0.0.38

### Patch Changes

- Fix unsafe access in getResponseContentType

## 0.0.37

### Patch Changes

- Split imports in generated client operations in order to work with
  verbatimModuleSyntax

## 0.0.36

### Patch Changes

- Fix default response handling

## 0.0.35

### Patch Changes

- Fix mismatch between response / requests bodies

## 0.0.34

### Patch Changes

- Add support for requestBodies section

## 0.0.33

### Patch Changes

- Add support for response references

## 0.0.32

### Patch Changes

- Add support for circular references

## 0.0.31

### Patch Changes

- Added build task to generated package

## 0.0.30

### Patch Changes

- Refactor return type of client operations to handle multiple content types

## 0.0.29

### Patch Changes

- Fix typings for configureOperations

## 0.0.28

### Patch Changes

- Enable Zod validation by default

## 0.0.27

### Patch Changes

- Remove generated unreachable code

## 0.0.26

### Patch Changes

- Remove prettier formatting for performance reason
- Added support for default response

## 0.0.25

### Patch Changes

- Changed Node engine constraints

## 0.0.24

### Patch Changes

- Fix handling of forma data

## 0.0.23

### Patch Changes

- Point readme to documentation website

## 0.0.22

### Patch Changes

- Reorganized examples folder, now in its own package

## 0.0.21

### Patch Changes

- Renamed proprty of ApiResponse

## 0.0.20

### Patch Changes

- Added changesets
