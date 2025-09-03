---
id: generated-architecture
title: Generated Architecture
---

# Generated Architecture

The Apical TypeScript generator produces a modular, type-safe client and schema
package from your OpenAPI specification. This document describes the structure
and purpose of the generated files and directories.

## Output Directory Structure

```
<output-dir>/
├── package.json                  # Generated package metadata (if enabled)
├── client/                       # Type-safe API client operations (if --generate-client)
│   ├── index.ts                  # Exports all operation functions and config
│   ├── config.ts                 # Global configuration types and helpers
│   └── <operationId>.ts          # Individual operation function for each endpoint
└── schemas/                      # Zod v4 schemas for all models
		├── <SchemaName>.ts           # Individual schema files (one per model)
		└── index.ts                  # Exports all schemas
```

## Key Concepts

- **Zod Schemas**: Every OpenAPI schema is converted to a Zod v4 schema for
  runtime validation and type inference. These are placed in the `schemas/`
  directory.
- **Operation Functions**: Each API operation (endpoint) is generated as a
  standalone, fully-typed function in `operations/`. These functions handle
  request construction, parameter validation, and response parsing.
- **Configuration**: The `operations/config.ts` file defines global
  configuration types (e.g., base URL, fetch implementation, interceptors) used
  by all operation functions.
- **Exports**: The `operations/index.ts` and `schemas/index.ts` files provide
  convenient exports for all generated functions and schemas.

## Example: Generated Operation Function

Each operation function is strongly typed and uses Zod schemas for input/output
validation. Example signature:

```ts
import { GetPetByIdRequest, GetPetByIdResponse } from "./schemas";

export async function getPetById(
  params: GetPetByIdRequest,
  config?: OperationConfig,
): Promise<GetPetByIdResponse> {
  // ...implementation...
}
```

## Usage

You can import and use the generated client and schemas in your TypeScript
project:

```ts
import { getPetById } from "./operations";
import { Pet } from "./schemas";

const pet = await getPetById({ petId: 123 });
Pet.parse(pet); // Runtime validation
```

## Customization

- The generator supports options to control output structure, naming, and client
  generation.
- You can extend or wrap the generated client for custom logic (e.g.,
  authentication, logging).

## Learn More

- See the [README](../../craft/README.md) for CLI and programmatic usage.
- See the [Client Generation](./client-generation/call-operations.md) docs for
  advanced usage patterns.
