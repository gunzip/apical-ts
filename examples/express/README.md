# Express Contract-First Server Example

This example shows the **static, wrapper-based** integration style. Apical TS
generates the contract artifacts once, then Express explicitly wires each route
to the generated wrappers. You keep full control over middleware and business
logic without re-declaring paths, params, or response types by hand.

## Contract-first flow

1. `examples.yaml` is the source of truth.
2. `pnpm run generate` runs Apical with `--server --client`.
3. Apical emits:
   - `generated/routes/*`: route metadata shared across integrations
   - `generated/server/*`: typed wrappers and handler signatures for Express
   - `generated/client/*`: typed client operations for the client example
   - `generated/schemas/*`: runtime validation schemas
4. `server-examples/express-adapter.ts` adapts Express `Request` / `Response`
   objects to the generated wrappers.
5. `server-examples/express-server-example.ts` registers each route explicitly.

## Static vs dynamic route usage

- **Express in this folder** is the static style: you decide how every route is
  mounted with `createExpressAdapter(...)` or manual wrapper calls.
- **Hono in `../hono`** is the dynamic style: a second generator reads the
  generated route metadata and emits a full Hono registration layer.
- Both approaches reuse the same contract, so switching frameworks does not
  require remodeling the API.

## Quick start

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. Generate the contract artifacts:

   ```bash
   cd examples/express
   pnpm run generate
   ```

3. Run the Express server:

   ```bash
   pnpx tsx server-examples/express-server-example.ts
   ```

4. In another terminal, exercise the generated client:

   ```bash
   pnpx tsx client-examples/client-example.ts
   ```

For the mock-only variant, run:

```bash
pnpx tsx server-examples/mock-server-example.ts
```

## Project layout

- `examples.yaml`: the API contract used by this example
- `generated/server/*`: wrapper-based server integration
- `generated/routes/*`: reusable route metadata
- `server-examples/express-adapter.ts`: Express-specific request/response bridge
- `server-examples/express-server-example.ts`: custom business logic plus
  explicit route registration
- `client-examples/*`: typed client consumers of the same contract

## Example prompt

Use a prompt like this when you want an LLM to extend the Express integration
without re-modeling the API:

```text
You are working in examples/express.

Use `examples.yaml`, `generated/routes/*`, and `generated/server/*` as the only
source of truth for the API surface. Do not redefine paths, methods, params, or
response payloads by hand.

Update the Express integration so that:
- each route is registered from generated metadata
- each handler is wrapped with the generated Apical server wrapper
- business logic stays in `server-examples/*`
- response objects keep the generated status/contentType/data unions
- existing adapters are reused instead of creating ad-hoc DTOs or duplicate
  schema definitions
```

## Why this example matters

This is the best reference when you want **maximum framework control** while
still keeping the contract generated once. If you want the contract to drive
route registration more directly, compare it with the Hono example.
