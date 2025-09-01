# YanoGen-Ts - Yet Another OpenAPI to TypeScript Generator

✨ Effortlessly turn your OpenAPI specifications into **fully-typed Zod v4
schemas** ready for runtime (client or server) validation and TypeScript
development.

Need a **client**? 🚀 Instantly generate a type-safe, low-footprint,
operation-based REST API client alongside your schemas.

Need to **validate server requests and return typed responses**? 🛡️ We've got
you covered with built-in support for request and response validation using Zod
schemas.

> **Disclaimer:** Breaking changes may occur until the first stable release
> (0.1.0) is released. Nevertheless, the project is already solid and you can
> still experiment with it in your projects.

## Why another generator?

We all like the developer experience of [tRPC](https://trpc.io/), but not always
we're in control of the backend. OpenAPI specifications provide a powerful way
to define your API contracts, and with YanoGen-Ts, you can easily generate
TypeScript code that strictly adheres to those contracts, all while enjoying a
seamless developer experience.

Many existing generators lack flexibility and strong type safety. Most do not
support multiple success responses or multiple content types, and their typings
are often too loose—making it easy to accidentally access undefined properties.
With **stricter** guardrails, YanoGen-Ts helps developers (and Gen-AIs) build
more robust and reliable implementations.

Curious why you should choose this generator over others? See
[comparison](#comparison-with-alternative-libraries) for more details or check
[supported features](#supported-features) for more information.

![Demo of OpenAPI TypeScript Generator](./demo.gif)

## Table of Contents <!-- omit in toc -->

- [YanoGen-Ts - Yet Another OpenAPI to TypeScript Generator](#yanogen-ts---yet-another-openapi-to-typescript-generator)
  - [Why another generator?](#why-another-generator)
  - [CLI Usage](#cli-usage)
    - [Watch mode](#watch-mode)
    - [CLI Options](#cli-options)
  - [Supported Input Formats](#supported-input-formats)
  - [Programmatic Usage](#programmatic-usage)
  - [Generated Architecture](#generated-architecture)
- [Client Generation](#client-generation)
  - [Define Configuration](#define-configuration)
  - [Call Operations](#call-operations)
  - [Binding Configuration to Operations](#binding-configuration-to-operations)
  - [Response Handling](#response-handling)
  - [Error Handling](#error-handling)
    - [Error Types](#error-types)
    - [Error Handling Patterns](#error-handling-patterns)
    - [Error Context](#error-context)
  - [Response Payload Validation](#response-payload-validation)
    - [Manual Runtime Validation](#manual-runtime-validation)
    - [Automatic Runtime Validation](#automatic-runtime-validation)
    - [Why is Runtime Validation Opt-In?](#why-is-runtime-validation-opt-in)
    - [When to Enable Automatic Validation](#when-to-enable-automatic-validation)
    - [When to Use Manual Validation](#when-to-use-manual-validation)
  - [Custom Response Deserialization](#custom-response-deserialization)
    - [Why use Deserializers?](#why-use-deserializers)
    - [Example of Custom Deserializers](#example-of-custom-deserializers)
    - [Basic Usage](#basic-usage)
    - [Configuring Deserializers](#configuring-deserializers)
    - [Returned Object Shapes](#returned-object-shapes)
    - [Common Patterns](#common-patterns)
    - [Error Handling Summary](#error-handling-summary)
    - [Best Practices](#best-practices)
  - [Handling Multiple Content Types (Request \& Response)](#handling-multiple-content-types-request--response)
    - [Example: Endpoint with Multiple Request Content Types](#example-endpoint-with-multiple-request-content-types)
    - [Example: Endpoint with Multiple Response Content Types](#example-endpoint-with-multiple-response-content-types)
  - [Using Generated Zod Schemas](#using-generated-zod-schemas)
- [Server Routes Wrappers Generation](#server-routes-wrappers-generation)
  - [How to Generate a Server Route Wrapper](#how-to-generate-a-server-route-wrapper)
  - [Using the Wrapped Handler](#using-the-wrapped-handler)
    - [Handler Function Signature](#handler-function-signature)
- [Supported Features](#supported-features)
  - [Benefits of Operation-Based Architecture](#benefits-of-operation-based-architecture)
- [Comparison with alternative libraries](#comparison-with-alternative-libraries)
  - [Conclusion](#conclusion)

## CLI Usage

```sh
pnpx yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

### Watch mode

You can run the CLI in watch mode to automatically regenerate code on file
changes:

```sh
pnpx chokidar-cli openapi.yaml -c \
  "yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i openapi.yaml \
  -o generated"
```

### CLI Options

- `-i, --input <path>`: Path to the OpenAPI spec file (2.0, 3.0.x, or 3.1.x) in
  YAML or JSON format
- `-o, --output <path>`: Output directory for generated code
- `--generate-client`: Generate the operation functions (default: false)
- `--generate-server`: Generate the operation wrapper (default: false)

## Supported Input Formats

The generator automatically detects and converts:

- **OpenAPI 2.0** (Swagger) → 3.0 → 3.1
- **OpenAPI 3.0.x** → 3.1
- **OpenAPI 3.1.x** (no conversion needed)

All input formats (local or remote yaml or JSON) are automatically normalized to
OpenAPI 3.1.0 before generation.

## Programmatic Usage

```ts
import { generate } from "./src/core-generator/index.js";

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

## Define Configuration

```ts
import { getPetById, createPet } from "./generated/client/index.js";

// You can define your API configuration or just use the default one
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
  },
  // optional
  forceValidation: false,
  // optional
  deserializers: {
    "application/json": (data) => JSON.parse(data),
    "application/xml": (data) => {
      const parser = new DOMParser();
      return parser.parseFromString(data, "application/xml");
    },
  },
};
```

## Call Operations

```ts
// Simple operation call
const pet = await getPetById({ petId: "123" }, apiConfig);

// Operation with typed request body
// You probably want to bind a configuration object
// to the operation, in order to avoid passing it as parameter
// see section "Binding Configuration to Operations" below.
const newPet = await createPet(
  {
    body: {
      name: "Fluffy",
      status: "available",
    },
  },
  apiConfig,
);

// Or, using default config
const result = await getPetById({ petId: "123" });
```

## Binding Configuration to Operations

You can use the `configureOperations` helper to bind a configuration object to
all generated operations, so you don't have to pass the config each time:

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

// You may consider to only pass operations you use
const client = configureOperations(operations, apiConfig);

// Now you can call operations without passing config:
const pet = await client.getPetById({ petId: "123" });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});
```

You can still override the configuration for individual operations, passing it
as the second argument.

## Response Handling

Each operation returns a discriminated union: either a successful API response
(`success: true` with a `status` code) or an error object (`success: false`)
with a `kind` discriminator.

Validation is opt-in by default (success responses expose a `parse()` method).
You can enable automatic validation at runtime by providing
`forceValidation: true` in the configuration you pass to an operation or via
`configureOperations`.

Recommended pattern:

```ts
const result = await getPetById({ petId: "123" });

if (result.success === false) {
  console.error("Operation failed:", result.kind, result.error);
} else if (result.status === 200) {
  console.log("Pet (raw):", result.data);
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  console.error("Unexpected documented status", result.status);
}
```

## Error Handling

Client calls never throw exceptions. Instead, all errors are returned as part of
the response union, providing a consistent and type-safe error handling
experience. You can branch on either `result.success === false` or the presence
of the `kind` field; both are valid.

### Error Types

All operations return a union that includes `ApiResponseError`, which is a
discriminated union covering all possible error scenarios:

```ts
type ApiResponseError =
  | {
      readonly kind: "unexpected-error";
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

### Error Handling Patterns

```ts
const result = await getPetById({ petId: "123" });

if (!result.success) {
  // You don't have to handle all errors like this, but you can.
  switch (result.kind) {
    case "unexpected-response":
      console.error("Unexpected status:", result.status, result.error);
      break;
    case "deserialization-error":
      console.error("Deserialization failed:", result.error);
      break;
    case "parse-error":
      console.error("Validation failed:", result.error);
      break;
    case "missing-schema":
      console.error("Schema missing:", result.error);
      break;
    case "unexpected-error":
      console.error("Unexpected error:", result.error);
      break;
  }
} else if (result.status === 200) {
  // result.data is the raw response payload
  console.log("Pet:", result.data);
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  console.error("Unexpected documented status", result.status);
}
```

### Error Context

Different error types provide different context:

- **unexpected-error**: Network failures, connection issues, or any unexpected
  exception (no `status`, `data`, or `response`)
- **unexpected-response**: HTTP status codes not defined in OpenAPI spec
  (includes `status`, `data`, `response`)
- **parse-error**: Zod validation failures when using `parse()` or automatic
  runtime validation (includes parsing details)
- **deserialization-error**: Custom deserializer failures (includes original
  error)
- **missing-schema**: No schema available for content type (includes attempted
  deserialization)

## Response Payload Validation

When you call a generated operation that has a response body defined within the
OpenAPI specification for some status codes, the returned Promise resolves to a
result object that provides either a `.parsed` field or a `.parse()` method,
depending on the value of the `config.forceValidation` flag. You can set this
flag in the configuration passed to an individual operation or globally using
`configureOperations`.

- If you bind with `forceValidation: false` (or omit it), success responses
  always expose a `.parse()` method after you narrow on `success === true` and a
  specific `status`. You have to handle parsing errors manually in this case.
- If you bind with `forceValidation: true`, success responses expose a `.parsed`
  field (and no `.parse()` method) because validation is performed automatically
  during the request lifecycle. In case of parsing errors, the returned result
  will include a `ZodError` instance instead of the `parsed` field.

Don't worry if it seems confusing at first, type inference will help you.

Examples:

```ts
// examples/client-examples/force-validation.ts

import {
  configureOperations,
  globalConfig,
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
  if (lazyPetsResponse.success === true && lazyPetsResponse.status === 200) {
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
  if (petsResponse1.success === true && petsResponse1.status === 200) {
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
  if (greedyPetResponse.success === true && greedyPetResponse.status === 200) {
    // automatic validation: .parsed available
    greedyPetResponse.parsed;
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
  if (petsResponse2.success === true && petsResponse2.status === 200) {
    // bound automatic validation: .parsed available
    petsResponse2.parsed;
  }
}

demonstrateClient();
```

### Manual Runtime Validation

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

if (result.success) {
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

### Automatic Runtime Validation

Enable automatic validation per request by setting `forceValidation: true` in
the config you pass to an operation, or globally by binding a config with
`configureOperations`:

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
if (result.success && result.status === 200) {
  if (isParsed(result)) {
    console.log("User:", result.parsed.name);
  } else if (result.kind === "parse-error") {
    console.error("Validation failed", result.error);
  }
}
```

### Why is Runtime Validation Opt-In?

TypeScript client generator uses Zod for payload validation and parsing, but
we've made this feature opt-in rather than mandatory. This design choice
provides several key advantages:

- **Integration with Existing Systems**: This approach allows for seamless
  integration with other validation mechanisms already present in your codebase.
  If you have existing business logic that handles data validation, disabled
  runtime parsing at the client level avoids redundancy and streamlines your
  data flow.

- **Robustness in the Real World**: APIs responses can be unpredictable. You
  might encounter non-documented fields or slight deviations from the OpenAPI
  specification. Making validation optional prevents the client from crashing on
  unexpected—but often harmless—payloads, ensuring your application remains
  resilient.

- **Performance**: Parsing and validating a payload comes with a computational
  cost. By allowing you to opt-in, you can decide to skip validation for
  non-critical API calls, leading to better performance, especially in
  high-volume scenarios.

This approach gives you more control, allowing you to balance strict type-safety
with the practical demands of working with real-world APIs.

### When to Enable Automatic Validation

Enable `forceValidation: true` when:

- **Trusted APIs**: When responses always match the OpenAPI specification
- **Performance is Not Critical**: When the validation overhead is acceptable
  for your use case

### When to Use Manual Validation

Use manual validation (omit or set `forceValidation: false`) when:

- **Huge Payloads**: When dealing with large responses where validation overhead
  is a concern
- **Untrusted APIs**: When APIs may return unexpected data that shouldn't crash
  your application
- **Gradual Migration**: When incrementally adding validation to existing
  codebases
- **Custom Validation Logic**: When you need more control over validation
  behavior and error handling or you have your own validation already in place

## Custom Response Deserialization

For advanced scenarios (e.g. XML parsing, vendor-specific media types, binary
post-processing) you can provide custom deserializers through the config object.
The `parse()` method will automatically use these deserializers before schema
validation occurs.

Deserializers are methods that transform the raw response data into a format
suitable for validation. They can be defined for specific content types and are
applied automatically during the parsing process.

### Why use Deserializers?

- Apply transformations (e.g. date reviver, case normalization) prior to Zod
  validation
- Decode non‑JSON types (XML → JS object, CSV → array, binary → metadata)
- Gracefully handle vendor or unknown content types without modifying generated
  code

### Example of Custom Deserializers

```ts
{
  "application/xml": (data: unknown) => {
    // Custom XML parsing logic
    const xmlString = data as string;
    const nameMatch = /<name>([^<]+)<\/name>/u.exec(xmlString);
    const ageMatch = /<age>([^<]+)<\/age>/u.exec(xmlString);
    return {
      name: nameMatch?.[1] || "",
      age: Number(ageMatch?.[1]) || 0,
    };
  },
  "application/vnd.custom+json": (data: unknown) => {
    // Custom JSON transformation
    const obj = data as Record<string, unknown>;
    return {
      ...obj,
      id: String(obj.id).toUpperCase(),
      timestamp: new Date(),
    };
  },
}
```

### Basic Usage

```ts
const res = await testMultiContentTypes(
  {
    body: { id: "123", name: "Example" },
    contentType: { response: "application/xml" },
  },
  {
    ...globalConfig,
    // this can be merged into the global config object as well
    deserializers: {
      "application/xml": (raw: unknown) => customXmlToJson(raw as string),
      "application/octet-stream": (blob: unknown) => ({
        size: (blob as Blob).size,
      }),
    },
  },
);

if (res.success && res.status === 200) {
  const outcome = res.parse();
  if (isParsed(outcome)) {
    console.log(outcome.parsed);
  } else if (outcome.kind === "parse-error") {
    console.error("Validation failed", outcome.error);
  } else if (outcome.kind === "deserialization-error") {
    console.error("Deserializer threw", outcome.error);
  } else if (outcome.kind === "missing-schema") {
    console.warn("No schema for content type; raw value:", res.data);
  }
}
```

### Configuring Deserializers

The `deserializers` is a property of the config object that maps content types
to deserializer functions:

```ts
type Deserializer = (data: unknown, contentType?: string) => unknown;
type DeserializerMap = Record<string, Deserializer>;
```

When provided in the config, the raw response body is passed to your function
before schema validation. Whatever you return becomes the input to schema
validation (if a schema for that content type exists).

### Returned Object Shapes

The result of `parse()` is a discriminated object you can pattern match on:

| Scenario                              | Shape                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Schema + validation success           | `{ contentType, parsed }`                                                   |
| Schema + validation failure           | `{ contentType, parseError }`                                               |
| Schema present but deserializer threw | `{ contentType, deserializationError }`                                     |
| No schema for content type            | `{ contentType, missingSchema: true, deserialized, deserializationError? }` |

Notes:

- If the deserializer throws, validation is skipped (you get
  `deserializationError`).
- If no schema exists, the transformed value is returned under `deserialized`
  and flagged with `missingSchema: true`.
- Content type normalization strips any charset parameters (e.g.
  `application/json; charset=utf-8` → `application/json`).

### Common Patterns

1. XML → JS:

```ts
const outcome = res.parse();
// Uses deserializers from config:
// {
//   "application/xml": (xml: unknown) => fastXmlParser.parse(xml as string),
// }
```

2. Binary metadata:

```ts
const outcome = res.parse();
// Uses deserializers from config:
// {
//   "application/octet-stream": (b: unknown) => ({ size: (b as Blob).size }),
// }
```

3. Vendor JSON normalization:

```ts
const outcome = res.parse();
// Uses deserializers from config:
// {
//   "application/vnd.custom+json": (data: any) => ({
//     ...data,
//     id: String(data.id).toUpperCase(),
//   }),
// }
```

### Error Handling Summary

| Field                         | Meaning                                             |
| ----------------------------- | --------------------------------------------------- |
| Variant / Field               | Meaning                                             |
| ----------------------        | --------------------------------------------------- |
| `parsed`                      | Successfully deserialized & schema-validated data   |
| `kind: parse-error`           | Validation failed (`error` is a `ZodError`)         |
| `kind: deserialization-error` | Custom deserializer threw an exception              |
| `kind: missing-schema`        | No schema found for that content type               |

### Best Practices

- Keep deserializers pure & fast—avoid performing network calls
- Return plain JS objects ready for validation; do not mutate globals
- Prefer adding schemas in the spec when possible (better type safety)
- Log or surface `deserializationError` for observability

## Handling Multiple Content Types (Request & Response)

This generator fully supports OpenAPI endpoints that define multiple content
types for both requests and responses. For each operation, the generated client:

- Accepts a `contentType` property in the request object, which is an object
  with optional `request` and `response` keys, to specify which content type to
  use for the request and which to prefer for the response.
- Returns a response typed according to the selected response content type.
- Validates and parses the response according to the content type actually
  returned by the server.

### Endpoints with Multiple Request / Response Content Types

Suppose your OpenAPI spec defines an operation that accepts both
`application/json` and `application/x-www-form-urlencoded` for the request body
and may return either `application/json` or `application/xml` for the response:

```yaml
/pet:
  put:
    operationId: updatePet
    requestBody:
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Pet"
        application/xml:
          schema:
            $ref: "#/components/schemas/Pet"
      required: true
    responses:
      "200":
        description: Successful operation
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Pet"
          application/xml:
            schema:
              $ref: "#/components/schemas/Pet"
      "400":
        description: Invalid ID supplied
      "404":
        description: Pet not found
      "422":
        description: Validation exception
      default:
        description: Unexpected error
```

The generated operation function will accept a `contentType` object to select
the body and/or response format:

```ts
// examples/client-examples/multi-content-types.ts#L5-L68

const parseXml = () => {
  // Implement XML deserialization logic here
  // For demonstration, returning a dummy object
  return {
    name: "Parsed Fluffy",
    id: 1,
    photoUrls: [
      "http://example.com/parsed_photo1.jpg",
      "http://example.com/parsed_photo2.jpg",
    ],
  };
};

async function demonstrateClient() {
  const ret = await updatePet(
    {
      body: {
        name: "Fluffy",
        id: 1,
        photoUrls: [
          "http://example.com/photo1.jpg",
          "http://example.com/photo2.jpg",
        ],
      },
      contentType: {
        // We Accept XML...
        request: "application/xml",
      },
    },
    {
      ...globalConfig,
      deserializers: {
        // ... so we Expect XML
        "application/xml": parseXml,
      },
    },
  );

  if (!ret.success) {
    console.error("Error:", ret.error);
  } else if (ret.status === 200) {
    console.log("Raw data:", ret.data);
    const parsed = ret.parse();
    if (!isParsed(parsed)) {
      if (parsed.kind == "parse-error") {
        // Here we can handle Zod parsing errors
        // (if we want to)
        console.error(
          "Error: Cannot parse data",
          z.prettifyError(parsed.error),
        );
      } else {
        // All other error kind...
        console.error("Error:", parsed.error);
      }
    } else if (parsed.contentType == "application/xml") {
      // Only here we can access the parsed XML data properties!
      console.log("Parsed XML data (name):", parsed.parsed.name);
    } else if (parsed.contentType == "application/json") {
      // Shouldn't happen since we requested XML, but who knows!
      console.log("Parsed JSON data (name):", parsed.parsed.name);
    }
  }
}
```

## Using Generated Zod Schemas

You can use the generated Zod schemas to validate and parse your data easily.

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

# Server Routes Wrappers Generation

The generator can also produce a fully-typed server handler wrapper for your
OpenAPI operations. This enables you to build type-safe HTTP servers (e.g., with
Express, Fastify, or custom frameworks) that validate requests at runtime using
Zod schemas and can return only responses of the expected types.

## How to Generate a Server Route Wrapper

To generate server-side code, use the CLI with the `--generate-server` flag:

```bash
pnpx yanogen-ts generate \
  --generate-server \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This will create a `server/` directory in your output folder, containing:

- **`server/index.ts`**: Exports the server handler wrappers and types
- **`server/<operationId>.ts`**: Individual operation handler wrappers

## Using the Wrapped Handler

The generated route wrapper is a function that takes a request handler and
returns an async function that can be used with any web framework. This allows
you to ensure type safety and runtime validation for your request parameters
(path, query, headers) and response data.

You are responsible for extracting parameters from the framework request and
passing them to the wrapper, then handling the result (status, contentType,
data) in your route handler. This allows you to integrate with any web framework
and customize error handling as needed.

Example usage with Express and a helper for parameter extraction:

```ts
import express from "express";
import { testAuthBearerWrapper } from "./generated/server/testAuthBearer.js";
import { extractRequestParams } from "./test-helpers.js";

const app = express();
app.use(express.json());

const wrappedHandler = testAuthBearerWrapper(async (params) => {
  if (params.success) {
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

- The wrapper receives a single params object (containing query, path, headers,
  body, etc.)
- You can use a helper like `extractRequestParams` to transform Express request
  data into the expected format
- The handler receives validated and typed parameters, or error details if
  validation fails
- You control the HTTP response based on the wrapper's result

See [./examples](./examples) directory for more usage examples.

### Handler Function Signature

The handler you provide to the wrapper receives a single argument:

- For valid requests:
  `{ success: true, value: { query, path, headers, body, ... } }`
- For validation errors:
  `{ success: false, kind: "query-error" | "body-error" |   ... , error: ZodError }`

It must return an object with `{ status, contentType, data }`.

# Supported Features

- Request validation (body, query, params) using generated Zod schemas
- Response validation before sending (if you use the generated types)
- Automatic error details for validation failures
- Type-safe handler context

You can use the generated types and schemas for further custom validation or
integration with other frameworks.

- 🚀 **Multi-version support**: Accepts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x
  specifications
- 🛠️ **Operation-based client generation**: Generates one function per
  operation, with strong typing and per-operation configuration—no need for
  blacklisting operations you don't need!
- 🛡️ **Zod v4 runtime validation (opt-in or automatic)**: Invoke
  `response.parse()` manually, or enable `forceValidation: true` at runtime for
  automatic validation
- 📦 **Small footprint**: Generates each operation and schema/type in its own
  file for maximum tree-shaking and modularity
- 🚀 **Fast code generation**: Optimized for quick generation times, even with
  large specs, sync types and changes in real-time
- 🔒 **Type-safe configuration**: Immutable global defaults, with the ability to
  override config per operation
- 🔑 **Flexible authentication**: Supports OpenAPI security schemes (Bearer, API
  Key, etc.), with dynamic header/query configuration
- 🧩 **Discriminated union response types**: Each operation returns a
  discriminated union of possible responses, enabling exhaustive handling
- ⚠️ **Comprehensive error handling**: No exceptions thrown - all errors
  (network, parsing, unexpected responses) are returned as typed error objects
  with detailed context
- 📁 **File upload/download & binary support**: Handles `multipart/form-data`
  and `application/octet-stream` uploads and downloads
- 📦 **ESM output**: Generated code is ESM-first
- 🪶 **Minimal dependencies**: No runtime dependencies except Zod; works in
  Node.js and browsers
- 🧪 **Self-contained Zod schemas**: Generated schemas can be used independently
  for validation (e.g., in forms) and server-side logic
- 🔄 **Automatic OpenAPI normalization**: All input specs are normalized to
  OpenAPI 3.1.0 before code generation
- ✅ **Comprehensive test suite**: Project includes Vitest-based tests for all
  major features

## Benefits of Operation-Based Architecture

- **Tree Shaking**: Only bundle the operations you actually use
- **Type Safety**: Better parameter organization with an immutable config object
- **Flexibility**: Easy per-operation configuration with all required fields
- **Maintainability**: Each operation in its own file
- **Testing**: Simple to mock individual operations
- **Debugging**: Easier to trace issues with isolated operations

# Comparison with alternative libraries

After
[evaluating several libraries](https://github.com/gunzip/openapi-generator-benchmark),
we found that each has its
[strengths and weaknesses](https://pagopa.github.io/dx/blog/typescript-openapi-generators-0.1-alpha),
but ultimately, we chose to build this project to address specific needs and use
cases.

Here is a comparison of the key features and limitations of each library.

| Feature / Limitation           |             yanogen-ts              |        openapi-codegen-ts        | openapi-zod-client |     openapi-ts     |
| ------------------------------ | :---------------------------------: | :------------------------------: | :----------------: | :----------------: |
| **Output structure**           |               Modular               |            Monolithic            |     Monolithic     |     Monolithic     |
| **Dependency footprint**       |         Minimal (Zod only)          | io-ts, @pagopa/ts-commons, fp-ts |  zodios + others   | Minimal (Zod only) |
| **Runtime validation**         |               Zod v4                |              io-ts               |       Zod v3       |       Zod v4       |
| **OpenAPI version support**    | 2.0, 3.0.x, 3.1.x (auto-normalized) |            2.0, 3.0.x            |    3.0.x, 3.1.x    |    3.0.x, 3.1.x    |
| **Error handling**             |           Strongly Typed            |        Typed, exhaustive         |       Basic        |       Basic        |
| **Generation Speed**           |               Faster                |        Slow on big specs         |        Fast        |        Fast        |
| **Schema Quality**             |              Very good              |            Very good             |       Loose        |        Good        |
| **Multiple success responses** |                 ✅                  |                ✅                |         ❌         |         ❌         |
| **Multiple content types**     |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Security header support**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File download response**     |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **Tree-shaking friendly**      |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Per-operation overrides**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File upload support**        |                 ✅                  |                ✅                |         ✅         |         ✅         |
| **Server Validation**          |                 ✅                  |                ❌                |         ❌         |         ❌         |

- https://github.com/astahmer/openapi-zod-client
- https://github.com/pagopa/openapi-codegen-ts
- https://github.com/hey-api/openapi-ts

## Conclusion

This project is designed with a clear focus on delivering an exceptional
developer experience and robust type safety. Our core goals are to:

- **Eliminate runtime errors** by leveraging _strong_ TypeScript typing and
  comprehensive support for OpenAPI specs (ie. multiple response types).
- **Offer a developer experience similar to tRPC**, but fully driven by OpenAPI
  specifications—combining the best of both worlds: type safety and open
  standards (works with _external_ specs as well).
- **Generate high-quality, reusable schemas** for both API requests and
  responses, ensuring consistency across your codebase.

During our research, we discovered that many existing tools either lacked
flexibility or forced developers into rigid workflows. By emphasizing
modularity, type safety, and ease of integration, this project aims to bridge
those gaps—empowering TypeScript developers to build reliable, maintainable APIs
with confidence.
