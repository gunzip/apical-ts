# MSW Mock Server Example

This example demonstrates how to use **Mock Service Worker (MSW)** with the
generated OpenAPI server wrappers and schemas to create a fully functional mock
API server.

## Features

- 🎭 **MSW-based mocking**: Intercepts HTTP requests using MSW
- 🔄 **Auto-generated mock data**: Uses `zocker` to generate realistic mock
  responses
- ✅ **Request validation**: Validates all incoming requests against OpenAPI
  schemas
- 🎯 **Type-safe handlers**: Fully typed request/response handling
- 🔍 **Detailed error messages**: Pretty validation error reporting
- 📊 **Multi-status support**: Mocks all response status codes defined in
  OpenAPI spec

## Installation

```bash
pnpm install
```

## Generate Client/Server Code

```bash
pnpm generate
```

This generates TypeScript client, server wrappers, and Zod schemas from
`examples.yaml`.

## Run the Mock Server

```bash
pnpm dev
```

The server will start and log all registered handlers.

## How It Works

### MSW Adapter

The `msw-adapter.ts` module provides a bridge between the generated OpenAPI
server wrappers and MSW's handler API:

- **`createMswHandler`**: Converts generated route info into MSW request
  handlers
- **Parameter extraction**: Maps MSW request objects to the wrapper's expected
  format
- **Response formatting**: Converts wrapper responses to MSW's response format

### Mock Server Example

The `mock-server-example.ts` demonstrates:

1. **Handler registration**: Automatically registers all generated operations as
   MSW handlers
2. **Mock data generation**: Uses `zocker` with response schemas to generate
   realistic data
3. **Validation handling**: Returns appropriate 400 errors with detailed
   messages for invalid requests
4. **Status code selection**: Intelligently picks the best status code to mock
   (prefers 2xx)

## Usage in Tests

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./server-examples/mock-server-example.js";

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("fetches pets", async () => {
  const response = await fetch("http://localhost:3001/pets");
  const pets = await response.json();
  expect(Array.isArray(pets)).toBe(true);
});
```

## Usage in Browser

Create a browser setup file:

```typescript
import { setupWorker } from "msw/browser";
import { handlers } from "./server-examples/mock-server-example.js";

const worker = setupWorker(...handlers);

export async function startMocking() {
  await worker.start();
}
```

Then in your app:

```typescript
import { startMocking } from "./browser-setup.js";

if (import.meta.env.DEV) {
  await startMocking();
}
```

See [browser-setup.ts](./server-examples/browser-setup.ts) for a complete
example.

## Customization

You can customize the mock responses by:

1. **Modifying the `createMockHandler` logic** in
   [mock-server-example.ts](./server-examples/mock-server-example.ts)
2. **Adding custom response data** instead of using `zocker`
3. **Implementing specific business logic** for certain operations
4. **Customizing the base URL** by passing it to `createHandlers(baseUrl)`

### Example: Custom Handler

```typescript
import { createMswHandler } from "./msw-adapter.js";
import { routes } from "../generated/server/index.js";

const customHandler = async (params: any) => {
  if (!params.isValid) {
    return {
      status: "400",
      contentType: "application/json",
      data: { error: "Validation failed" },
    };
  }

  /* Custom business logic */
  const petId = params.value.path.petId;

  return {
    status: "200",
    contentType: "application/json",
    data: {
      id: petId,
      name: "Custom Pet Name",
      status: "available",
    },
  };
};

const routeInfo = routes.getPetById();
const handler = createMswHandler(
  routeInfo,
  customHandler,
  "http://localhost:3001",
);
```

## Advanced Usage

### Response Delay Simulation

```typescript
import { delay } from "msw";

const handler: any = async (params: any) => {
  /* Simulate network delay */
  await delay(1000);

  /* Return mock response */
  return {
    status: "200",
    contentType: "application/json",
    data: mockData,
  };
};
```

### Dynamic Response Based on Request

```typescript
const handler: any = async (params: any) => {
  const status = params.value.query?.status;

  /* Return different data based on query parameter */
  if (status?.includes("available")) {
    return {
      status: "200",
      contentType: "application/json",
      data: [
        /* Available pets */
      ],
    };
  }

  return {
    status: "200",
    contentType: "application/json",
    data: [
      /* Other pets */
    ],
  };
};
```

## Comparison with Express Example

This MSW example is equivalent to the
[Express mock server example](../express/server-examples/mock-server-example.ts)
but offers these advantages:

- ✅ Works in both Node.js and browser environments
- ✅ No server port binding required
- ✅ Ideal for testing without network overhead
- ✅ Can intercept requests from any HTTP client
- ✅ Perfect for frontend development and testing

## License

MIT
