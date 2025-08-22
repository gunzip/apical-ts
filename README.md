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
  - [Using Generated Zod Schemas](#using-generated-zod-schemas)
  - [Features](#features)
  - [Benefits of Operation-Based Architecture](#benefits-of-operation-based-architecture)
  - [Known Limitations](#known-limitations)
    - [Multiple Content Types](#multiple-content-types)
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

### Multiple Content Types

This is probably the biggest limitation and will be addressed in future versions.

Currently, the generator supports only a **single content type per request or response**. If an OpenAPI specification defines multiple content types for the same request body, the generator will select one based on the following priority order:

1. `application/json`
2. `application/x-www-form-urlencoded`
3. `multipart/form-data`
4. `text/plain`
5. `application/xml`
6. `application/octet-stream`
7. First available content type (if none of the above match)

**Example:**

```yaml
# This OpenAPI spec defines multiple content types
requestBody:
  content:
    application/json: # ← This will be selected (highest priority)
      schema:
        type: object
    application/xml: # ← This will be ignored
      schema:
        type: string
```

The generated operation will only handle the `application/json` content type in this case.

**Workaround**: If you need to support multiple content types for requests for the same endpoint, you can:

1. Define separate operations for each content type in your OpenAPI spec
2. Manually modify the generated code after generation

### Missing Response Headers Validation

- Header defined within responses schemas are currently not verified; a parsed headers object could be added to `ApiResponse` in the future. You can get headers accessing the raw `response` object anyway.

### String Constraints on Query and Path Parameters

- String constraints (e.g., minLength, maxLength, pattern) on query and path parameters are not validated. Should we generate their schemas with Zod as well?

## Comparison with alternative libraries

After [evaluating several libraries](https://github.com/gunzip/openapi-generator-benchmark), we found that each has its [strengths and weaknesses](https://pagopa.github.io/dx/blog/typescript-openapi-generators-0.1-alpha), but ultimately, we chose to build this project to address specific needs and use cases.

Here is a comparison of the key features and limitations of each library.

| Feature / Limitation           | typescript-openapi-generator (this project) |                      openapi-codegen-ts                       |   openapi-zod-client   |
| ------------------------------ | :-----------------------------------------: | :-----------------------------------------------------------: | :--------------------: |
| **Output structure**           |        Modular (per operation/type)         | Monolithic (single file for all operations and request types) |  Single file + zodios  |
| **Dependency footprint**       |             Minimal (Zod only)              |               io-ts, @pagopa/ts-commons, fp-ts                |    zodios + others     |
| **Runtime validation**         |                   Zod v4                    |                             io-ts                             |         Zod v3         |
| **OpenAPI version support**    |     2.0, 3.0.x, 3.1.x (auto-normalized)     |                          2.0, 3.0.x                           |      3.0.x, 3.1.x      |
| **Error handling**             |              Typed, exhaustive              |                       Typed, exhaustive                       |         Basic          |
| **Type complexity**            |                   Simple                    |                 Complex and hard to maintain                  |         Simple         |
| **Generation Speed**           |                   Faster                    |                      Slower on big specs                      |          Fast          |
| **Subtype constraints**        |                     ✅                      |                              ✅                               | ⚠️ (Only at top-level) |
| **Multiple success responses** |                     ✅                      |                              ✅                               |           ❌           |
| **Security header support**    |                     ✅                      |                              ✅                               |           ❌           |
| **File download response**     |                     ✅                      |                              ✅                               |           ❌           |
| **Tree-shaking friendly**      |                     ✅                      |                              ❌                               |           ❌           |
| **Per-operation overrides**    |                     ✅                      |                              ✅                               |           ❌           |
| **File upload support**        |                     ✅                      |                              ✅                               |           ✅           |
| **Server-side usage**          |                     ✅                      |                              ✅                               |           ✅           |
