# Comparison with Alternative Libraries

This document provides a comparison between `@apical-ts/craft` and other popular
TypeScript OpenAPI toolchains.

## Quick Summary

| Feature                                    | `@apical-ts/craft` | `openapi-typescript` + `openapi-fetch` | `@hey-api/openapi-ts` | `Orval` | `Massimo` | `openapi-zod-client` |
| ------------------------------------------ | :----------------: | :------------------------------------: | :-------------------: | :-----: | :-------: | :------------------: |
| Exact Zod v4 runtime schemas               |         ✅         |                   ❌                   |          🟡           |   ❌    |    ❌     |          ❌          |
| Status-discriminated response unions       |         ✅         |                   🟡                   |          ❌           |   ❌    |    ✅     |          ❌          |
| Typed errors / no thrown exceptions        |         ✅         |                   ✅                   |          🟡           |   ❌    |    ❌     |          ❌          |
| Multiple `2xx` & wildcard (`4XX`) statuses |         ✅         |                   🟡                   |          🟡           |   🟡    |    ✅     |          ❌          |
| Multiple content types per operation       |         ✅         |                   ❌                   |          ❌           |   🟡    |    ❌     |          ❌          |
| Tree-shakable per-operation output         |         ✅         |                   ✅                   |          🟡           |   ✅    |    ✅     |          ❌          |
| Server-side validation wrappers / metadata |         ✅         |                   ❌                   |          🟡           |   ✅    |    ✅     |          ❌          |
| Framework plugins & community ecosystem    |         🟡         |                   ✅                   |          ✅           |   ✅    |    🟡     |          ❌          |

Legend: ✅ Full support · 🟡 Partial support or caveats · ❌ Not supported

## [@apical-ts/craft](https://gunzip.github.io/apical-ts/)

- ✅ Exact typings with Zod v4
- ✅ Discriminated unions for response payloads based on status codes
- ✅ Typed error handling / no unknown exceptions
- ✅ Default response handling
- ✅ Modular, tree-shakable output
- ✅ Multiple success (2xx) responses handling
- ✅ Multiple content types response handling
- ✅ Server-side validation support
- 🟡 Integration with popular frameworks (inspectable example starters &
  metadata-driven adapters; no official framework plugin packages yet)
- ✅ Wildcard status code handling (e.g., 5xx)
- ✅ Recursive schema support
- ✅ Maintenance and active development
- ❌ Strong Community support

## [openapi-typescript](https://openapi-ts.dev/) + [openapi-fetch](https://openapi-ts.dev/openapi-fetch/)

- ❌ Exact typings with Zod v4 (generates compile-time `.d.ts` types with zero
  runtime validation out of the box)
- 🟡 Discriminated unions for response payloads based on status codes
  (`openapi-fetch` returns `{ data, error, response }` rather than per-status
  discriminated runtime-validated unions)
- ✅ Typed error handling / no unknown exceptions (`{ data, error }` return
  style)
- 🟡 Default response handling (mapped into `error` at the type level without
  runtime schema parsing)
- ✅ Modular, tree-shakable output (thin `openapi-fetch` runtime + type-only
  definitions)
- 🟡 Multiple success (2xx) responses handling (collapsed in `data` union)
- ❌ Multiple content types response handling
- ❌ Server-side validation support
- ✅ Integration with popular frameworks via adapters (`openapi-react-query`,
  middleware ecosystem)
- 🟡 Wildcard status code handling, e.g., 5xx (type-level support)
- ✅ Recursive schema support (type-level)
- ✅ Maintenance and active development
- ✅ Strong Community support

If you do not need runtime validation and want near-zero bundle overhead with a
mature ecosystem, `openapi-typescript` + `openapi-fetch` is one of the strongest
options in the TypeScript ecosystem.

## [@heyapi/openapi-ts](https://github.com/hey-api/openapi-ts)

- 🟡 Exact typings with Zod v4 (solid baseline coverage, handling of some edge
  cases remains a bit rough)
- ❌ Discriminated unions for response payloads based on status codes
- 🟡 Typed error handling / no unknown exceptions (typed aliases and transport
  options, but no status-aware semantic error union)
- 🟡 Default response handling (type-level support, generic runtime passthrough
  for non-OK responses)
- 🟡 Modular, tree-shakable output (flat SDK is tree-shakeable, but generated
  output is more centralized than craft)
- ❌ Multiple success (2xx) responses handling in the SDK surface
- ❌ Multiple content types response handling
- 🟡 Server-side validation support (via fastify plugin)
- ✅ Integration with popular frameworks via adapters (excellent ecosystem of
  plugins and integrations)
- 🟡 Wildcard status code handling, e.g., 5xx (type-level support, generic
  runtime passthrough)
- ✅ Recursive schema support (with some `any` leakage in recursive
  `z.lazy(...)`)
- ✅ Maintenance and active development
- ✅ Strong Community support

Hey API is actually stronger than this checklist suggests, especially regarding
ecosystem breadth and transport ergonomics if you need a lot of customization
(`interceptors`, `parseAs`, `responseStyle`, `throwOnError`,
`responseTransformer`).

## [Massimo](https://massimohttp.dev)

- ❌ Exact typings with Zod v4 (uses ajv for validation and generated TypeScript
  types)
- ✅ Discriminated unions for response payloads based on status codes
- ❌ Typed error handling / no unknown exceptions
- ❌ Default response handling (breaks typings and client generation)
- ✅ Modular, tree-shakable output (client is generated dynamically based on
  OpenAPI spec)
- ✅ Multiple success (2xx) responses handling
- ❌ Multiple content types response handling
- ✅ Server-side validation support (via ajv)
- ❌ Integration with popular frameworks via adapters
- ✅ Wildcard status code handling (e.g., 5xx)
- ❌ Recursive schema support
- ✅ Maintenance and active development
- 🟡 Strong Community support

## [Orval](https://orval.dev)

- ❌ Exact typings with Zod v4 (loose schemas with zod v3)
- ❌ Discriminated unions for response payloads based on status codes (simple
  unions)
- ❌ Typed error handling / no unknown exceptions
- ✅ Default response handling
- ✅ Modular, tree-shakable output
- 🟡 Multiple success (2xx) responses handling (breaks handling multiple content
  types)
- 🟡 Multiple content types response handling (breaks handling multiple success
  responses)
- ✅ Server-side validation support (via hono plugin)
- ✅ Integration with popular frameworks via adapters
- ✅ Wildcard status code handling (e.g., 5xx)
- ❌ Recursive schema support
- ✅ Maintenance and active development
- ✅ Strong Community support

## [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)

- ❌ Exact typings with Zod v4 (loose schemas with zod v3)
- ❌ Discriminated unions for response payloads based on status codes
- ❌ Typed error handling / no unknown exceptions
- ❌ Default response handling
- ❌ Modular, tree-shakable output
- ❌ Multiple success (2xx) responses handling
- ❌ Multiple content types response handling
- ❌ Server-side validation support
- ❌ Integration with popular frameworks via adapters
- ❌ Wildcard status code handling (e.g., 5xx)
- ❌ Recursive schema support
- ❌ Maintenance and active development
- ❌ Strong Community support
