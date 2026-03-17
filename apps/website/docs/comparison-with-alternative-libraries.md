# Comparison with Alternative Libraries

This document provides a brief comparison between `@apical-ts/craft` and other
popular TypeScript OpenAPI client generators.

## [@apical-ts/craft](https://gunzip.github.io/apical-ts/)

- ✅ Exact typings with Zod v4
- ✅ Discriminated unions for response payloads based on status codes
- ✅ Typed error handling / no unknown exceptions
- ✅ Default response handling
- ✅ Modular, tree-shakable output
- ✅ Multiple success (2xx) responses handling
- ✅ Multiple content types response handling
- ✅ Server-side validation support
- 🟡 Integration with popular frameworks (express, react-query, msw via sample
  adapters)
- ✅ Wildcard status code handling (e.g., 5xx)
- ✅ Recursive schema support
- ✅ Maintenance and active development
- ❌ Strong Community support

## [@heyapi/openapi-ts](https://github.com/hey-api/openapi-ts)

- ✅ Exact typings with Zod v4
- ❌ Discriminated unions for response payloads based on status codes
- ❌ Typed error handling / no unknown exceptions
- 🟡 Default response handling (passthrough)
- ❌ Modular, tree-shakable output
- 🟡 Multiple success (2xx) responses handling (undiscriminated union)
- ❌ Multiple content types response handling
- 🟡 Server-side validation support (via fastify plugin)
- ✅ Integration with popular frameworks via adapters (react-query and others)
- 🟡 Wildcard status code handling, e.g., 5xx (passthrough)
- 🟡 Recursive schema support (to some extent, mostly typed using `any`)
- ✅ Maintenance and active development
- ✅ Strong Community support

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
