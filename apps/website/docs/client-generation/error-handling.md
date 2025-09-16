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
      readonly kind: "fetch-error";
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
const r = await getPetById({ path: { petId: "123" } });

if (!r.isValid) {
  // You don't have to handle all errors like this, but you can.
  switch (r.kind) {
    case "unexpected-response":
      console.error("Unexpected status:", r.status, r.error);
      break;
    case "deserialization-error":
      console.error("Deserialization failed:", r.error);
      break;
    case "parse-error":
      console.error("Validation failed:", r.error);
      break;
    case "missing-schema":
      console.error("Schema missing:", r.error);
      break;
    case "fetch-error":
      console.error("Network fetch failed:", r.error);
      break;
    case "unexpected-error":
      console.error("Unexpected error:", r.error);
      break;
  }
  return;
}

switch (r.status === 200) {
  case 200:
    // Raw response payload
    console.log("Pet (raw):", r.data);
    // The parsed response payload
    console.log("Pet:", r.parsed.data);
    break;
  case 404:
    console.warn("Pet not found");
    break;
  default:
    console.error("Unexpected documented status", r.status);
}
```

A more streamlined approach is to return early on errors, then handle successful
responses by switching on the status code.

## Error Context

Different error types provide different context:

### unexpected-error

- **When it occurs**: Unexpected failures and connection issues.
- **Available data**: No `status`, `data`, or `response` fields a
- **Use case**: Handle network connectivity issues, timeouts, or other
  infrastructure problems

```ts
if (result.kind === "unexpected-error") {
  console.error("Unexpected error:", result.error);
}
```

### fetch-error

- **When it occurs**: Errors during the HTTP fetch request (network timeouts,
  DNS failures, connection refused, etc.)
- **Available data**: No `status`, `data`, or `response` fields
- **Use case**: Handle recoverable network errors that may succeed on retry

```ts
if (result.kind === "fetch-error") {
  console.error("Fetch request failed:", result.error);
  // Implement retry logic for recoverable network errors
  // Show "Connection failed, retrying..." message to user
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
    if (result.kind === "fetch-error" || result.kind === "unexpected-error") {
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
1. **Retry fetch errors** - Network errors (`fetch-error`) are often recoverable
   with retry logic
1. **Provide user feedback** - Show meaningful error messages to users
1. **Log for debugging** - Include relevant context in error logs
1. **Implement retry logic** - For transient network errors
1. **Monitor error patterns** - Track error types to identify API issues
