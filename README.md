# OpenAPI TypeScript Generator

✨ Effortlessly turn your OpenAPI specifications into fully-typed Zod v4 schemas—ready for runtime (client or server) validation and TypeScript development.

🤖 Need a client? Instantly generate a type-safe, operation-based REST API client alongside your schemas.

Why choose this generator against alternatives? See [comparison](#comparison-with-alternative-libraries) for more details.

See [supported features](#features) for more information.

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
  - [Using the Generated Operations](#using-the-generated-operations)
    - [Define Configuration](#define-configuration)
    - [Call Operations](#call-operations)
  - [Binding Configuration to All Operations](#binding-configuration-to-all-operations)
  - [Response Handling](#response-handling)
  - [Exception Handling](#exception-handling)
  - [Handling Multiple Content Types (Request \& Response)](#handling-multiple-content-types-request--response)
    - [Example: Endpoint with Multiple Request Content Types](#example-endpoint-with-multiple-request-content-types)
    - [Example: Endpoint with Multiple Response Content Types](#example-endpoint-with-multiple-response-content-types)
  - [Using Generated Zod Schemas](#using-generated-zod-schemas)
  - [Features](#features)
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

- **`operations/index.ts`** - Configuration types, immutable global config, and operation exports
- **`operations/`** - Individual operation functions
- **`schemas/`** - Zod schemas and TypeScript types

## Using the Generated Operations

### Define Configuration

```ts
import { getPetById, createPet } from "./generated/operations/index.js";

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
import * as operations from "./generated/operations/index.js";
import { configureOperations } from "./generated/operations/index.js";

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

Each operation returns a discriminated union of possible responses, e.g.:

```ts
const result = await getPetById({ petId: "123" }, apiConfig);

if (result.status === 200) {
  // result.data is the parsed/validated response body
  console.log("Pet:", result.data);
} else if (result.status === 404) {
  // Not found
  console.warn("Pet not found");
} else {
  // Exhaustive check
  console.error("Unexpected status", result.status);
}

// Or use the helper:
import { isSuccessResponse } from "./generated/operations/index.js";
if (isSuccessResponse(result)) {
  // result.data is typed
}

// Or handle all cases with the provided utility method:
import { handleResponse } from "./generated/operations/index.js";
handleResponse(result, {
  200: (data) => console.log("Pet:", data),
  404: () => console.warn("Not found"),
  default: (res) => console.error("Other status", res.status),
});
```

## Exception Handling

All responses not handled by the union type throw a typed error:

```ts
try {
  const result = await getPetById({ petId: "notfound" }, apiConfig);
  // handle result as above
} catch (err) {
  if (err instanceof ApiError) {
    console.error("API error", err.status, err.body);
  } else if (err instanceof UnexpectedResponseError) {
    console.error("Unexpected response", err.status, err.data);
  } else {
    throw err; // rethrow unknown errors
  }
}
```

## Validation Error Handling

When operations return JSON responses with Zod schemas, the generated client uses `safeParse()` for graceful validation error handling. Instead of throwing exceptions, validation failures return a structured error object:

```ts
const result = await getUserProfile({ userId: "123" }, apiConfig);

if (result.status === 200) {
  // Check if validation succeeded
  if ("parseError" in result.data) {
    // Handle validation error
    console.error("Response validation failed:", result.data.parseError);
    result.data.parseError.issues.forEach((issue) => {
      console.log(`Field ${issue.path.join(".")}: ${issue.message}`);
    });
  } else {
    // Successful validation - result.data is the parsed User object
    console.log("User:", result.data.name, result.data.email);
  }
} else if (result.status === 404) {
  console.warn("User not found");
}
```

For operations with mixed content types, validation only applies to JSON responses:

```ts
const result = await getDocument(
  {
    docId: "123",
    contentType: { response: "application/json" },
  },
  apiConfig,
);

if (result.status === 200) {
  if ("parseError" in result.data) {
    // Validation error only possible for JSON responses
    console.error("JSON parsing failed:", result.data.parseError);
  } else {
    // Successfully parsed JSON document
    console.log("Document:", result.data);
  }
}
```

Non-JSON responses (like `text/plain`, `application/octet-stream`) don't use Zod validation and therefore never include `parseError`:

```ts
const result = await downloadFile({ fileId: "123" }, apiConfig);

if (result.status === 200) {
  // result.data is directly the file content (no parseError possible)
  console.log("Downloaded file size:", result.data.length);
}
```

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
import { createPet } from "./generated/operations/index.js";

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
import { handleResponse } from "./generated/operations/index.js";

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

## Features

- 🚀 **Multi-version support**: Accepts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x specifications
- 🛠️ **Operation-based client generation**: Generates one function per operation, with strong typing and per-operation configuration—no need for blacklisting operations you don't need!
- 🛡️ **Zod v4 runtime validation**: Validates all response payloads at runtime
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
