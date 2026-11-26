# @apical-ts/craft

[![npm version](https://img.shields.io/npm/v/@apical-ts/craft)](https://www.npmjs.com/package/@apical-ts/craft)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/gunzip/apical-ts/blob/main/LICENSE)
[![Tests](https://github.com/gunzip/apical-ts/actions/workflows/test.yml/badge.svg)](https://github.com/gunzip/apical-ts/actions/workflows/test.yml)

Generate exact **Zod v4 schemas**, Standard Schema-compatible route metadata,
operation-based REST clients, and typed server wrappers from OpenAPI 2.0, 3.0.x,
and 3.1.x specifications.

- **Docs**: https://gunzip.github.io/apical-ts/
- **Live Demo**:
  [Try in StackBlitz](https://stackblitz.com/edit/apical-craft-example?file=src%2Fclient.ts)

## CLI

```bash
npx @apical-ts/craft generate \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o ./generated \
  --client --server
```

## Strict types and runtime validation

Each generated client operation is a standalone, tree-shakable function that
never throws and returns a discriminated union over documented HTTP status codes
and error kinds:

```ts
import { getPetById } from "./generated/client/getPetById.ts";

const response = await getPetById({ path: { petId: "123" } });

if (response.status === "200") {
  // Validated at runtime and narrowed to the 200 payload
  console.log(response.parsed.data.name);
} else if (!response.isValid) {
  // Network, unexpected-response, parse-error, or deserialization-error
  console.error(response.kind, response.error);
}
```

## Contract-first integrations

Apical TS can generate different layers from the same OpenAPI contract,
depending on how much framework glue you want to write yourself and how much you
want to derive later.

| Output     | Best for                                              | Example                         |
| ---------- | ----------------------------------------------------- | ------------------------------- |
| `--server` | explicit, wrapper-based server integrations           | `examples/express`              |
| `--routes` | metadata-driven generators and dynamic adapters       | `examples/hono`                 |
| `--client` | typed frontend/API consumers and secondary generators | `examples/tanstack-query-hooks` |

`--client` and `--server` also emit `routes/`, so the same contract can feed
mock handlers, frontend hooks, or custom framework adapters without re-modeling
paths, params, or responses for each integration.

See the examples in
[`examples/`](https://github.com/gunzip/apical-ts/tree/main/examples),
especially `express`, `hono`, `msw-mock-server`, and `tanstack-query-hooks`.
