# Framework Integrations

Apical TS works best as a **contract-first** generator: you describe the API
once in OpenAPI, then let every integration consume the generated artifacts
instead of re-declaring paths, params, and response shapes for each framework.

The main reusable outputs are:

- **`generated/routes/*`**: route metadata plus request/response schemas
- **`generated/server/*`**: typed request-validation wrappers for explicit
  server integrations
- **`generated/client/*`**: typed operation functions for frontend and SDK usage

## Static vs Dynamic Route Usage

Different integrations reuse the same contract in different ways:

| Style                               | Generated input                                                       | Example                                                                                                                                                                        | What you write                                                                |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Static, wrapper-based               | `--server` (`server/` + `routes/`)                                    | [Express](https://github.com/gunzip/apical-ts/tree/main/examples/express/)                                                                                                     | explicit framework route registration and business handlers                   |
| Dynamic, metadata-driven            | `--routes` (or the `routes/` emitted alongside `--client`/`--server`) | [Hono](https://github.com/gunzip/apical-ts/tree/main/examples/hono/)                                                                                                           | a second generator or adapter that derives framework glue from route metadata |
| Dynamic, contract-derived consumers | `--client` or `--server`, plus `routes/`                              | [TanStack Query](https://github.com/gunzip/apical-ts/tree/main/examples/tanstack-query-hooks/), [MSW](https://github.com/gunzip/apical-ts/tree/main/examples/msw-mock-server/) | hooks, mock handlers, and utilities generated from the same operations        |

The important part is that the OpenAPI contract stays the single source of truth
no matter which style you choose.

## Example Integrations

We provide complete working examples in the
[`examples/`](https://github.com/gunzip/apical-ts/tree/main/examples/) folder:

### Express: explicit wrapper-based integration

The
[Express example](https://github.com/gunzip/apical-ts/tree/main/examples/express/)
shows the more static style: generate `--server`, then register each route in
Express with the generated wrapper.

**What it demonstrates**

- request/response validation from generated wrappers
- explicit route registration with framework-specific adapters
- custom business logic without redefining the API contract

```typescript
createExpressAdapter(getPetByIdRoute(), getPetByIdHandler)(app);
```

### Hono: route-metadata-driven generation

The [Hono example](https://github.com/gunzip/apical-ts/tree/main/examples/hono/)
shows the more dynamic style: generate `--routes`, then run a second generator
that turns route metadata into a Hono registration layer.

**What it demonstrates**

- route-metadata-driven code generation
- automatic request validation for path, query, headers, and body
- zero manual remodelling of endpoints when switching from Express to Hono

```typescript
registerGeneratedRoutes(app);
```

### TanStack Query: hooks derived from generated operations

The
[TanStack Query example](https://github.com/gunzip/apical-ts/tree/main/examples/tanstack-query-hooks/)
shows how the same contract can feed frontend hooks. Apical generates the client
and routes once, then a secondary generator emits `useX` and `useXMutation`
hooks from those artifacts.

**What it demonstrates**

- `useX` hooks for GET/HEAD operations
- `useXMutation` hooks for write operations
- type inference from generated client operations and route methods

```typescript
const { data, isLoading, error } = useFindPetsByStatus({
  query: { status: ["available"] },
});
```

### MSW: mock handlers derived from generated wrappers

The
[MSW example](https://github.com/gunzip/apical-ts/tree/main/examples/msw-mock-server/)
shows a dynamic mock integration. It iterates the generated operations, creates
one MSW handler per route, and still reuses the generated wrapper validation and
response maps.

**What it demonstrates**

- dynamic handler registration from generated operations
- request validation aligned with the OpenAPI contract
- mock payload generation from response schemas via `zocker`

```typescript
const handlers = Object.values(routes).map((routeFn) => {
  const routeInfo = routeFn();
  return createMswHandler(routeInfo, createMockHandler(routeInfo));
});
```

## Adapting to Other Frameworks

Once you have generated `routes/`, `server/`, or `client/`, every other
integration follows the same pattern:

1. Import the generated contract artifacts
2. Derive framework-specific adapters, handlers, or hooks from those artifacts
3. Keep framework code thin and avoid redefining API models by hand

That is the main advantage of the contract-first flow: you can swap or add
integrations without remodeling the API every time.

## Getting Started

To explore these integrations:

1. Clone the repository
2. Navigate to the desired example: `cd examples/[framework]`
3. Install dependencies: `pnpm install`
4. Generate the code: `pnpm run generate`
5. Run the example using the command documented in that example's README

Each example README now documents which generated artifacts it consumes and how
to extend that integration without breaking the contract-first workflow.
