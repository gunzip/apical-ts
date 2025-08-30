# Express OpenAPI Server Wrapper Example

This example demonstrates how to use the generated OpenAPI server wrappers with Express.js, showcasing a complete integration that includes both server-side wrappers and client-side type-safe API calls.

## Overview

This example uses the [Swagger Petstore OpenAPI specification](https://raw.githubusercontent.com/swagger-api/swagger-petstore/refs/heads/master/src/main/resources/openapi.yaml) to generate:

- **Server wrappers**: Type-safe request handlers with automatic validation
- **Client functions**: Type-safe API client functions
- **Zod schemas**: Runtime validation schemas for all data types

The example shows how to bridge the generated server wrappers with Express.js using an adapter pattern, and how to call the resulting API using the generated client.

## Directory Structure

```
examples/
├── openapi.yaml                    # OpenAPI specification (Swagger Petstore)
├── generate-server-client.sh       # Script to generate server and client code
├── src/
│   ├── express-server-example.ts   # Express server using generated wrappers
│   ├── express-adapter.ts          # Adapter for connecting wrappers to Express
│   └── client-example.ts           # Client example calling the Express server
├── generated/                      # Generated code (created by script)
│   ├── schemas/                    # Zod schemas for data validation
│   ├── server/                     # Server operation wrappers
│   └── client/                     # Type-safe client functions
└── README.md                       # This file
```

## Prerequisites

- Node.js 20.18.2+ (check your version with `node --version`)
- pnpm 10.14.0+ (install with `npm install -g pnpm@10.14.0`)

## Quick Start

### 1. Generate Server and Client Code

First, generate the TypeScript code from the OpenAPI specification:

```bash
# From the examples directory
./generate-server-client.sh
```

This script will:

- Clean any existing generated code
- Run the TypeScript OpenAPI generator with both `--generate-server` and `--generate-client` flags
- Create the `generated/` directory with schemas, server wrappers, and client functions

### 2. Install Dependencies

Install the required dependencies for running the examples:

```bash
# Install Express and types (if not already available)
pnpm add express @types/express
```

### 3. Start the Express Server

Run the Express server that uses the generated server wrappers:

```bash
# From the examples directory
pnpx tsx src/express-server-example.ts
```

The server will start on `http://localhost:3000` and display available endpoints:

```
🚀 Express server running on http://localhost:3000
📊 Available endpoints:
  GET /pet/findByStatus?status=available
  GET /pet/{petId} (e.g., /pet/1)
  GET /store/inventory
  GET /health
```

### 4. Test with the Generated Client

In a new terminal, run the client example to test the API:

```bash
# From the examples directory
pnpx tsx src/client-example.ts
```

This will demonstrate:

- Finding pets by status with query parameters
- Getting a specific pet by ID with path parameters
- Retrieving store inventory
- Handling typed operation errors (e.g. network, validation, missing schema)

### 5. Manual Testing

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

### 1. Express Adapter (`src/express-adapter.ts`)

The adapter module provides utilities to bridge generated server wrappers with Express:

- **`extractRequestParams(req)`**: Converts Express `Request` objects into the format expected by generated wrappers
- **`sendWrapperResponse(res, result)`**: Sends wrapper results as Express responses
- **`createExpressAdapter()`**: Higher-order function for setting up routes

```typescript
// Example usage
const params = extractRequestParams(req);
const wrappedHandler = getPetByIdWrapper(getPetByIdHandler);
const result = await wrappedHandler(params);
sendWrapperResponse(res, result);
```

### 2. Server Implementation (`src/express-server-example.ts`)

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

### 3. Request Parameter Extraction

The `extractRequestParams` function handles parameter transformation:

- **Query parameters**: Extracted from `req.query`
- **Path parameters**: Extracted from `req.params`
- **Headers**: Extracted from `req.headers`
- **Body**: Passed through from `req.body`
- **Content-Type**: Extracted from request headers

Parameter names are transformed from kebab-case to camelCase to match the generated schemas.

### 4. Handler Implementation Pattern

Generated server wrappers expect handlers that follow this pattern:

```typescript
const handler: getPetByIdHandler = async (params) => {
  if (params.kind !== "ok") {
    // Handle validation errors
    return { status: 400, contentType: "", data: void 0 };
  }

  // Access validated parameters
  const { petId } = params.value.path;

  // Business logic here
  const pet = findPetById(petId);

  if (!pet) {
    return { status: 404, contentType: "", data: void 0 };
  }

  return {
    status: 200,
    contentType: "application/json",
    data: pet,
  };
};
```

### 5. Client Usage (`src/client-example.ts`)

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

if (response.status === 200) {
  const parsed = response.parse();
  if ("parsed" in parsed) {
    console.log("Pets:", parsed.parsed);
  } else if (parsed.kind === "parse-error") {
    console.error("Validation failed:", parsed.error);
  }
} else if ("kind" in response) {
  console.error("Operation failed:", response.kind, response.error);
}
```

## Generated Code Structure

### Server Wrappers (`generated/server/`)

Each operation generates:

- **Handler type**: `operationNameHandler` - Function signature for your business logic
- **Wrapper function**: `operationNameWrapper` - Validation and parameter extraction
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

1. **Type Safety**: Full TypeScript coverage from API definition to implementation
2. **Runtime Validation**: Opt‑in or automatic validation of responses via `parse()` / `--force-validation`
3. **Error Handling**: Structured, non‑throwing error objects with discriminated unions
4. **Framework Agnostic**: Server wrappers can work with any Node.js framework
5. **Consistent APIs**: Generated client matches server implementation exactly
6. **Development Experience**: IntelliSense, auto-completion, and compile-time checks

## Customization

### Adding New Operations

1. Update the OpenAPI specification (`openapi.yaml`)
2. Regenerate code: `./generate-server-client.sh`
3. Implement the handler in your Express server
4. Use the generated client to call the new endpoint

### Custom Error Handling

```typescript
const handler: operationHandler = async (params) => {
  if (params.kind === "query_error") {
    // Handle query parameter validation errors
    console.error("Query validation failed:", params.error);
    return {
      status: 400,
      contentType: "application/json",
      data: { error: "Invalid query parameters" },
    };
  }

  if (params.kind === "path_error") {
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

### Integration with Database

```typescript
const getPetByIdHandler: getPetByIdHandler = async (params) => {
  if (params.kind !== "ok") {
    return { status: 400, contentType: "", data: void 0 };
  }

  const { petId } = params.value.path;

  try {
    const pet = await database.pets.findById(petId);
    if (!pet) {
      return { status: 404, contentType: "", data: void 0 };
    }

    return {
      status: 200,
      contentType: "application/json",
      data: pet,
    };
  } catch (error) {
    console.error("Database error:", error);
    return { status: 500, contentType: "", data: void 0 };
  }
};
```

## Troubleshooting

### Generation Issues

- **File not found**: Ensure you're running the generation script from the `examples/` directory
- **Permission denied**: Make sure the script is executable: `chmod +x generate-server-client.sh`
- **Network issues**: Check your internet connection for downloading the OpenAPI spec

### Runtime Issues

- **Module not found**: Ensure generated code exists by running the generation script
- **Type errors**: Regenerate code after OpenAPI specification changes
- **Connection refused**: Make sure the Express server is running before running the client

### Common Patterns

**Converting Express paths to OpenAPI paths:**

```typescript
const expressPath = routeInfo.path.replace(/{([^}]+)}/g, ":$1");
// "/pet/{petId}" becomes "/pet/:petId"
```

**Handling optional parameters:**

```typescript
if (status !== undefined) {
  url.searchParams.append("status", String(status));
}
```

This example provides a complete, production-ready pattern for integrating OpenAPI specifications with Express.js using generated TypeScript code.
