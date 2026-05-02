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

Use a prompt like this when you want an LLM to recreate Hono handlers from
scratch starting from the OpenAPI contract only:

```text
Goal: build type safe Hono handlers by first generating route metadata with @apical-ts/craft and
then writing a generator that emits the Hono integration.

Process:
1. Run `npx @apical-ts/craft generate --routes -i examples.yaml -o generated`.
2. Inspect `generated/routes/*` and use them as the only source of truth for
   `operationId`, `path`, `method`, `params`, `requestMap`, and `responseMap`.
3. Implement the generator entrypoint in `scripts/generate-hono-server.ts`.
4. Implement the generator modules under `scripts/hono-generator/*` so they read
   generated route metadata and emit `generated/hono/*`.
5. The generator should produce:
   - one generated Hono operation module per route
   - a register-routes module
   - shared runtime helpers
6. Add a runnable Hono server that imports the generated registration layer.

Rules:
- do not hand-write `generated/hono/*`
- do not redefine endpoints or payload types outside @apical-ts/craft output
- request validation must be driven by generated schemas and metadata
- use `@hono/zod-validator` where request validation is needed
```

## Testing

```bash
pnpm run test
```

The test suite regenerates the Hono layer before running so the example stays
aligned with the contract.
