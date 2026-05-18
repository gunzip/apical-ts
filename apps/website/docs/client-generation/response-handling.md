# Response Handling

Each operation returns a discriminated union: either a compliant API response
(`isValid: true` with a `status` code as **string**, e.g. `'200'`, `'404'`,
`'422'`, or a range like `'4XX'`, `'5XX'`) or an error object (`isValid: false`,
`status: undefined`) with a `kind` discriminator.

Validation is opt-out by default (compliant responses expose a `parsed` field).
You can disable automatic validation at runtime by providing
`forceValidation: false` in the configuration you pass to an operation or via
`configureOperations`.

## Recommended Pattern

```ts
const result = await getPetById({ path: { petId: "123" } });

switch (result.status) {
  case "200":
    console.log("Pet (raw):", result.data);
    break;
  case "404":
    console.warn("Pet not found");
    break;
  case "4XX":
    console.warn("Client error (4XX):", result.data);
    break;
  case "5XX":
    console.error("Server error (5XX):", result.data);
    break;
  default:
    console.error("Unexpected response", result.status);
}
```

## Response Structure

### Successful Responses

When an operation succeeds, the response object includes:

- **`isValid: true`**: Indicates the operation was successful
- **`status`**: The HTTP status code returned by the server
- **`data`**: The raw response payload from the server
- **`parse()`**: Async method to validate and parse the response (when
  `forceValidation: false`)
- **`parsed`**: Pre-validated data with content type (when
  `forceValidation: true` - default)
  - Contains `{ data: T, contentType: string }` structure

### Error Responses

When an operation fails, the response object includes:

- **`isValid: false`**: Indicates the operation failed
- **`status: undefined`**: Lets you discriminate success vs error using only
  `status`
- **`kind`**: The type of error that occurred
- **`error`**: Detailed error information specific to the error type
- **`result.status`**: The real HTTP status code when an HTTP response exists

## Validation Modes

### Automatic Validation (default)

Automatic validation is enabled by default, meaning that successful responses
are validated against the OpenAPI schema and the `parsed` field is populated.

```ts
const result = await getPetById({ path: { petId: "123" } });

if (result.status === "200") {
  // Data is automatically validated and includes content type
  const { data, contentType } = result.parsed;
  console.log("Content type:", contentType);
  console.log("Pet:", data);
}
```

### Manual Validation

Deferred manual validation is achieved by setting `forceValidation: false` per
operation or globally using `configureOperations`. See
[Define Configuration](./define-configuration.md) section for more details.

When `forceValidation: false` is set, responses provide an async `parse()`
method that you can call when needed:

```ts
const result = await getPetById({ path: { petId: "123" } });

if (result.status === "200") {
  const outcome = await result.parse();
  if (isParsed(outcome)) {
    console.log("Pet:", outcome.parsed);
  } else if (outcome.kind === "parse-error") {
    console.error("Validation failed:", outcome.error.issues);
  }
}
```

## Status Code Handling

The discriminated union allows you to handle different response status codes
type-safely:

```ts
const result = await getPetById({ path: { petId: "123" } });

switch (result.status) {
  case "200":
    console.log("Pet found (raw):", result.data);
    break;
  case "404":
    console.log("Pet not found");
    break;
  case "400":
    console.log("Invalid request (raw):", result.data);
    break;
  case "4XX":
    console.log("Client error (4XX):", result.data);
    break;
  case "5XX":
    console.log("Server error (5XX):", result.data);
    break;
  default:
    console.log("Unexpected response:", result.status);
}
```

## Best Practices

1. **Use `status` as the primary discriminator** for documented responses
2. **Handle all expected status codes** explicitly
3. **Use automatic validation** for trusted APIs where performance isn't
   critical
4. **Use manual validation** for large payloads, untrusted APIs or when you have
   specific validation needs
5. **Log unexpected status codes** for debugging and monitoring
