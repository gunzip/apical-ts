# Call Operations

Once you have [defined your configuration](define-configuration), you can call
the generated operation functions to interact with your API. Each operation
function is type-safe and returns consistent response objects.

## Basic Operation Calls

### Simple GET Operation

```typescript
import { getPetById } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
  },
};

// Call the operation
const result = await getPetById({ petId: "123" }, apiConfig);

if (result.success) {
  console.log("Pet data:", result.data);
} else {
  console.error("Failed to get pet:", result.error);
}
```

### Operation with Request Body

```typescript
import { createPet } from "./generated/client/index.js";

const newPet = await createPet(
  {
    body: {
      name: "Fluffy",
      status: "available",
      category: {
        id: 1,
        name: "Dogs",
      },
      tags: [
        { id: 1, name: "friendly" },
        { id: 2, name: "house-trained" },
      ],
    },
  },
  apiConfig
);

if (newPet.success && newPet.status === 201) {
  console.log("Pet created:", newPet.data);
}
```

### Using Default Configuration

If you've set up a
[default configuration](define-configuration#default-configuration), you can
call operations without passing the config parameter:

```typescript
// Assuming defaultConfig has been set up
const result = await getPetById({ petId: "123" });
```

## Parameter Types

### Path Parameters

Path parameters are automatically typed based on your OpenAPI specification:

```typescript
// For a path like /pets/{petId}/photos/{photoId}
const result = await getPetPhoto({
  petId: "123",
  photoId: "456",
});
```

### Query Parameters

Query parameters are included in the same parameter object:

```typescript
// For an operation that accepts query parameters
const result = await searchPets({
  status: "available",
  category: "dogs",
  limit: 10,
  offset: 0,
});
```

### Header Parameters

Header parameters are also included in the parameter object:

```typescript
const result = await getPetById({
  petId: "123",
  "X-Request-ID": "req-123456", // Header parameter
});
```

### Request Body

Request bodies are passed via the `body` property:

```typescript
const result = await updatePet({
  petId: "123",
  body: {
    name: "Updated Name",
    status: "sold",
  },
});
```

## Response Objects

All operations return a consistent response structure that is either a success
or error object:

### Success Response

```typescript
type SuccessResponse = {
  success: true;
  status: number; // HTTP status code
  data: unknown; // Raw response data
  response: Response; // Original fetch Response object
  parse: () => ParseResult; // Parse method for validation
};
```

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
const result = await getPetById({ petId: "123" });

if (result.success) {
  // TypeScript knows this is a success response
  console.log("Status:", result.status);
  console.log("Data:", result.data);
} else {
  // TypeScript knows this is an error response
  console.error("Error kind:", result.kind);
  console.error("Error details:", result.error);
}
```

### Handling Different Status Codes

```typescript
const result = await getPetById({ petId: "123" });

if (!result.success) {
  console.error("Operation failed:", result.kind, result.error);
} else if (result.status === 200) {
  console.log("Pet found:", result.data);
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  console.error("Unexpected status:", result.status);
}
```

### Accessing Raw Response

```typescript
const result = await getPetById({ petId: "123" });

if (result.success) {
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
// Request with different content types
const xmlResult = await updatePet(
  {
    petId: "123",
    body: "<pet><name>Fluffy</name></pet>",
  },
  {
    ...apiConfig,
    headers: {
      ...apiConfig.headers,
      "Content-Type": "application/xml",
    },
  }
);

// Response with different content types
const result = await getPetById(
  { petId: "123" },
  {
    ...apiConfig,
    headers: {
      ...apiConfig.headers,
      Accept: "application/xml", // Request XML response
    },
  }
);
```

### Content Type Detection

The generated client automatically handles content type detection:

```typescript
const result = await getPetById({ petId: "123" });

if (result.success) {
  const contentType = result.response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    // Handle JSON response
    const jsonData = result.data;
  } else if (contentType?.includes("application/xml")) {
    // Handle XML response (if deserializer is configured)
    const xmlData = result.data;
  }
}
```

## Error Handling

### Network Errors

```typescript
const result = await getPetById({ petId: "123" });

if (!result.success && result.kind === "unexpected-error") {
  // Network failure, connection timeout, etc.
  console.error("Network error:", result.error);
}
```

### HTTP Errors

```typescript
const result = await getPetById({ petId: "123" });

if (!result.success && result.kind === "unexpected-response") {
  // HTTP status not defined in OpenAPI spec
  console.error(`HTTP ${result.status}: ${result.error}`);
  console.log("Response data:", result.data);
}
```

### Validation Errors

```typescript
const result = await getPetById({ petId: "123" });

if (result.success) {
  const parsed = result.parse();

  if (parsed.kind === "parse-error") {
    // Zod validation failed
    console.error("Validation failed:", parsed.error.errors);
  } else if (parsed.contentType && parsed.parsed) {
    // Validation succeeded
    console.log("Validated data:", parsed.parsed);
  }
}
```

## Async/Await vs Promise Chains

### Using async/await (Recommended)

```typescript
async function fetchPetData() {
  try {
    const result = await getPetById({ petId: "123" });

    if (result.success && result.status === 200) {
      return result.data;
    } else {
      throw new Error("Failed to fetch pet");
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
```

### Using Promise chains

```typescript
function fetchPetData() {
  return getPetById({ petId: "123" })
    .then((result) => {
      if (result.success && result.status === 200) {
        return result.data;
      } else {
        throw new Error("Failed to fetch pet");
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      return null;
    });
}
```

## Advanced Usage

### Conditional Requests

```typescript
// ETags for caching
const result = await getPetById({
  petId: "123",
  "If-None-Match": '"abc123"', // ETag from previous request
});

if (result.success && result.status === 304) {
  console.log("Pet data unchanged, use cached version");
}

// Last-Modified for caching
const result2 = await getPetById({
  petId: "123",
  "If-Modified-Since": "Wed, 21 Oct 2015 07:28:00 GMT",
});
```

### Request Cancellation

```typescript
const controller = new AbortController();

// Cancel request after 5 seconds
setTimeout(() => controller.abort(), 5000);

const customFetch = (url, options) => {
  return fetch(url, {
    ...options,
    signal: controller.signal,
  });
};

const result = await getPetById(
  { petId: "123" },
  {
    ...apiConfig,
    fetch: customFetch,
  }
);
```

## Best Practices

1. **Always check `result.success`** before accessing success-specific
   properties
2. **Handle different status codes** explicitly rather than assuming success
   means 200
3. **Use TypeScript's type narrowing** to get better intellisense and type
   safety
4. **Configure timeouts and retries** at the fetch level for better reliability
5. **Log errors appropriately** but don't expose sensitive information to users
6. **Consider caching strategies** for frequently accessed data
7. **Use proper error boundaries** in React applications
8. **Test both success and error scenarios** in your application

## Next Steps

- Learn about
  [binding configuration to operations](binding-configuration-to-operations) for
  better ergonomics
- Understand response handling patterns in detail
- Explore error handling strategies
- See response payload validation documentation for runtime type safety
