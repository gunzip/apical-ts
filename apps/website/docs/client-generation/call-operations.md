# Call Operations

Once you have [defined your configuration](define-configuration), you can call
the generated operation functions to interact with your API. Each operation
function is type-safe and returns consistent response objects.

## Basic Operation Calls

Let's use this configuration for our API calls:

```typescript
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
  },
};
```

### Simple GET Operation passing config

```typescript
import { getPetById } from "./generated/client/getPetById.js";

// Call the operation, never throw errors
const result = await getPetById({ path: { petId: "123" } }, apiConfig);

// You must check for status code since
// different status codes may have different response shapes
// TypeScript will narrow the type based on the status code
if (result.status === "200") {
  const { data, contentType } = result.parsed;
  // Different content types may have different schemas
  console.log("Content type:", contentType);
  console.log("Pet name:", data.name);
}
```

### Simple GET Operation with configured defaults

You don't have to pass the config every time. You can bind one or more
operations to a configuration using `configureOperations`:

```typescript
import { getPetById } from "./generated/client/getPetById.js";

// Here you can bind one or more operations to the config
const api = configureOperations({ getPetById }, apiConfig);

// Call the operation without config
const result = await api.getPetById({ path: { petId: "123" } });
```

## Parameter Types

All request parameters (path, query, headers and body) are automatically typed
based on your OpenAPI specification.

### Path Parameters

```typescript
// For a path like /pets/{petId}/photos/{photoId}
const result = await getPetPhoto({
  path: {
    petId: "123",
    photoId: "456",
  },
});
```

### Query Parameters

```typescript
// For an operation that accepts query parameters
const result = await searchPets({
  query: {
    status: "available",
    category: "dogs",
    limit: 10,
    offset: 0,
  },
});
```

### Header Parameters

```typescript
const result = await getPetById({
  headers: {
    "X-Request-ID": "req-123456", // Header parameter
  },
  path: {
    petId: "123",
  },
});
```

### Request Body

```typescript
const result = await updatePet({
  path: {
    petId: "123",
  },
  body: {
    name: "Updated Name",
    status: "sold",
  },
});
```

## Response Objects

All operations return a consistent response structure that is either a success
or error object.

### Success Response

```typescript
type SuccessResponse = {
  isValid: true;
  status: string; // HTTP status code as string literal, e.g. "200"
  data: unknown; // Raw response data
  response: Response; // Original fetch Response object
  parse: () => ParseResult | { parsed: <parsed payload> }; // Parse method for validation
};
```

Success responses return either a `parse()` method or a parsed object depending
on the value of `forceValidation` flag. See
[Response payload validation](response-payload-validation.md) for more details.

### Error Response

```typescript
type ErrorResponse = {
  isValid: false;
  status: undefined;
  kind: string; // Error type discriminator
  error: unknown; // Error details
  result?: {
    status: string; // Real HTTP status when a response exists
    data: unknown; // Response data
    response: Response; // Original Response
  };
};
```

## Working with Responses

### Checking Success

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (result.status === "200") {
  const { data, contentType } = result.parsed;
  console.log("Content type:", contentType);
  console.log("Data:", data);
} else if (!result.isValid) {
  console.error("Error kind:", result.kind);
  console.error("Error details:", result.error);
}
```

### Handling Different Status Codes

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (!result.isValid) {
  console.error("Operation failed:", result.kind, result.error);
} else if (result.status === "200") {
  const { data, contentType } = result.parsed;
  console.log("Content type:", contentType);
  console.log("Pet found:", data);
} else if (result.status === "404") {
  console.warn("Pet not found");
} else {
  console.error("Unexpected status:", result.status);
}
```

### Accessing Raw Response object

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (result.isValid) {
  // Access response headers
  const contentType = result.response.headers.get("content-type");
  const lastModified = result.response.headers.get("last-modified");

  // Check if response was cached
  const wasCached = !result.response.ok && result.response.status === 304;

  console.log("Content-Type:", contentType);
  console.log("Last-Modified:", lastModified);
  console.log("Was cached:", wasCached);
}
```

## Content Types

### Multiple Content Types

Operations can handle multiple request and response content types:

```typescript
const xmlResult = await updatePet({
  path: { petId: "123" },
  body: "<pet><name>Fluffy</name></pet>",
  contentType: {
    request: "application/xml",
    response: "application/xml",
  },
});
```

### Content Type Detection

The generated client automatically handles content type detection:

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (result.status === "200") {
  // Response content type may only be known at runtime
  const { contentType, data } = result.parsed;
  if (contentType === "application/xml") {
    // Handle XML response
    const xmlData = data;
  }
}
```

## Error Handling

### Network Errors

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (!result.isValid && result.kind === "unexpected-error") {
  // Network failure, connection timeout, etc.
  console.error("Network error:", result.error);
}
```

### Non Compliant Responses

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (!result.isValid && result.kind === "unexpected-response") {
  // ie. HTTP status not defined in OpenAPI spec
  console.error(`HTTP ${result.status}: ${result.error}`);
}
```

### Payload Validation Errors

#### With Automatic Response Parsing

```typescript
const response = await getPetById({ path: { petId: "123" } });

// Switch on status codes
switch (response.status) {
  case "200":
    const { data, contentType } = response.parsed;
    // Validation succeeded
    console.log("Content type:", contentType);
    console.log("Typed validated data:", data[0].name);
    break;
  case "404":
    console.warn("Pet not found");
    break;
  case undefined:
    console.error("Error:", response.error);
    return response.error;
}
```

#### With Manual Response Parsing

```typescript
const response = await getPetById({ path: { petId: "123" } });

if (response.status === "200") {
  // Assume forceValidation=false
  const parseResult = await response.parse();
  if (parseResult.kind === "parse-error") {
    // Validation failed
    console.error("Validation failed:", parseResult.error.issues);
  } else if (isParsed(parseResult)) {
    const pets = parseResult.parsed;
    // Validation succeeded
    console.log("Typed validated data:", pets[0].name);
  }
}
```

## Best Practices

1. **Use `result.status`** to discriminate documented responses
1. **Handle different status codes** explicitly rather than assuming success
   means 200

## Next Steps

- Learn about
  [binding configuration to operations](define-configuration#binding-configuration-to-operations)
  for better ergonomics
- Understand response handling patterns in detail
- Explore error handling strategies
- See response payload validation documentation for runtime type safety
