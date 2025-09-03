# Server Routes Wrappers Generation

The generator can also produce a fully-typed server handler wrapper for your
OpenAPI operations. This enables you to build type-safe HTTP servers (e.g., with
Express, Fastify, or custom frameworks) that validate requests at runtime using
Zod schemas and can return only responses of the expected types.

## How to Generate a Server Route Wrapper

To generate server-side code, use the CLI with the `--generate-server` flag:

```bash
npx @apical-ts/craft generate \
  --generate-server \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This will create a `server/` directory in your output folder, containing:

- **`server/index.ts`**: Exports the server handler wrappers and types
- **`server/<operationId>.ts`**: Individual operation handler wrappers

## Using the Wrapped Handler

The generated route wrapper is a function that takes a request handler and
returns an async function that can be used with any web framework. This allows
you to ensure type safety and runtime validation for your request parameters
(path, query, headers) and response data.

You are responsible for extracting parameters from the framework request and
passing them to the wrapper, then handling the result (status, contentType,
data) in your route handler. This allows you to integrate with any web framework
and customize error handling as needed.

Example usage with Express and a helper for parameter extraction:

```ts
// ../examples/server-examples/express-server-example.ts#L62-L91

/* Implementation of getPetById handler */
const getPetByIdHandler: getPetByIdHandler = async (params) => {
  if (!params.isValid) {
    /* Handle validation errors */
    console.error("Validation error in getPetById:", params);
    return {
      status: 400,
    };
  }

  const { petId } = params.value.path;
  console.log(`Getting pet by ID: ${petId}`);

  /* Find pet by ID */
  const pet = mockPets.find((p) => p.id === petId);

  if (!pet) {
    return {
      status: 404,
    };
  }

  // Response is typed here
  return {
    status: 200,
    contentType: "application/json",
    data: pet,
  };
};
/* Setup routes using the helper function */
createExpressAdapter(getPetByIdRoute(), getPetByIdHandler)(app);
```

- The wrapper receives a single params object containing validated query, path,
  headers, body, etc. or error details if validation fails
- You control the HTTP response based on the wrapper's result
- All responses are type checked: you cannot return a response shape which is
  not valid according to the OpenAPI schema.

See the `apps/examples` directory in the repository for more usage examples.

### Handler Function Signature

The handler you provide to the wrapper receives a single argument:

- For valid requests:
  `{ success: true, value: { query, path, headers, body, ... } }`
- For validation errors:
  `{ success: false, kind: "query-error" | "body-error" | ... , error: ZodError }`

It must return an object with `{ status, contentType, data }`.

## Features

- Request validation (body, query, params) using generated Zod schemas
- Response validation before sending (if you use the generated types)
- Automatic error details for validation failures
- Type-safe handler context

You can use the generated types and schemas for further custom validation or
integration with other frameworks.
