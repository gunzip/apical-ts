# Using Generated Server Routes Wrappers

Apical TS supports two contract-first server integration styles:

1. **Wrapper-based integrations** via `--server`
2. **Metadata-driven integrations** via `--routes`

This page focuses on the first style. It is the approach used in
`examples/express`: Apical generates typed wrappers, and you explicitly bind
them to your framework routes. If you want to derive a framework layer from
route metadata instead of wiring routes one by one, see the Hono example and the
`--routes` flow.

## How to Generate Server Wrappers

To generate server-side wrappers, use the CLI with the `--server` flag:

```bash
npx @apical-ts/craft generate \
  --server \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This creates:

- **`routes/`**: route metadata shared by every generated integration
- **`server/index.ts`**: exports the server handler wrappers and types
- **`server/<operationId>.ts`**: individual operation handler wrappers

## When to Use `--server` vs `--routes`

- Use **`--server`** when you want Apical to validate requests and type your
  handler inputs/outputs, while you keep explicit control over framework route
  registration. This is the more static style shown in `examples/express`.
- Use **`--routes`** when you want metadata only and plan to generate a second
  framework layer from it. This is the more dynamic style shown in
  `examples/hono`.
- You can mix both approaches because `--server` also generates `routes/`. The
  same contract can therefore power Express handlers, Hono generators, MSW mock
  handlers, or TanStack Query hook generators without remodeling the API
  surface.

## Runtime Dependencies

The generated server code requires `zod` as a runtime dependency for request and
response validation. After generation, install dependencies in your project or
output directory as needed.

## Using the Wrapped Handler

The generated route wrapper takes a typed handler and returns an async function
that you can connect to any web framework. Your framework adapter is responsible
for:

1. Extracting `query`, `path`, `headers`, `body`, and `contentType`
2. Passing that data to the wrapper
3. Translating the wrapper result back into the framework response

This is what keeps the framework layer thin: the contract stays in the generated
files, while your adapter only moves data in and out of them.

Example usage with Express:

```ts
const getPetByIdHandler: getPetByIdHandler = async (params) => {
  if (!params.isValid) {
    return { status: "400" };
  }

  const { petId } = params.value.path;
  const pet = mockPets.find((candidate) => candidate.id === petId);

  if (!pet) {
    return { status: "404" };
  }

  return {
    status: "200",
    contentType: "application/json",
    data: pet,
  };
};

createExpressAdapter(getPetByIdRoute(), getPetByIdHandler)(app);
```

The wrapper receives a single params object containing validated query, path,
headers, and body data, or structured validation errors when parsing fails. All
responses are type checked against the OpenAPI contract.

### Handler Function Signature

The handler you provide to the wrapper receives one of:

- `{ isValid: true, value: { query, path, headers, body, ... } }`
- `{ isValid: false, kind: "query-error" | "body-error" | ..., error: ZodError }`

It must return a typed object shaped like `{ status, contentType, data }`.

## Why This Is the "Static" Route Style

With `--server`, you still choose how routes are mounted in the framework. That
is useful when you want:

- full control over middleware ordering and framework features
- custom business logic per endpoint
- incremental adoption in an existing server

If, instead, you want the contract to drive route registration itself, start
from `--routes` and generate a framework-specific layer from the route metadata,
as shown in `examples/hono`.
