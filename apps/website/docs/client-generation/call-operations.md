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
  // Forcing validation let us automatically validate responses
  // and access the parsed data directly in case of success
  forceValidation: true,
};
```

### Simple GET Operation passing config

```typescript
import { getPetById } from "./generated/client/getPetById.js";

// Call the operation, never throw errors
const result = await getPetById({ path: { petId: "123" } }, apiConfig);

// TypeScript will narrow the type based on the status code
if (result.isValid && result.status === 200) {
  // You must check for status code since
  // different status codes may have different response shapes
  console.log("Pet name:", result.parsed.name);
}
```

### Simple GET Operation with configured defaults

```typescript
import { getPetById } from "./generated/client/getPetById.js";

// Here you can bind one or more operations to the config
const api = configureOperations({ getPetById }, apiConfig);

// Call the operation without config
const result = await api.getPetById({ path: { petId: "123" } });

// TypeScript will narrow the type based on the status code
if (result.isValid && result.status === 200) {
  // You must check for status code since
  // different status codes may have different response shapes
  console.log("Pet name:", result.parsed.name);
}
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
  success: true;
  status: number; // HTTP status code
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
  success: false;
  kind: string; // Error type discriminator
  error: unknown; // Error details
  status?: number; // HTTP status (if available)
  data?: unknown; // Response data (if available)
  response?: Response; // Original Response (if available)
};
```

## Working with Responses

### Checking Success

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (result.isValid) {
  // TypeScript knows this is a compliant response
  // but you still have to check for status
  console.log("Status:", result.status);
  if (result.status === 200) {
    console.log("Data:", result.parsed);
  }
} else {
  // TypeScript knows this is an error response
  console.error("Error kind:", result.kind);
  console.error("Error details:", result.error);
}
```

### Handling Different Status Codes

```typescript
const result = await getPetById({ path: { petId: "123" } });

if (!result.isValid) {
  console.error("Operation failed:", result.kind, result.error);
} else if (result.status === 200) {
  console.log("Pet found:", result.parsed);
} else if (result.status === 404) {
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

if (result.isValid) {
  // Response content type may only be known at runtime
  if (result.contentType == "application/xml" && result.status == 200) {
    // Handle XML response
    const xmlData = result.data;
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

#### With Manual Response Parsing

```typescript
const response = await getPetById({ path: { petId: "123" } });

if (response.isValid) {
  // Assume forceValidation=false
  const parseResult = response.parse();
  if (parseResult.kind === "parse-error") {
    // Zod validation failed
    console.error("Validation failed:", z.prettifyError(parseResult.error));
  } else if (isParsed(parseResult)) {
    const pets = parseResult.parsed;
    // Validation succeeded
    console.log("Typed validated data:", pets[0].name);
  }
}
```

#### With Automatic Response Parsing

```typescript
const response = await getPetById({ path: { petId: "123" } });

if (response.isValid) {
  if (response.status == 200) {
    const pets = response.parsed;
    // Validation succeeded
    console.log("Typed validated data:", pets[0].name);
  }
} else {
  if (response.kind === "parse-error") {
    // Zod validation failed
    console.error("Validation failed:", z.prettifyError(parseResult.error));
  }
}
```

or, more concisely:

```typescript
const response = await getPetById({ path: { petId: "123" } });

if (!response.isValid) {
  // handle errors and early return
  console.error("Error:", response.error);
  return response.error;
}

// Switch on status codes
switch (response.status) {
  case 200:
    const pets = response.parsed;
    // Validation succeeded
    console.log("Typed validated data:", pets[0].name);
    break;
  case 404:
    console.warn("Pet not found");
    break;
}
```

## Best Practices

1. **Always check `result.isValid`** before accessing success-specific
   properties
1. **Handle different status codes** explicitly rather than assuming success
   means 200

## Next Steps

- Learn about
  [binding configuration to operations](define-configuration#binding-configuration-to-operations)
  for better ergonomics
- Understand response handling patterns in detail
- Explore error handling strategies
- See response payload validation documentation for runtime type safety
