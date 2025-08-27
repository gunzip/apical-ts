# OpenAPI TypeScript Generator

> **Disclaimer:** This project is **experimental** and currently in an early stage. Breaking changes may occur at any time. The first stable release will be version **0.1.0**.

✨ Effortlessly turn your OpenAPI specifications into fully-typed Zod v4 schemas—ready for runtime (client or server) validation and TypeScript development.

Need a client? Instantly generate a type-safe, low-footprint, operation-based REST API client alongside your schemas.

Need to validate server requests and return typed responses? We've got you covered with built-in support for request and response validation using Zod schemas.

Why choose this generator against alternatives? See [comparison](#comparison-with-alternative-libraries) for more details.

See [supported features](#supported-features) for more information.

![Demo of OpenAPI TypeScript Generator](./demo.gif)

- [OpenAPI TypeScript Generator](#openapi-typescript-generator)
  - [Installation](#installation)
    - [From GitHub Packages](#from-github-packages)
    - [For Development](#for-development)
  - [CLI Usage](#cli-usage)
    - [CLI Options](#cli-options)
  - [Supported Input Formats](#supported-input-formats)
  - [Programmatic Usage](#programmatic-usage)
  - [Generated Architecture](#generated-architecture)
- [Client Generation](#client-generation)
  - [Using the Generated Operations](#using-the-generated-operations)
    - [Define Configuration](#define-configuration)
    - [Call Operations](#call-operations)
  - [Binding Configuration to All Operations](#binding-configuration-to-all-operations)
  - [Response Handling](#response-handling)
  - [Exception Handling](#exception-handling)
  - [Validation \& Error Handling (Opt-In)](#validation--error-handling-opt-in)
  - [Why is Runtime Parsing Opt-In?](#why-is-runtime-parsing-opt-in)
  - [Custom Response Deserialization](#custom-response-deserialization)
    - [Why use `parse()`?](#why-use-parse)
    - [Basic Usage](#basic-usage)
    - [Deserializer Map](#deserializer-map)
    - [Returned Object Shapes](#returned-object-shapes)
    - [Common Patterns](#common-patterns)
    - [Error Handling Summary](#error-handling-summary)
    - [Best Practices](#best-practices)
  - [Handling Multiple Content Types (Request \& Response)](#handling-multiple-content-types-request--response)
    - [Example: Endpoint with Multiple Request Content Types](#example-endpoint-with-multiple-request-content-types)
    - [Example: Endpoint with Multiple Response Content Types](#example-endpoint-with-multiple-response-content-types)
  - [Using Generated Zod Schemas](#using-generated-zod-schemas)
- [Server Generation](#server-generation)
  - [How to Generate a Server](#how-to-generate-a-server)
  - [Using the Wrapper Handler](#using-the-wrapper-handler)
    - [Handler Function Signature](#handler-function-signature)
    - [Supported Features](#supported-features)
  - [Benefits of Operation-Based Architecture](#benefits-of-operation-based-architecture)
  - [Known Limitations](#known-limitations)
    - [Missing Response Headers Validation](#missing-response-headers-validation)
    - [String Constraints on Query and Path Parameters](#string-constraints-on-query-and-path-parameters)
  - [Comparison with alternative libraries](#comparison-with-alternative-libraries)

## Installation

### From GitHub Packages

This package is published to GitHub Packages. To install it, you need to configure npm to use GitHub Packages for the `@gunzip` scope.

Create or update your `.npmrc` file in your project root:

````
@gunzip:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Where GITHUB_TOKEN is a GitHub personal access token
taken from the environment variables.

Then install the package:

```bash
# Using pnpm
pnpm add @gunzip/typescript-openapi-generator

# Using npm
npm install @gunzip/typescript-openapi-generator

# Using yarn
yarn add @gunzip/typescript-openapi-generator
````

**Note**: You'll need a GitHub personal access token with `read:packages` permission. You can create one at [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens).

### For Development

```bash
pnpm install
```

## CLI Usage

```
pnpm start -- generate \
  --input ./swagger-2.0.yaml \
  --output ./generated \
  --generate-client
```

### CLI Options

- `-i, --input <path>`: Path to the OpenAPI spec file (2.0, 3.0.x, or 3.1.x) in YAML or JSON format
- `-o, --output <path>`: Output directory for generated code
- `--generate-client`: Generate the operation functions (default: false)

## Supported Input Formats

The generator automatically detects and converts:

- **OpenAPI 2.0** (Swagger) → 3.0 → 3.1
- **OpenAPI 3.0.x** → 3.1
- **OpenAPI 3.1.x** (no conversion needed)

All input formats (local or remote yaml or JSON) are automatically normalized to OpenAPI 3.1.0 before generation.

## Programmatic Usage

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

## Generated Architecture

The generator creates:

- **`server/`** - Typed handler wrappers
- **`client/`** - Individual operation functions for each API endpoint
- **`schemas/`** - Zod schemas and TypeScript types

# Client Generation

## Using the Generated Operations

### Define Configuration

```ts
import { getPetById, createPet } from "./generated/client/index.js";

// You can define your API configuration (all fields required)
// or just use the default configuration to avoid passing it
// as parameter to every operation
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch, // or globalThis.fetch in browsers
  headers: {
    Authorization: "Bearer your-token",
  },
};
```

### Call Operations

```ts
// Simple operation call
const pet = await getPetById({ petId: "123" }, apiConfig);

// Operation with request body
const newPet = await createPet(
  {
    body: {
      name: "Fluffy",
      status: "available",
    },
  },
  apiConfig,
);

// Use default empty config (operations work without configuration)
const result = await getPetById({ petId: "123" });
```

## Binding Configuration to All Operations

You can use the `configureOperations` helper to bind a configuration object to all generated operations, so you don't have to pass the config each time:

```ts
import * as operations from "./generated/client/index.js";
import { configureOperations } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
  },
};

const client = configureOperations(operations, apiConfig);

// Now you can call operations without passing config:
const pet = await client.getPetById({ petId: "123" });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});
```

## Response Handling

Each operation returns a discriminated union of possible responses containing the raw (unvalidated) response body in `data`. Validation is opt-in. Example:

```ts
const result = await getPetById({ petId: "123" });

if (result.status === 200) {
  // result.data is the RAW response body (unvalidated)
  console.log("Pet (raw):", result.data);
} else if (result.status === 404) {
  // Not found
  console.warn("Pet not found");
} else {
  // Exhaustive check
  console.error("Unexpected status", result.status);
}

// Or use the helper:
import { isSuccessResponse } from "./generated/client/index.js";
if (isSuccessResponse(result)) {
  // result.data is raw; to validate invoke result.parse()
  // result.parse() is only valued when a schema is defined for the response content type
  const validated = result.parse();
  if (validated.parsed) {
    console.log("Validated Pet:", validated.parsed);
  }
}
```

## Exception Handling

All responses not present in the OpenAPI specs throw an `UnexpectedResponseError` error:

```ts
try {
  const result = await getPetById({ petId: "notfound" });
  // handle result as above
} catch (err) {
  if (err instanceof UnexpectedResponseError) {
    console.error("Unexpected response", err.status, err.data);
  } else {
    throw err; // rethrow unknown errors
  }
}
```

## Validation & Error Handling (Opt-In)

Operations return raw data by default (no automatic Zod parsing). To perform runtime validation you must explicitly call the response object's `parse(deserializerMap?)` method. Validation errors are reported in the returned object (they do NOT throw) via an `error` property.

```ts
const result = await getUserProfile({ userId: "123" });

if (result.status === 200) {
  const outcome = result.parse();
  if (outcome && "parsed" in outcome) {
    console.log("User:", outcome.parsed.name, outcome.parsed.email);
  } else if (outcome && "error" in outcome) {
    console.error("Response validation failed:", outcome.error);
  } else {
    console.log("User (raw, unvalidated):", result.data);
  }
} else if (result.status === 404) {
  console.warn("User not found");
}
```

For operations with mixed content types, validation only applies when you call `parse()` and a schema exists for the selected content type:

```ts
const result = await getDocument(
  {
    docId: "123",
    contentType: { response: "application/json" },
  },
  apiConfig,
);

if (result.status === 200) {
  const outcome = result.parse();
  if (outcome && "parsed" in outcome) {
    console.log("Document:", outcome.parsed);
  }
}
```

Non-JSON responses (like `text/plain`, `application/octet-stream`) are still left raw unless you supply a custom deserializer in `parse()`:

```ts
const result = await downloadFile({ fileId: "123" });
if (result.status === 200) {
  const outcome = result.parse({
    "application/octet-stream": (blob: Blob) => ({ size: blob.size }),
  });
  if (outcome && "parsed" in outcome) {
    console.log("Downloaded file size:", outcome.parsed.size);
  }
}
```

## Why is Runtime Parsing Opt-In?

TypeScript client generator uses Zod for payload validation and parsing, but we’ve made this feature opt-in rather than mandatory. This design choice provides several key advantages:

- **Integration with Existing Systems**: This approach allows for seamless integration with other validation mechanisms already present in your codebase. If you have existing business logic that handles data validation, disabled runtime parsing at the client level avoids redundancy and streamlines your data flow.

- **Robustness in the Real World**: APIs responses can be unpredictable. You might encounter non-documented fields or slight deviations from the OpenAPI specification. Making validation optional prevents the client from crashing on unexpected—but often harmless—payloads, ensuring your application remains resilient.

- **Performance**: Parsing and validating a payload comes with a computational cost. By allowing you to opt-in, you can decide to skip validation for non-critical API calls, leading to better performance, especially in high-volume scenarios.

This approach gives you more control, allowing you to balance strict type-safety with the practical demands of working with real-world APIs.

## Custom Response Deserialization

For advanced scenarios (e.g. XML parsing, vendor-specific media types, binary post-processing) each successful response object provides a `parse(deserializerMap?)` method. This lets you plug custom per–content-type deserializers before schema validation occurs.

### Why use `parse()`?

- Apply transformations (e.g. date reviver, case normalization) prior to Zod validation
- Decode non‑JSON types (XML → JS object, CSV → array, binary → metadata)
- Gracefully handle vendor or unknown content types without modifying generated code

### Basic Usage

```ts
const res = await testMultiContentTypes({
  body: { id: "123", name: "Example" },
  contentType: { response: "application/xml" },
});

if (res.status === 200) {
  const outcome = res.parse({
    "application/xml": (raw: unknown) => customXmlToJson(raw as string),
    "application/octet-stream": (blob: unknown) => ({
      size: (blob as Blob).size,
    }),
  });

  if ("parsed" in outcome) {
    // Zod-validated & transformed data
    console.log(outcome.parsed);
  } else if ("error" in outcome) {
    console.error("Validation failed", outcome.error);
  } else if ("deserializationError" in outcome) {
    console.error("Deserializer threw", outcome.deserializationError);
  } else if (outcome.missingSchema) {
    console.warn(
      "No schema for content type; raw transformed value:",
      outcome.deserialized,
    );
  }
}
```

### Deserializer Map

`parse(deserializerMap?)` accepts an object whose keys are lower‑cased content types (e.g. `"application/xml"`, `"application/vnd.acme+json"`, `"application/octet-stream"`). Each value is a function:

```ts
type Deserializer = (data: unknown, contentType?: string) => unknown;
```

If a matching key is present, the raw body (already converted to `json()`, `text()`, `blob()`, `formData()`, or `arrayBuffer()` depending on content type heuristics) is passed to your function. Whatever you return becomes the input to schema validation (if a schema for that content type exists).

### Returned Object Shapes

The result of `parse()` is a discriminated object you can pattern match on:

| Scenario                              | Shape                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Schema + validation success           | `{ contentType, parsed }`                                                   |
| Schema + validation failure           | `{ contentType, error }`                                                    |
| Schema present but deserializer threw | `{ contentType, deserializationError }`                                     |
| No schema for content type            | `{ contentType, missingSchema: true, deserialized, deserializationError? }` |

Notes:

- If the deserializer throws, validation is skipped (you get `deserializationError`).
- If no schema exists, the transformed value is returned under `deserialized` and flagged with `missingSchema: true`.
- Content type normalization strips any charset parameters (e.g. `application/json; charset=utf-8` → `application/json`).

### Common Patterns

1. XML → JS:

```ts
const outcome = res.parse({
  "application/xml": (xml: unknown) => fastXmlParser.parse(xml as string),
});
```

2. Binary metadata:

```ts
const outcome = res.parse({
  "application/octet-stream": (b: unknown) => ({ size: (b as Blob).size }),
});
```

3. Vendor JSON normalization:

```ts
const outcome = res.parse({
  "application/vnd.custom+json": (data: any) => ({
    ...data,
    id: String(data.id).toUpperCase(),
  }),
});
```

### Error Handling Summary

| Field                  | Meaning                                             |
| ---------------------- | --------------------------------------------------- |
| `parsed`               | Successfully deserialized and schema-validated data |
| `error`                | Zod validation error object (`ZodError`)            |
| `deserializationError` | Exception thrown by your custom deserializer        |
| `missingSchema`        | No schema was generated for this content type       |
| `deserialized`         | Transformed value when no schema exists             |

### Best Practices

- Keep deserializers pure & fast—avoid performing network calls
- Return plain JS objects ready for validation; do not mutate globals
- Prefer adding schemas in the spec when possible (better type safety)
- Log or surface `deserializationError` for observability

## Handling Multiple Content Types (Request & Response)

This generator fully supports OpenAPI endpoints that define multiple content types for both requests and responses. For each operation, the generated client:

- Accepts a `contentType` property in the request object, which is an object with optional `request` and `response` keys, to specify which content type to use for the request and which to prefer for the response.
- Returns a response typed according to the selected response content type.
- Validates and parses the response according to the content type actually returned by the server.

### Example: Endpoint with Multiple Request Content Types

Suppose your OpenAPI spec defines an operation that accepts both `application/json` and `application/x-www-form-urlencoded` for the request body:

```yaml
requestBody:
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Pet"
    application/x-www-form-urlencoded:
      schema:
        $ref: "#/components/schemas/PetForm"
```

The generated operation function will accept a `contentType` object to select the body and/or response format:

```ts
import { createPet } from "./generated/client/index.js";

// Send as JSON (default)
await createPet({
  body: { name: "Fluffy", status: "available" },
});

// Send as form-urlencoded
await createPet({
  body: { name: "Fluffy", status: "available" },
  contentType: { request: "application/x-www-form-urlencoded" },
});

// Send as form-urlencoded and request a custom response type
await createPet({
  body: { name: "Fluffy", status: "available" },
  contentType: {
    request: "application/x-www-form-urlencoded",
    response: "application/vnd.custom+json",
  },
});
```

### Example: Endpoint with Multiple Response Content Types

Suppose an operation returns either JSON or XML:

```yaml
responses:
  "200":
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/Pet"
      application/xml:
        schema:
          $ref: "#/components/schemas/PetXml"
```

The generated response type will match the selected or default response content type:

```ts
const result = await getPetById({
  petId: "123",
  contentType: { response: "application/xml" },
});

if (result.status === 200) {
  // result.data is typed as PetXml if response: "application/xml" was selected
  // or as Pet if response: "application/json" was selected
}
```

You can also use the provided helpers to handle all cases:

```ts
import { handleResponse } from "./generated/client/index.js";

handleResponse(result, {
  200: {
    "application/json": (data) => console.log("Pet:", data),
    "application/xml": (data) => {
      /* handle XML */
    },
  },
  default: (res) => console.error("Other status", res.status),
});
```

## Using Generated Zod Schemas

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

# Server Generation

The generator can also produce a fully-typed server handler wrapper for your OpenAPI operations. This enables you to build type-safe HTTP servers (e.g., with Express, Fastify, or custom frameworks) that validate requests at runtime using Zod schemas and can return only responses of the expected types.

## How to Generate a Server

To generate server-side code, use the CLI with the `--generate-server` flag:

```bash
pnpm start generate \
  --input ./swagger-2.0.yaml \
  --output ./generated \
  --generate-server
```

This will create a `server/` directory in your output folder, containing:

- **`server/index.ts`**: Exports the server handler wrappers and types
- **`server/<operationId>.ts`**: Individual operation handler wrappers

## Using the Wrapper Handler

The generated route wrapper is a function that takes a request handler and returns an async function that can be used with any web framework. This allows you to ensure type safety and runtime validation for your request parameters (path, query, headers) and response data.

You are responsible for extracting parameters from the framework request and passing them to the wrapper, then handling the result (status, contentType, data) in your route handler. This allows you to integrate with any web framework and customize error handling as needed.

Example usage with Express and a helper for parameter extraction:

```ts
import express from "express";
import {
  testAuthBearerWrapper,
  testAuthBearerHandler,
} from "./generated/server/testAuthBearer.js";
import { extractRequestParams } from "./test-helpers.js";

const app = express();
app.use(express.json());

const wrappedHandler = testAuthBearerWrapper(async (params) => {
  if (params.type === "ok") {
    // Here you can access validated and typed parameters
    const { query, path, headers, body } = params.value;
    // ...
    doSomethingWithParams(query.someParam);
    // Here you can return a typed response
    return {
      status: 200,
      contentType: "application/json",
      data: { message: "Success" },
    };
  }
  // Handle validation errors or other cases
  return {
    status: 400,
    contentType: "application/json",
    data: { error: "Validation failed" },
  };
});

app.get("/test-auth-bearer", async (req, res) => {
  const result = await wrappedHandler(extractRequestParams(req));
  // Now result contains the status, contentType, and data
  res.status(result.status).type(result.contentType).send(result.data);
});

app.listen(3000);
```

- The wrapper receives a single params object (containing query, path, headers, body, etc.)
- You can use a helper like `extractRequestParams` to transform Express request data into the expected format
- The handler receives validated and typed parameters, or error details if validation fails
- You control the HTTP response based on the wrapper's result

### Handler Function Signature

The handler you provide to the wrapper receives a single argument:

- For valid requests: `{ type: "ok", value: { query, path, headers, body, ... } }`
- For validation errors: `{ type: "query_error" | "body_error" | ... , error: ZodError }`

It must return an object with `{ status, contentType, data }`.

### Supported Features

- Request validation (body, query, params) using generated Zod schemas
- Response validation before sending (if you use the generated types)
- Automatic error details for validation failures
- Type-safe handler context

You can use the generated types and schemas for further custom validation or integration with other frameworks.

- 🚀 **Multi-version support**: Accepts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x specifications
- 🛠️ **Operation-based client generation**: Generates one function per operation, with strong typing and per-operation configuration—no need for blacklisting operations you don't need!
- 🛡️ **Zod v4 runtime validation (opt-in)**: Invoke `response.parse()` to validate payloads without throwing on validation errors
- 📦 **Small footprint**: Generates each operation and schema/type in its own file for maximum tree-shaking and modularity
- 🚀 **Fast code generation**: Optimized for quick generation times, even with large specs, sync types and changes in real-time
- 🔒 **Type-safe configuration**: Immutable global defaults, with the ability to override config per operation
- 🔑 **Flexible authentication**: Supports OpenAPI security schemes (Bearer, API Key, etc.), with dynamic header/query configuration
- 🧩 **Discriminated union response types**: Each operation returns a discriminated union of possible responses, enabling exhaustive handling
- ⚠️ **Comprehensive error handling**: Only unexpected responses throw a typed exception (`UnexpectedResponseError`) forwarding status, body, and headers
- 📁 **File upload/download & binary support**: Handles `multipart/form-data` and `application/octet-stream` uploads and downloads
- 📦 **ESM output**: Generated code is ESM-first
- 🪶 **Minimal dependencies**: No runtime dependencies except Zod; works in Node.js and browsers
- 🧪 **Self-contained Zod schemas**: Generated schemas can be used independently for validation (e.g., in forms) and server-side logic
- 🔄 **Automatic OpenAPI normalization**: All input specs are normalized to OpenAPI 3.1.0 before code generation
- ✅ **Comprehensive test suite**: Project includes Vitest-based tests for all major features

## Benefits of Operation-Based Architecture

- **Tree Shaking**: Only bundle the operations you actually use
- **Type Safety**: Better parameter organization with an immutable config object
- **Flexibility**: Easy per-operation configuration with all required fields
- **Maintainability**: Each operation in its own file
- **Testing**: Simple to mock individual operations

## Known Limitations

### Missing Response Headers Validation

- Header defined within responses schemas are currently not verified; a parsed headers object could be added to `ApiResponse` in the future. You can get headers accessing the raw `response` object anyway.

### String Constraints on Query and Path Parameters

- String constraints (e.g., minLength, maxLength, pattern) on query and path parameters are not validated. Should we generate their schemas with Zod as well?

## Comparison with alternative libraries

After [evaluating several libraries](https://github.com/gunzip/openapi-generator-benchmark), we found that each has its [strengths and weaknesses](https://pagopa.github.io/dx/blog/typescript-openapi-generators-0.1-alpha), but ultimately, we chose to build this project to address specific needs and use cases.

Here is a comparison of the key features and limitations of each library.

| Feature / Limitation                          | typescript-openapi-generator (this project) |                      openapi-codegen-ts                       |   openapi-zod-client   |
| --------------------------------------------- | :-----------------------------------------: | :-----------------------------------------------------------: | :--------------------: |
| **Output structure**                          |        Modular (per operation/type)         | Monolithic (single file for all operations and request types) |  Single file + zodios  |
| **Dependency footprint**                      |             Minimal (Zod only)              |               io-ts, @pagopa/ts-commons, fp-ts                |    zodios + others     |
| **Runtime validation**                        |                   Zod v4                    |                             io-ts                             |         Zod v3         |
| **OpenAPI version support**                   |     2.0, 3.0.x, 3.1.x (auto-normalized)     |                          2.0, 3.0.x                           |      3.0.x, 3.1.x      |
| **Error handling**                            |              Typed, exhaustive              |                       Typed, exhaustive                       |         Basic          |
| **Type complexity**                           |                   Simple                    |                 Complex and hard to maintain                  |         Simple         |
| **Generation Speed**                          |                   Faster                    |                      Slower on big specs                      |          Fast          |
| **Subtype constraints**                       |                     ✅                      |                              ✅                               | ⚠️ (Only at top-level) |
| **Multiple success responses**                |                     ✅                      |                              ✅                               |           ❌           |
| **Multiple content types (request/response)** |                     ✅                      |                              ❌                               |           ❌           |
| **Security header support**                   |                     ✅                      |                              ✅                               |           ❌           |
| **File download response**                    |                     ✅                      |                              ✅                               |           ❌           |
| **Tree-shaking friendly**                     |                     ✅                      |                              ❌                               |           ❌           |
| **Per-operation overrides**                   |                     ✅                      |                              ✅                               |           ❌           |
| **File upload support**                       |                     ✅                      |                              ✅                               |           ✅           |
| **Server-side usage**                         |                     ✅                      |                              ✅                               |           ✅           |
