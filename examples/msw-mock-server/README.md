# MSW Contract-First Mock Server Example

This example shows how to turn Apical-generated artifacts into a **dynamic mock
integration** with Mock Service Worker. Like the Express example, it reuses the
generated server wrappers for validation. Unlike Express, it registers handlers
dynamically by iterating the generated operations.

## Contract-first flow

1. `examples.yaml` is the source of truth.
2. `pnpm run generate` runs Apical with `--server --client`.
3. Apical emits:
   - `generated/routes/*`: shared route metadata
   - `generated/server/*`: typed wrappers and route info for mock handlers
   - `generated/client/*`: typed client operations
   - `generated/schemas/*`: runtime schemas reused by mocks
4. `server-examples/msw-adapter.ts` adapts generated wrapper results to MSW.
5. `server-examples/mock-server-example.ts` loops over the generated operations
   and creates one MSW handler per route.

## Where this sits on the static/dynamic spectrum

- **Express**: explicit route registration, one framework binding at a time
- **MSW in this folder**: dynamic handler registration over generated wrappers
- **Hono**: second generator that emits a framework layer from route metadata

All three approaches start from the same contract and generated artifacts.

## Quick start

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. Generate the contract artifacts:

   ```bash
   cd examples/msw-mock-server
   pnpm run generate
   ```

3. Run the MSW example:

   ```bash
   pnpm run dev
   ```

## Project layout

- `examples.yaml`: the API contract
- `generated/server/*`: generated wrappers reused by MSW handlers
- `generated/routes/*`: shared route metadata
- `server-examples/msw-adapter.ts`: MSW-specific adapter
- `server-examples/mock-server-example.ts`: dynamic handler registration and
  `zocker`-based responses

## Example prompt

Use a prompt like this when you want an LLM to extend the MSW integration from
generated Apical artifacts:

```text
You are working in examples/msw-mock-server.

Use `generated/server/*`, `generated/routes/*`, and `generated/schemas/*` as
the only API contract. Do not redefine endpoints or payload shapes manually.

Generate or update the MSW integration so that:
- one handler is created per generated operation
- method and path come from generated route info
- request validation goes through the generated Apical wrapper
- response schemas are selected from `responseMap`
- mock payloads are generated from the schemas with `zocker`
- the result works with both `setupServer(...)` and `setupWorker(...)`
```

## Usage in tests

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./server-examples/mock-server-example.js";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Usage in the browser

```typescript
import { setupWorker } from "msw/browser";
import { handlers } from "./server-examples/mock-server-example.js";

const worker = setupWorker(...handlers);

export async function startMocking() {
  await worker.start();
}
```

See `server-examples/browser-setup.ts` for the complete browser bootstrap.

## Testing

```bash
pnpm run test
```
