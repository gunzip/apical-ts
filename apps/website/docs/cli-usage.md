---
id: cli-usage
title: CLI Usage
description:
  Complete guide to using @apical-ts/craft CLI tool. Generate TypeScript clients
  and schemas from OpenAPI specifications with command-line options and
  examples.
keywords:
  [
    CLI,
    command line,
    OpenAPI generator,
    TypeScript client,
    schema generation,
    command options,
  ]
---

# CLI Usage

The @apical-ts/craft CLI tool allows you to generate TypeScript clients and
schemas from OpenAPI specifications with a simple command-line interface.

## Basic Usage

Generate schemas and client code from an OpenAPI specification:

```bash
npx @apical-ts/craft generate \
  --server \
  --client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This command will:

1. Download the OpenAPI specification from the provided URL
2. Generate Zod schemas for all data models
3. Generate client operation functions (if `--client` is specified)
4. Generate server handler wrappers (if `--server` is specified)
5. Output all generated files to the `generated` directory

## Runtime Dependencies

The generated client and server code requires `zod` as a runtime dependency for
schema validation. After generation, install it in your output directory:

```bash
cd generated
npm install
```

## Watch Mode

You can run the CLI in watch mode to automatically regenerate code when your
OpenAPI specification file changes:

```bash
npm install chokidar-cli @apical-ts/craft
npm exec -- chokidar-cli openapi.yaml -c \
  "craft generate \
  --server \
  --client \
  -i openapi.yaml \
  -o generated"
```

This is particularly useful during development when you're iterating on your API
specification.

## CLI Options

### Required Options

- `-i, --input <path>`: Path to the OpenAPI spec file (2.0, 3.0.x, or 3.1.x) in
  YAML or JSON format. Can be a local file path or a remote URL.
- `-o, --output <path>`: Output directory for generated code

### Generation Options

- `--client`: Generate the operation functions for client-side usage (default:
  false)
- `--server`: Generate the operation wrapper functions for server-side usage
  (default: false)
- `--routes`: Generate route metadata only (default: false). Useful when you
  want to generate your own type-safe client or server implementation while
  leveraging the generated schemas and route definitions.
- `--format <mapping>`: Override an OpenAPI `type: string` + `format` mapping
  with a custom imported Zod schema. Syntax:
  `<format>=<module-or-path>[#<export>]`. Repeatable. See
  [String Format Overrides](./schema-generation/string-format-overrides.md).
- `--extra-props <mode>`: Control how Zod schemas handle additional properties.
  Options: `strip` (default), `loose`, `strict`. See
  [Schema Validation Modes](./schema-generation/schema-validation-modes.md) for
  details.

> **Note**: The long-form flags `--generate-client`, `--generate-server`, and
> `--generate-routes` are deprecated in favor of the shorter `--client`,
> `--server`, and `--routes` aliases.

## Overriding OpenAPI String Formats

Use `--format` when a string format in your OpenAPI specification should map to
your own Zod schema instead of the built-in handling.

```bash
npx @apical-ts/craft generate \
  --client \
  --server \
  -i openapi.yaml \
  -o generated \
  --format tax-code=./src/zod/TaxCode.ts \
  --format uuid=@acme/domain-schemas#Uuid
```

This makes the generated schemas import your custom validators and propagates
their types through generated routes, client operations, and server wrappers.

- `--format` is repeatable
- `#<export>` is optional
- project paths must be explicit (`./` or `../`)

For a complete walkthrough, see
[String Format Overrides](./schema-generation/string-format-overrides.md).

## Output Structure

The generated output follows a consistent structure:

```
generated/
├── client/           # Client operation functions (if --client)
├── routes/           # Route metadata (if --routes, --client, or --server)
├── server/           # Server handler wrappers (if --server)
└── schemas/          # Zod schemas and TypeScript types
```

Each directory contains:

- An `index.ts` file that exports all the generated code
- Individual files for each operation or schema
- TypeScript declaration files for full type safety

The output directory will be created if it doesn't exist and existing files will
be overwritten.

## Custom Client or Server Implementation

If you want to build your own type-safe client or server implementation while
leveraging the generated schemas and route metadata, use the `--routes` flag:

```bash
npx @apical-ts/craft generate \
  --routes \
  -i openapi.yaml \
  -o generated
```

This generates:

- **Schemas**: Full Zod v4 schemas with TypeScript type inference
- **Routes**: Route metadata including paths, HTTP methods, parameters, and
  request/response types

You can then build your own client or server using these generated artifacts.
For example, you might want to:

- Create a custom HTTP client with specific retry logic or authentication
- Build a server using a framework not directly supported (e.g., Fastify, Koa,
  Hono)
- Generate GraphQL resolvers or tRPC procedures from REST definitions
- Create mock servers or testing utilities

The route metadata provides all the type information you need, while the schemas
handle runtime validation.

## Formatting Generated Code

For performance reasons, the CLI does not format the generated TypeScript files
by default. To format them you may use [Biome](https://biomejs.dev/) running the
following command in the output directory:

```bash
npx @biomejs/biome format --write .
```

Alternatively, you can use any other slower code formatter of your choice, e.g.

```bash
npx prettier --log-level=silent --write .
```
