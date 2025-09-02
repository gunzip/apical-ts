# Response Payload Validation

When you call a generated operation that has a response body defined within the OpenAPI specification for some status codes, the returned Promise resolves to a result object that provides either a `.parsed` field or a `.parse()` method, depending on the value of the `config.forceValidation` flag. You can set this flag in the configuration passed to an individual operation or globally using `configureOperations`.

- If you bind with `forceValidation: false` (or omit it), success responses always expose a `.parse()` method after you narrow on `success === true` and a specific `status`. You have to handle parsing errors manually in this case.
- If you bind with `forceValidation: true`, success responses expose a `.parsed` field (and no `.parse()` method) because validation is performed automatically during the request lifecycle. In case of parsing errors, the returned result will include a `ZodError` instance instead of the `parsed` field.

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
  // Manual validation bound client
  // default configuration forceValidation=false
  const lazyPetsResponse = await findPetsByStatus({
    query: { status: "available" },
  });
  if (lazyPetsResponse.isValid === true && lazyPetsResponse.status === 200) {
    lazyPetsResponse.parse();
  }

  // Manual validation bound client
  // using configureOperation with forceValidation=false
  const lazyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: false },
  );
  const petsResponse1 = await lazyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse1.isValid === true && petsResponse1.status === 200) {
    petsResponse1.parse();
  }

  // Automatic validation bound client
  // overridden per op configuration forceValidation=true
  const greedyPetResponse = await findPetsByStatus(
    {
      query: { status: "available" },
    },
    { ...globalConfig, forceValidation: true },
  );
  if (greedyPetResponse.isValid === true && greedyPetResponse.status === 200) {
    // automatic validation: .parsed available
    greedyPetResponse.parsed[0].name;
  }

  // Automatic validation bound client
  // with configureOperation and forceValidation=true
  const greedyClient = configureOperations(
    { findPetsByStatus, getInventory, getPetById },
    { ...globalConfig, forceValidation: true },
  );
  const petsResponse2 = await greedyClient.findPetsByStatus({
    query: { status: "available" },
  });
  if (petsResponse2.isValid === true && petsResponse2.status === 200) {
    // bound automatic validation: .parsed available
    petsResponse2.parsed;
  }
}

demonstrateClient();
```

## Manual Runtime Validation

Operations return raw data unless you enable automatic Zod parsing (setting `forceValidation` flag to `true`). To perform runtime validation, explicitly call the response object's `parse()` method, which returns a discriminated union:

- `{ contentType, parsed }` on success
- `{ kind: "parse-error", error: ZodError }` when validation fails
- `{ kind: "deserialization-error", error: unknown }` when a custom deserializer throws
- `{ kind: "missing-schema", error: string }` when no schema exists for the resolved content type

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

For operations with mixed content types, validation only applies when you call `parse()` and a schema exists for the selected content type:

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

Non-JSON responses (like `text/plain`, `application/octet-stream`) are still left raw unless you supply a custom deserializer in the config:

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

Enable automatic validation per request by setting `forceValidation: true` in the config you pass to an operation, or globally by binding a config with `configureOperations`:

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
  if (isParsed(result)) {
    console.log("User:", result.parsed.name);
  } else if (result.kind === "parse-error") {
    console.error("Validation failed", result.error);
  }
}
```

## Why is Runtime Validation Opt-In?

TypeScript client generator uses Zod for payload validation and parsing, but we've made this feature opt-in rather than mandatory. This design choice provides several key advantages:

- **Integration with Existing Systems**: This approach allows for seamless integration with other validation mechanisms already present in your codebase. If you have existing business logic that handles data validation, disabled runtime parsing at the client level avoids redundancy and streamlines your data flow.

- **Robustness in the Real World**: APIs responses can be unpredictable. You might encounter non-documented fields or slight deviations from the OpenAPI specification. Making validation optional prevents the client from crashing on unexpected—but often harmless—payloads, ensuring your application remains resilient.

- **Performance**: Parsing and validating a payload comes with a computational cost. By allowing you to opt-in, you can decide to skip validation for non-critical API calls, leading to better performance, especially in high-volume scenarios.

This approach gives you more control, allowing you to balance strict type-safety with the practical demands of working with real-world APIs.

## When to Enable Automatic Validation

Enable `forceValidation: true` when:

- **Trusted APIs**: When responses always match the OpenAPI specification
- **Performance is Not Critical**: When the validation overhead is acceptable for your use case

## When to Use Manual Validation

Use manual validation (omit or set `forceValidation: false`) when:

- **Huge Payloads**: When dealing with large responses where validation overhead is a concern
- **Untrusted APIs**: When APIs may return unexpected data that shouldn't crash your application
- **Gradual Migration**: When incrementally adding validation to existing codebases
- **Custom Validation Logic**: When you need more control over validation behavior and error handling or you have your own validation already in place

## Best Practices

1. **Start with manual validation** for new integrations to understand the API behavior
2. **Enable automatic validation** for trusted, well-documented APIs
3. **Use the `isParsed` helper** to check validation results safely
4. **Handle validation errors gracefully** - don't let them crash your application
5. **Log validation failures** for debugging and monitoring
6. **Consider performance implications** when choosing validation strategies
7. **Test both validation modes** to ensure your error handling works correctly