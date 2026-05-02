# @apical-ts/craft - Yet Another OpenAPI to TypeScript Generator

✨ Effortlessly turn your OpenAPI specifications into **fully-typed Zod v4
schemas** ready for runtime (client or server) validation and TypeScript
development.

Need a **client**? 🚀 Instantly generate a type-safe, low-footprint,
operation-based REST API client alongside your schemas.

Need to **validate server requests and return typed responses**? 🛡️ We've got
you covered with built-in support for request and response validation using Zod
schemas.

## CLI

```bash
pnpm start generate -i ./openapi.yaml -o ./generated --client --server
```

## Contract-first integrations

Apical TS can generate different layers from the same OpenAPI contract,
depending on how much framework glue you want to write yourself and how much you
want to derive later.

| Output     | Best for                                              | Example                      |
| ---------- | ----------------------------------------------------- | ---------------------------- |
| `--server` | explicit, wrapper-based server integrations           | `examples/express`           |
| `--routes` | metadata-driven generators and dynamic adapters       | `examples/hono`              |
| `--client` | typed frontend/API consumers and secondary generators | `examples/react-query-hooks` |

`--client` and `--server` also emit `routes/`, so the same contract can feed
mock handlers, frontend hooks, or custom framework adapters without re-modeling
paths, params, or responses for each integration. See the examples in
[`examples/`](./examples/), especially `express`, `hono`, `msw-mock-server`, and
`react-query-hooks`.

### Overriding OpenAPI string formats

Use `--format` to replace a `type: string` + `format` mapping with your own Zod
schema:

```bash
pnpm start generate \
  -i ./openapi.yaml \
  -o ./generated \
  --client \
  --server \
  --format tax-code=./src/zod/TaxCode.ts \
  --format uuid=@acme/domain-schemas#Uuid
```

- `--format` is repeatable
- `<format>` must match the OpenAPI `format` value exactly
- `<module-or-path>` accepts both package/module specifiers and explicit project
  paths (`./` or `../`)
- `#<export>` is optional; when omitted, `craft` infers the export name from the
  last path or module segment

When a mapping matches, the generator imports your Zod schema into generated
`schemas` files and reuses it through generated routes, client, and server
types. The matched string field stops using the built-in OpenAPI string
constraints and delegates validation to your custom schema.

See https://gunzip.github.io/apical-ts/ for more information.
