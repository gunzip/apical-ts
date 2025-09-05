# Response Payload Validation

When you call a generated operation that has a response body defined within the
OpenAPI specification for some status codes, the returned Promise resolves to a
result object that provides either a `.parsed` field or a `.parse()` method,
depending on the value of the `config.forceValidation` flag. You can set this
flag in the configuration passed to an individual operation or globally using
`configureOperations`. By default, `forceValidation` is set to `true`.

- If you bind with `forceValidation: true` (or omit it), success responses
  always expose a `.parsed` field (and no `.parse()` method) as Zod validation
  is performed automatically during the request lifecycle. In case of parsing
  errors, the returned result will include a `error: ZodError` instance instead
  of the `parsed` field.
- If you bind with `forceValidation: false`, success responses expose a
  `.parse()` method after you narrow on `success === true` and a specific
  `status`. You may call it and handle parsing errors manually.

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
    // automatic validation: .parsed available
    greedyPetsResponse.parsed[0].name;
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
    // bound automatic validation: .parsed available
    petsResponse1.parsed;
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
  console.log("User:", result.parsed.name);
} else if (result.kind === "parse-error") {
  console.error("Validation failed", z.prettifyError(result.error));
}
```

## Runtime Validation: Enabled or Disabled?

TypeScript client generator uses Zod for payload validation and parsing. By
default we've made payload parsing enabled by default.

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
