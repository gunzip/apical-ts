# Express OpenAPI Server Wrapper Examples

These examples demonstrate how to use the generated OpenAPI server wrappers with
Express.js, showcasing complete integrations that include both server-side
wrappers and client-side type-safe API calls. Two server implementations are
provided:

- **Express Server Example**: Full implementation with custom business logic
- **Mock Server Example**: Automatic mock server using zocker for data
  generation

## Overview

These examples use the
[Swagger Petstore OpenAPI specification](https://raw.githubusercontent.com/swagger-api/swagger-petstore/refs/heads/master/src/main/resources/openapi.yaml)
to generate:

- **Server wrappers**: Type-safe request handlers with automatic validation
- **Client functions**: Type-safe API client functions
- **Zod schemas**: Runtime validation schemas for all data types

The examples show how to bridge the generated server wrappers with Express.js
using an adapter pattern, and how to call the resulting API using the generated
client.

## Prerequisites

- Node.js 20.18.2+ (check your version with `node --version`)
- pnpm 10.14.0+ (install with `npm install -g pnpm@10.14.0`)

## Quick Start

### 1. Generate Server and Client Code

First, generate the TypeScript code from the OpenAPI specification:

```bash
# From the examples directory
pnpm generate:examples
```

This task will:

- Clean any existing generated code
- Run the TypeScript OpenAPI generator with both `--server` and `--client` flags
- Create the `generated/` directory with schemas, server wrappers, and client
  functions

### 2. Choose Your Server Implementation

#### Option A: Full Express Server with Custom Logic

Run the Express server that uses the generated server wrappers with custom
business logic:

```bash
# From the examples directory
pnpx tsx server-examples/express-server-example.ts
```

#### Option B: Mock Server with Auto-Generated Data

Run the mock Express server that automatically generates responses using zocker:

```bash
# From the examples directory
pnpx tsx server-examples/mock-server-example.ts
```

Both servers will start on `http://localhost:3000` and display available
endpoints:

```
🚀 Express server running on http://localhost:3000
📊 Available endpoints:
  GET /pet/findByStatus?status=available
  GET /pet/{petId} (e.g., /pet/1)
  GET /store/inventory
  GET /health
```

The mock server will additionally show:

```
📊 All OpenAPI operations are mocked with zocker-generated data for all status codes in responseMap
🔍 Validation errors include detailed error messages
```

### 3. Test with the Generated Client

In a new terminal, run the client example to test the API:

```bash
# From the examples directory
pnpx tsx client-examples/client-example.ts
```

This will demonstrate:

- Finding pets by status with query parameters
- Getting a specific pet by ID with path parameters
- Retrieving store inventory
- Handling typed operation errors (e.g. network, validation, missing schema)

### 4. Manual Testing

You can also test the API manually using curl:

```bash
# Find available pets
curl "http://localhost:3000/pet/findByStatus?status=available"

# Get pet by ID
curl "http://localhost:3000/pet/1"

# Get store inventory
curl "http://localhost:3000/store/inventory"

# Health check
curl "http://localhost:3000/health"
```

## Key Components Explained

### 1. Express Adapter (`server-examples/express-adapter.ts`)

The adapter module provides utilities to bridge generated server wrappers with
Express:

- **`extractRequestParams(req)`**: Converts Express `Request` objects into the
  format expected by generated wrappers
- **`sendWrapperResponse(res, result)`**: Sends wrapper results as Express
  responses
- **`createExpressAdapter()`**: Higher-order function for setting up routes

```typescript
// Example usage
const params = extractRequestParams(req);
const wrappedHandler = getPetByIdWrapper(getPetByIdHandler);
const result = await wrappedHandler(params);
sendWrapperResponse(res, result);
```

### 2. Server Implementation (`server-examples/express-server-example.ts`)

Shows two approaches for setting up routes:

**Manual approach:**

```typescript
app.get("/pet/findByStatus", async (req, res) => {
  const params = extractRequestParams(req);
  const wrappedHandler = findPetsByStatusWrapper(findPetsByStatusHandler);
  const result = await wrappedHandler(params);
  sendWrapperResponse(res, result);
});
```

**Helper function approach:**

```typescript
setupRoute(getPetByIdWrapper, getPetByIdRoute(), getPetByIdHandler);
```

### 3. Mock Server Implementation (`server-examples/mock-server-example.ts`)

Demonstrates automatic mock data generation using zocker:

**Key features:**

- **Automatic mock generation**: Uses zocker to generate realistic mock data for
  all response schemas
- **Status code coverage**: Mocks responses for all status codes defined in the
  OpenAPI specification
- **Validation error handling**: Provides detailed error messages for invalid
  requests
- **Generic handler factory**: `createMockHandler()` automatically creates
  handlers for any operation

**Mock handler pattern:**

```typescript
const createMockHandler = (routeInfo) => {
  const handler = async (params) => {
    if (!params.isValid) {
      // Generate mock validation error response
      const schema = routeInfo.responseMap["400"]["application/json"];
      const mockData = zocker(schema).setSeed(123).generate();
      return {
        status: 400,
        contentType: "application/json",
        data: { ...mockData, message: prettifyValidationError(params) },
      };
    }

    // Generate mock success response
    const statusResponseMap = routeInfo.responseMap["200"];
    const schema = statusResponseMap["application/json"];
    const data = zocker(schema).setSeed(123).generate();
    return { status: 200, contentType: "application/json", data };
  };
  return handler;
};
```

**Automatic route registration:**

```typescript
Object.values(routes).forEach((routeFn) => {
  registerRoute(routeFn());
});
```

### 3. Request Parameter Extraction

The `extractRequestParams` function handles parameter transformation:

- **Query parameters**: Extracted from `req.query`
- **Path parameters**: Extracted from `req.params`
- **Headers**: Extracted from `req.headers`
- **Body**: Passed through from `req.body`
- **Content-Type**: Extracted from request headers

Parameter names are transformed from kebab-case to camelCase to match the
generated schemas.

### 4. Handler Implementation Pattern

Generated server wrappers expect handlers that follow this pattern:

```typescript
const handler: getPetByIdHandler = async (params) => {
  if (!params.isValid) {
    // Handle validation errors
    return { status: 400 };
  }

  // Access validated parameters
  const { petId } = params.value.path;

  // Business logic here
  const pet = findPetById(petId);

  if (!pet) {
    return { status: 404 };
  }

  return {
    status: 200,
    contentType: "application/json",
    data: pet,
  };
};
```

### 5. Client Usage (`client-examples/client-example.ts`)

The generated client provides type-safe functions with built-in validation:

```typescript
// Configure client for local server
const localConfig = {
  ...globalConfig,
  baseURL: "http://localhost:3000",
};

// Call API with type safety
const response = await findPetsByStatus(
  { query: { status: "available" } },
  localConfig,
);

if (response.status === "200") {
  const data = response.parse();
  if (isParsed(data)) {
    console.log("Pets:", data.parsed);
  } else if (data.kind === "parse-error") {
    console.error("Validation failed:", data.error);
  }
} else {
  console.error("Operation failed:", response.kind, response.error);
}
```

### Error Handling with `neverthrow`

See
[`neverthrow-error-handling.ts`](./client-examples/neverthrow-error-handling.ts)
for an example of how to use `neverthrow` to handle errors from the generated
client.

## Generated Code Structure

### Server Wrappers (`generated/server/`)

Each operation generates:

- **Handler type**: `operationNameHandler` - Function signature for your
  business logic
- **Wrapper function**: `operationNameWrapper` - Validation and parameter
  extraction
- **Route function**: `route()` - Returns path and HTTP method information
- **Response types**: Discriminated unions for all possible responses

### Client Functions (`generated/client/`)

Each operation generates:

- **Client function**: Type-safe function for making API calls
- **Parameter types**: Input validation schemas
- **Response types**: Discriminated unions matching server responses
- **Parse helpers**: Runtime validation for response data

### Schemas (`generated/schemas/`)

- **Zod schemas**: Runtime validation schemas for all data types
- **TypeScript types**: Inferred types from Zod schemas
- **Import/export structure**: Proper module organization

## Benefits of This Approach

1. **Type Safety**: Full TypeScript coverage from API definition to
   implementation
2. **Runtime Validation**: Opt‑in (`parse()` method) or automatic
   (`forceValidation: true` in config) response validation
3. **Error Handling**: Structured, non‑throwing error objects with discriminated
   unions
4. **Framework Agnostic**: Server wrappers can work with any Node.js framework
5. **Consistent APIs**: Generated client matches server implementation exactly
6. **Development Experience**: IntelliSense, auto-completion, and compile-time
   checks
7. **Mock Server Support**: Automatic mock data generation for rapid prototyping
   and testing
8. **Comprehensive Coverage**: Mock server supports all status codes and
   response schemas from the OpenAPI specification

## Customization

### Choosing Between Server Implementations

- **Use Express Server Example** (`express-server-example.ts`) when:
  - You need custom business logic implementation
  - You want full control over response data
  - You're building a production API
  - You need to integrate with databases or external services

- **Use Mock Server Example** (`mock-server-example.ts`) when:
  - You need rapid prototyping and testing
  - You want to explore API behavior without implementing business logic
  - You're developing client applications and need realistic test data
  - You want to validate OpenAPI specifications with comprehensive response
    coverage

### Adding New Operations

1. Update the OpenAPI specification (`examples.yaml`)
2. Regenerate code: `pnpm generate:examples`
3. Implement the handler in your Express server (for custom logic)
4. Use the generated client to call the new endpoint

### Custom Error Handling

```typescript
const handler: operationHandler = async (params) => {
  if (params.kind === "query-error") {
    // Handle query parameter validation errors
    console.error("Query validation failed:", params.error);
    return {
      status: 400,
      contentType: "application/json",
      data: { error: "Invalid query parameters" },
    };
  }

  if (params.kind === "path-error") {
    // Handle path parameter validation errors
    return {
      status: 400,
      contentType: "application/json",
      data: { error: "Invalid path parameters" },
    };
  }

  // Handle success case
  // ...
};
```

## Troubleshooting

### Generation Issues

- **File not found**: Ensure you're running the generation task
  `pnpm generate:examples`
- **Network issues**: Check your internet connection for downloading the OpenAPI
  spec

### Runtime Issues

- **Module not found**: Ensure generated code exists by running the generation
  task `pnpm generate:examples`
- **Type errors**: Regenerate code after OpenAPI specification changes
- **Connection refused**: Make sure the Express server is running before running
  the client
