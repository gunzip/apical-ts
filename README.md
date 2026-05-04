# @apical-ts/craft - Yet Another OpenAPI to TypeScript Generator

✨ Effortlessly turn your OpenAPI specifications into **fully-typed Zod v4
schemas** ready for runtime (client or server) validation and TypeScript
development.

Need a **client**? 🚀 Instantly generate a type-safe, low-footprint,
operation-based REST API client alongside your schemas.

Need to **validate server requests and return typed responses**? 🛡️ We've got
you covered with built-in support for request and response validation using Zod
schemas.

See https://gunzip.github.io/apical-ts/ for more information.

## CLI

```bash
npx @apical-ts/craft generate -i https://petstore.swagger.io/v2/swagger.json -o ./generated --client --server
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
paths, params, or responses for each integration.

See the examples in [`examples/`](./examples/), especially `express`, `hono`,
`msw-mock-server`, and `react-query-hooks`.
