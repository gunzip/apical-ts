# Response Handling

Each operation returns a discriminated union: either a successful API response
(`success: true` with a `status` code) or an error object (`success: false`)
with a `kind` discriminator.

Validation is opt-out by default (success responses expose a `parsed` field).
You can disable automatic validation at runtime by providing
`forceValidation: false` in the configuration you pass to an operation or via
`configureOperations`.

## Recommended Pattern

```ts
const result = await getPetById({ path: { petId: "123" } });

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
- **`parse()`**: Method to validate and parse the response (when
  `forceValidation: false`)
- **`parsed`**: Pre-validated data with content type (when
  `forceValidation: true` - default)
  - Contains `{ data: T, contentType: string }` structure

### Error Responses

When an operation fails, the response object includes:

- **`isValid: false`**: Indicates the operation failed
- **`kind`**: The type of error that occurred
- **`error`**: Detailed error information specific to the error type

## Validation Modes

### Automatic Validation (default)

When using `forceValidation: true`, the response is automatically validated and

Enable automatic validation by setting `forceValidation: true` per operation or
globally using `configureOperations`, see
[Define Configuration](./define-configuration.md) section for more details.

```ts
const result = await getPetById({ path: { petId: "123" } });

if (result.isValid && result.status === 200) {
  // Data is automatically validated and includes content type
  const { data, contentType } = result.parsed;
  console.log("Content type:", contentType);
  console.log("Pet:", data);
}
```

### Manual Validation

When `forceValidation: false` is set, responses provide a `parse()` method that
you can call when needed:

```ts
const result = await getPetById({ path: { petId: "123" } });

if (result.isValid && result.status === 200) {
  const outcome = result.parse();
  if (isParsed(outcome)) {
    console.log("Pet:", outcome.parsed);
  } else {
    console.error("Validation failed:", z.prettifyError(outcome.error));
  }
}
```

## Status Code Handling

The discriminated union allows you to handle different response status codes
type-safely:

```ts
const result = await getPetById({ path: { petId: "123" } });

if (!result.isValid) {
  console.error("Operation failed:", result.error);
  return;
}

// result.data is untyped raw data here

switch (result.status) {
  case 200:
    console.log("Pet found (raw):", result.data);
    break;
  case 404:
    console.log("Pet not found");
    break;
  case 400:
    console.log("Invalid request (raw):", result.data);
    break;
  default:
    console.log("Unexpected status:", result.status);
}
```

## Best Practices

1. **Always check `isValid`** before accessing response data
2. **Handle all expected status codes** explicitly
3. **Use automatic validation** for trusted APIs where performance isn't
   critical
4. **Use manual validation** for large payloads, untrusted APIs or when you have
   specific validation needs
5. **Log unexpected status codes** for debugging and monitoring
