# Response Payload Validation

When you call a generated operation with a response body defined in the OpenAPI
specification, the returned Promise resolves to a result object. How you access
validated data depends on the `forceValidation` flag in the configuration (set
per operation or globally via `configureOperations`). By default,
`forceValidation` is `true`.

- **With `forceValidation: true` (default):**  
  Successful responses include a `.parsed` field containing both the validated
  data and the content type:  
  `{ data: T, contentType: string }`  
  Zod validation runs automatically during the request. If validation fails, the
  result contains an `error: ZodError` instead of `.parsed`. There is no
  `.parse()` method in this mode.

- **With `forceValidation: false`:**  
  Successful responses provide a `.parse()` method (instead of `.parsed`). After
  checking `isValid === true` and the desired `status`, you can call `.parse()`
  to manually validate the response. Handle any parsing errors yourself.

This design lets you choose between automatic validation (for convenience and
safety) or manual validation (for performance or custom error handling).

Don't worry if it seems confusing at first, type inference will help you.

## Examples

```ts
// ../examples/client-examples/force-validation.ts

import {
  configureOperations,
  globalConfig,
  isParsed,
} from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { getInventory } from "../generated/client/getInventory.js";
import { getPetById } from "../generated/client/getPetById.js";

async function demonstrateClient() {
  // Automatic validation bound client
  // default configuration forceValidation=true
  const greedyPetsResponse = await findPetsByStatus({
    query: { status: "available" },
  });
  if (
    greedyPetsResponse.isValid === true &&
    greedyPetsResponse.status === 200
  ) {
    // automatic validation: .parsed contains { data, contentType }
    const { data, contentType } = greedyPetsResponse.parsed;
    console.log("Content type:", contentType);
    console.log("First pet name:", data[0].name);
  }

  // Automatic validation bound client
  // using configureOperation with forceValidation=true
  const greedyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: true },
  );
  const petsResponse1 = await greedyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse1.isValid === true && petsResponse1.status === 200) {
    // bound automatic validation: .parsed contains { data, contentType }
    const { data, contentType } = petsResponse1.parsed;
    console.log("Response content type:", contentType);
    console.log("Pets data:", data);
  }

  // Manual validation bound client
  // overridden per op configuration forceValidation=false
  const lazyPetResponse = await findPetsByStatus(
    {
      query: { status: "available" },
    },
    { ...globalConfig, forceValidation: false },
  );
  if (lazyPetResponse.isValid === true && lazyPetResponse.status === 200) {
    lazyPetResponse.parse();
  }

  // Manual validation bound client
  // with configureOperation and forceValidation=false
  const lazyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: false },
  );
  const petsResponse2 = await lazyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse2.isValid === true && petsResponse2.status === 200) {
    petsResponse2.parse();
  }
}

demonstrateClient();
```

## Content Type Discrimination

When `forceValidation: true` is enabled, the response structure provides
enhanced type discrimination based on content type. The `.parsed` field contains
both the validated data and the content type, enabling type-safe content type
handling:

```ts
const result = await getDocument({
  docId: "123",
  contentType: { response: "application/json" },
});

if (result.isValid && result.status === 200) {
  const { data, contentType } = result.parsed;

  // Type-safe discrimination based on content type
  switch (contentType) {
    case "application/json":
      // TypeScript knows 'data' matches the JSON schema
      console.log("JSON document:", data.title);
      break;
    case "application/xml":
      // TypeScript knows 'data' matches the XML schema
      console.log("XML document:", data.title);
      break;
    case "text/plain":
      // TypeScript knows 'data' is a string
      console.log("Plain text:", data);
      break;
  }
}
```

This feature is particularly useful for APIs that return different data
structures based on the requested content type, providing full TypeScript
support for content type discrimination.

## Manual Runtime Validation

Operations return raw data unless you enable automatic Zod parsing (setting
`forceValidation` flag to `true`). To perform runtime validation, explicitly
call the response object's `parse()` method, which returns a discriminated
union:

- `{ contentType, parsed }` on success
- `{ kind: "parse-error", error: ZodError }` when validation fails
- `{ kind: "deserialization-error", error: unknown }` when a custom deserializer
  throws
- `{ kind: "missing-schema", error: string }` when no schema exists for the
  resolved content type

These objects never throw; you inspect the returned value to act accordingly.

```ts
const result = await getUserProfile({ userId: "123" });

if (result.isValid) {
  if (result.status === 200) {
    const outcome = result.parse();
    if ("parsed" in outcome) {
      console.log("User:", outcome.parsed.name, outcome.parsed.email);
    } else if (outcome.kind === "parse-error") {
      console.error("Response validation failed:", outcome.error);
    } else if (outcome.kind === "deserialization-error") {
      console.error("Deserializer failed:", outcome.error);
    } else if (outcome.kind === "missing-schema") {
      console.warn("No schema – raw data retained:", result.data);
    }
  } else if (result.status === 404) {
    console.warn("User not found");
  }
}
```

For operations with mixed content types, validation only applies when you call
`parse()` and a schema exists for the selected content type:

```ts
const result = await getDocument({
  docId: "123",
  contentType: { response: "application/json" },
});

if (result.status === 200) {
  const outcome = result.parse();
  if (isParsed(outcome)) {
    console.log("Document:", outcome.parsed);
  }
}
```

Non-JSON responses (like `text/plain`, `application/octet-stream`) are still
left raw unless you supply a custom deserializer in the config:

```ts
const result = await downloadFile(
  {
    fileId: "123",
  },
  {
    // You can provide custom deserializers for specific operations
    // or even in the global configuration
    deserializers: {
      ...globalConfig,
      "application/octet-stream": (blob: Blob) => ({ size: blob.size }),
    },
  },
);

if (result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("Downloaded file size:", outcome.parsed.size);
  }
}
```

## Automatic Runtime Validation

Enable automatic validation per request by setting `forceValidation: true` in
the config you pass to an operation, or globally by
[binding a config](define-configuration#binding-configuration-to-operations)
with `configureOperations`:

```ts
import {
  configureOperations,
  globalConfig,
  getUserProfile,
} from "./generated/client/index.js";

// Bind config with automatic validation
const client = configureOperations(
  { getUserProfile },
  { ...globalConfig, forceValidation: true },
);

const result = await client.getUserProfile({ userId: "123" });
if (result.isValid && result.status === 200) {
  // With forceValidation=true, parsed contains { data, contentType }
  const { data, contentType } = result.parsed;
  console.log("Content type:", contentType);
  console.log("User:", data.name);
} else if (result.kind === "parse-error") {
  console.error("Validation failed", z.prettifyError(result.error));
}
```

## Runtime Validation: Enabled or Disabled?

TypeScript client generator uses Zod for payload validation and parsing. By
default payload parsing is enabled during the request lifecycle.

This design choice provides some advantages:

- **Type Safety First**: With validation enabled by default, you get immediate
  feedback when API responses don't match the OpenAPI specification, helping
  catch integration issues early.

- **Development Experience**: Automatic validation means you can immediately
  access validated data through the `.parsed` field without additional steps,
  improving developer productivity.

- **API Contract Enforcement**: By validating responses by default, the client
  helps ensure that APIs adhere to their documented contracts, promoting better
  API design and reliability.

However, you can still opt out of validation (globally or per-operation) for
performance or compatibility reasons.

### When to Keep Automatic Validation

Keep `forceValidation: true` (default) when:

- **Untrusted APIs**: When responses should always match the OpenAPI
  specification
- **Development and Testing**: When you want strict validation to catch contract
  violations
- **Type Safety Priority**: When you prefer compile-time guarantees about data
  structure

### When to Switch to Manual Validation

Switch to optional validation (set `forceValidation: false`) when:

- **Huge Payloads**: When dealing with large responses where validation overhead
  is a concern
- **Untrusted APIs**: When APIs may return unexpected data that shouldn't crash
  your application
- **Gradual Migration**: When incrementally adding validation to existing
  codebases
- **Custom Validation Logic**: When you need more control over validation
  behavior and error handling or you have your own validation already in place

## Best Practices

1. **Start with automatic validation** (default) for new integrations to ensure
   API compliance
2. **Disable validation selectively** for performance-critical or untrusted APIs
3. **Handle validation errors gracefully** - don't let them crash your
   application
4. **Log validation failures** for debugging and monitoring
5. **Consider performance implications** when choosing validation strategies
6. **Test both validation modes** to ensure your error handling works correctly
