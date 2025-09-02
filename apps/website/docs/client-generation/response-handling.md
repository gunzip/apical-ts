# Response Handling

Each operation returns a discriminated union: either a successful API response (`success: true` with a `status` code) or an error object (`success: false`) with a `kind` discriminator.

Validation is opt-in by default (success responses expose a `parse()` method). You can enable automatic validation at runtime by providing `forceValidation: true` in the configuration you pass to an operation or via `configureOperations`.

## Recommended Pattern

```ts
const result = await getPetById({ petId: "123" });

if (result.isValid === false) {
  console.error("Operation failed:", result.kind, result.error);
} else if (result.status === 200) {
  console.log("Pet (raw):", result.data);
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  console.error("Unexpected documented status", result.status);
}
```

## Response Structure

### Successful Responses

When an operation succeeds, the response object includes:

- **`isValid: true`**: Indicates the operation was successful
- **`status`**: The HTTP status code returned by the server
- **`data`**: The raw response payload from the server
- **`parse()`**: Method to validate and parse the response (when `forceValidation: false`)
- **`parsed`**: Pre-validated data (when `forceValidation: true`)

### Error Responses

When an operation fails, the response object includes:

- **`isValid: false`**: Indicates the operation failed
- **`kind`**: The type of error that occurred
- **`error`**: Detailed error information specific to the error type

## Validation Modes

### Manual Validation (Default)

By default, responses provide a `parse()` method that you can call when needed:

```ts
const result = await getPetById({ petId: "123" });

if (result.isValid && result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("Pet:", outcome.parsed);
  } else {
    console.error("Validation failed:", outcome.error);
  }
}
```

### Automatic Validation

Enable automatic validation by setting `forceValidation: true`:

```ts
const result = await getPetById(
  { petId: "123" },
  { ...globalConfig, forceValidation: true }
);

if (result.isValid && result.status === 200) {
  // Data is automatically validated
  console.log("Pet:", result.parsed);
}
```

## Status Code Handling

The discriminated union allows you to handle different response status codes type-safely:

```ts
const result = await getPetById({ petId: "123" });

if (!result.isValid) {
  console.error("Operation failed:", result.error);
  return;
}

switch (result.status) {
  case 200:
    console.log("Pet found:", result.data);
    break;
  case 404:
    console.log("Pet not found");
    break;
  case 400:
    console.log("Invalid request:", result.data);
    break;
  default:
    console.log("Unexpected status:", result.status);
}
```

## Multiple Response Types

When an operation can return different data types for the same status code, the response is properly typed:

```ts
// Operation that returns either User or AdminUser for status 200
const result = await getUser({ userId: "123" });

if (result.isValid && result.status === 200) {
  // result.data is typed as User | AdminUser
  if (result.data.role === "admin") {
    // TypeScript knows this is AdminUser
    console.log("Admin permissions:", result.data.permissions);
  } else {
    // TypeScript knows this is User
    console.log("User name:", result.data.name);
  }
}
```

## Content Type Handling

For operations with multiple content types, the response includes content type information:

```ts
const result = await getDocument({
  docId: "123",
  contentType: { response: "application/json" }
});

if (result.isValid && result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("Content type:", outcome.contentType);
    console.log("Parsed data:", outcome.parsed);
  }
}
```

## Best Practices

1. **Always check `isValid`** before accessing response data
2. **Handle all expected status codes** explicitly
3. **Use automatic validation** for trusted APIs where performance isn't critical
4. **Use manual validation** for large payloads or untrusted APIs
5. **Log unexpected status codes** for debugging and monitoring