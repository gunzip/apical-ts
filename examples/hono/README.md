# Hono Route-Metadata Example

This example shows the **dynamic, metadata-driven** integration style. Apical TS
first generates route metadata, then a second generator turns that metadata into
a runnable Hono layer. The API contract stays the same; only the framework
integration changes.

## Contract-first flow

1. This example intentionally reuses `../express/examples.yaml`.
2. `pnpm run generate:apical` runs Apical with `--routes`.
3. Apical emits `generated/routes/*` plus the shared schemas.
4. `pnpm run generate:hono` reads those route files and produces
   `generated/hono/*`.
5. `server-examples/mock-server-example.ts` mounts the generated Hono routes.

## Why this is the dynamic style

- **Express** wires each route explicitly with generated wrappers.
- **Hono in this folder** derives the framework layer from generated route
  metadata instead of registering routes one by one.
- The contract is still modeled once, so moving from Express to Hono does not
  require reshaping handlers, payloads, or status unions by hand.

## Quick start

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. Generate route metadata and the Hono layer:

   ```bash
   cd examples/hono
   pnpm run generate
   ```

3. Run the mock server:

   ```bash
   pnpm run dev
   ```

The server runs on `http://localhost:3002`.

## Project layout

- `generated/routes/*`: route metadata generated directly by Apical
- `scripts/generate-hono-server.ts`: entry point for the secondary generator
- `scripts/hono-generator/*`: Hono-specific code generation utilities
- `generated/hono/operations/*`: generated Hono route modules
- `generated/hono/usecases/*`: generated mock use cases backed by `zocker`
- `generated/hono/register-routes.ts`: generated route registration entry point
- `server-examples/mock-server-example.ts`: runnable Hono server

## Example prompt

Use a prompt like this when you want an LLM to generate or extend the Hono
integration from Apical route metadata:

```text
You are working in examples/hono.

Read `generated/routes/*` and use those files as the only source of truth for
the API. Do not rewrite the OpenAPI surface manually.

Generate or update the Hono integration so that:
- path, method, params, requestMap, and responseMap come from generated route
  metadata
- output is written under `generated/hono/*`
- request validation uses `@hono/zod-validator`
- one generated Hono module exists per operation
- mock responses come from generated schemas instead of hand-written models
```

## Testing

```bash
pnpm run test
```

The test suite regenerates the Hono layer before running so the example stays
aligned with the contract.
