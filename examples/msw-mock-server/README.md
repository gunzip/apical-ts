# MSW Contract-First Mock Server Example

This example shows how to turn @apical-ts/craft generated artifacts into a Mock
Service Worker server implementation.

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

## Example prompt

Use a prompt like this when you want an LLM to recreate MSW handlers from
scratch starting from the OpenAPI contract only:

```text
Goal: build MSW mock handlers from
@apical-ts/craft artifacts instead of hand-writing one handler per endpoint.

Process:
1. Run `npx @apical-ts/craft generate -i examples.yaml -o generated --server --client`.
2. Treat the generated files as the integration inputs:
   - `generated/server/*` for wrappers and response maps
   - `generated/routes/*` for path and method metadata
   - `generated/schemas/*` for schema-driven mock data
3. Implement `msw-adapter.ts` so it:
   - converts MSW requests into the params expected by the generated wrappers
   - converts wrapper results back into MSW responses
4. Implement `mock-server-example.ts` as a handler
   generator/factory that:
   - iterates the generated operations
   - creates one MSW handler per route at runtime
   - validates requests through the generated wrappers
   - selects response schemas from `responseMap`
   - generates payloads with `zocker`
5. Export the resulting handlers so they can be used with both
   `setupServer(...)` and `setupWorker(...)`.

Rules:
- do not hand-write endpoint-specific handler lists
- do not redefine paths, params, or response payloads outside @apical-ts/craft output
- the custom code should only be the MSW adapter and runtime handler factory
```
