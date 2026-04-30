# Hono Mock Server Example

This example shows how to build a **Hono** server starting from Apical TS
`--routes` output, then generate Hono-ready route registration files from that
metadata.

## What this example demonstrates

- route-metadata generation with `craft generate --routes`
- a second generator step that creates `generated/hono/*`
- automatic mock responses using `zocker`
- request validation for path, query, headers, and request bodies via
  `@hono/zod-validator`

## Quick start

Install dependencies from the monorepo root:

```bash
pnpm install
```

Generate Apical TS routes and the Hono-specific registration layer:

```bash
cd examples/hono
pnpm run generate
```

Run the mock server:

```bash
pnpm run dev
```

The server runs on `http://localhost:3002`.

## Project layout

- `scripts/generate-hono-server.ts`: reads `generated/routes/*` and emits
  `generated/hono/*`
- `scripts/hono-generator/*`: modular generators for route registration, inline
  operation handlers, usecases, runtime helpers, and file writing
- `generated/hono/operations/*`: route registration modules with
  `@hono/zod-validator` middleware and inline HTTP handling
- `generated/hono/usecases/*`: zocker-backed mock business logic
- `generated/package.json`: includes the runtime dependencies required by the
  generated Hono layer
- `generated/hono/runtime.ts`: generated runtime helpers for validation error
  formatting and mocked responses
- `server-examples/mock-server-example.ts`: runnable Hono server

## Why it reuses `examples/express/examples.yaml`

This example intentionally reuses the same OpenAPI document as
`examples/express`, so it is easy to compare:

- the Express wrapper-based integration
- the Hono route-metadata-driven integration

## Testing

```bash
pnpm run test
```

The test suite regenerates the Hono layer before running so the example stays
consistent with the OpenAPI source.
