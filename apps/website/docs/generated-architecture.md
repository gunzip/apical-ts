---
id: generated-architecture
title: Generated Architecture
description:
  Understanding the structure and organization of generated TypeScript code,
  schemas, and client operations from @apical-ts/craft.
keywords:
  [
    generated code,
    architecture,
    TypeScript structure,
    Zod schemas,
    operation functions,
    code organization,
  ]
---

# Generated Architecture

The Apical TypeScript generator produces a modular, type-safe output package
from your OpenAPI specification. This document describes the structure and
purpose of the generated files and directories.

## Output Directory Structure

```
<output-dir>/
├── package.json                  # Generated package metadata (if enabled)
├── standard-schema.ts            # Shared Standard Schema validation helpers
├── routes/                       # Route metadata and request/response maps
├── client/                       # Type-safe API client operations (if --client)
│   ├── index.ts                  # Exports all operation functions and config
│   ├── runtime.ts                # Global configuration types and helpers
│   └── <operationId>.ts          # Individual operation function for each endpoint
├── server/                       # Framework-agnostic handler wrappers (if --server)
│   ├── index.ts
│   └── <operationId>.ts
└── schemas/                      # Zod v4 schemas for all models
    ├── <SchemaName>.ts           # Individual schema files (one per model)
    └── index.ts                  # Exports all schemas
```

## Key Concepts

- **Zod Schemas**: Every OpenAPI schema is converted to a Zod v4 schema for the
  emitted `schemas/` directory.
- **Route Metadata**: Each operation exposes route metadata and request/response
  maps in `routes/`, which can be consumed by custom adapters and generators.
- **Standard Schema Runtime**: The generated `standard-schema.ts` file
  normalizes sync and async `validate()` results and exposes validation errors
  as `{ issues }`.
- **Client Operations**: Each API operation is generated as a standalone,
  fully-typed function in `client/`. Successful responses can either expose a
  pre-validated `.parsed` field or an async `.parse()` method, depending on
  `forceValidation`.
- **Server Wrappers**: The `server/` directory contains framework-agnostic
  handler wrappers that validate request inputs through the Standard Schema
  contract.

## Example: Generated Operation Function

Each operation function is strongly typed and validates responses through the
Standard Schema contract. Example signature:

```ts
import { GetPetByIdRequest, GetPetByIdResponse } from "./schemas";

export async function getPetById(
  params: GetPetByIdRequest,
  config?: OperationConfig,
): Promise<GetPetByIdResponse> {
  // ...implementation...
}
```

## Customization

- The generator supports options to control output structure, naming, and client
  generation.
- You can extend or wrap the generated client for custom logic (e.g.,
  authentication, logging).

## Learn More

- See the [Client Generation](./client-generation/call-operations.md) docs for
  advanced usage patterns.
- See the [Server Routes Wrappers](./server-routes-wrappers-generation.md) docs
  for wrapper-based server integrations.
