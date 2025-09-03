# Error Handling

Client calls never throw exceptions. Instead, all errors are returned as part of
the response union, providing a consistent and type-safe error handling
experience. You can branch on either `result.isValid === false` or the presence
of the `kind` field; both are valid.

## Error Types

All operations return a union that includes `ApiResponseError`, which is a
discriminated union covering all possible error scenarios:

```ts
type ApiResponseError =
  | {
      readonly kind: "unexpected-error";
      readonly error: unknown;
    }
  | {
      readonly kind: "unexpected-response";
      readonly data: unknown;
      readonly status: number;
      readonly response: Response;
      readonly error: string;
    }
  | {
      readonly kind: "parse-error";
      readonly data: unknown;
      readonly status: number;
      readonly response: Response;
      readonly error: z.ZodError;
    }
  | {
      readonly kind: "deserialization-error";
      readonly data: unknown;
      readonly status: number;
      readonly response: Response;
      readonly error: unknown;
    }
  | {
      readonly kind: "missing-schema";
      readonly data: unknown;
      readonly status: number;
      readonly response: Response;
      readonly error: string;
    };
```

## Error Handling Patterns

```ts
const result = await getPetById({ path: { petId: "123" } });

if (!result.isValid) {
  // You don't have to handle all errors like this, but you can.
  switch (result.kind) {
    case "unexpected-response":
      console.error("Unexpected status:", result.status, result.error);
      break;
    case "deserialization-error":
      console.error("Deserialization failed:", result.error);
      break;
    case "parse-error":
      console.error("Validation failed:", result.error);
      break;
    case "missing-schema":
      console.error("Schema missing:", result.error);
      break;
    case "unexpected-error":
      console.error("Unexpected error:", result.error);
      break;
  }
} else if (result.status === 200) {
  // result.data is the raw response payload
  console.log("Pet:", result.data);
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  console.error("Unexpected documented status", result.status);
}
```

A more streamlined approach is to return early on errors, then handle successful
responses by switching on the status code.

## Error Context

Different error types provide different context:

### unexpected-error

- **When it occurs**: Network failures and connection issues.
- **Available data**: No `status`, `data`, or `response` fields
- **Use case**: Handle network connectivity issues, timeouts, or other
  infrastructure problems

```ts
if (result.kind === "unexpected-error") {
  console.error("Network or unexpected error:", result.error);
  // Show "Service unavailable" message to user
}
```

### unexpected-response

- **When it occurs**: HTTP status codes not defined in OpenAPI spec
- **Available data**: Includes `status`, `data`, `response`
- **Use case**: Handle undocumented API responses or API changes

```ts
if (result.kind === "unexpected-response") {
  console.error(`Undocumented status ${result.status}:`, result.error);
  console.log("Response data:", result.data);
  // Log for debugging or handle gracefully
}
```

### parse-error

- **When it occurs**: Zod validation failures when using `parse()` or automatic
  runtime validation
- **Available data**: Includes parsing details via `z.ZodError`
- **Use case**: Handle schema validation failures

```ts
if (result.kind === "parse-error") {
  console.error("Response validation failed:");
  console.error(z.prettifyError(result.error)); // Detailed validation errors
  // Show validation error to user or log for debugging
}
```

### deserialization-error

- **When it occurs**: Custom deserializer failures
- **Available data**: Includes original error from deserializer
- **Use case**: Handle custom content type parsing failures

```ts
if (result.kind === "deserialization-error") {
  console.error("Custom deserializer failed:", result.error);
  console.log("Raw data:", result.data);
  // Fall back to raw data handling
}
```

### missing-schema

- **When it occurs**: No schema available for content type
- **Available data**: Includes attempted deserialization details
- **Use case**: Handle content types without defined schemas

```ts
if (result.kind === "missing-schema") {
  console.warn("No schema for content type:", result.error);
  console.log("Raw data:", result.data);
  // Use raw data without validation
}
```

## Error Recovery Strategies

### Retry Logic

```ts
async function getPetWithRetry(petId: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await getPetById({ path: { petId: "123" } });

    if (result.isValid) {
      return result;
    }

    // Only retry on network errors
    if (result.kind === "unexpected-error") {
      if (attempt < maxRetries) {
        await delay(1000 * attempt); // Exponential backoff
        continue;
      }
    }

    // Don't retry other error types
    return result;
  }
}
```

## Best Practices

1. **Never ignore errors** - Always check `isValid` before proceeding
1. **Handle errors appropriately** - Different error types require different
   handling strategies
1. **Provide user feedback** - Show meaningful error messages to users
1. **Log for debugging** - Include relevant context in error logs
1. **Implement retry logic** - For transient network errors
1. **Monitor error patterns** - Track error types to identify API issues
