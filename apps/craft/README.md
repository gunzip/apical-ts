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

### Raw JSON Schema input

```bash
pnpm start generate -i ./schema.yaml -o ./generated
```

`craft` can also accept raw JSON Schema documents in YAML or JSON format. These
inputs are normalized to a minimal OpenAPI 3.1 document before schema
generation.

Raw JSON Schema input is currently limited to **schema generation only**. If you
need `--client`, `--server`, or `--routes`, convert the document to OpenAPI
first.

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
