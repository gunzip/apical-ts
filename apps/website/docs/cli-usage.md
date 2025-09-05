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
  --generate-server \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This command will:

1. Download the OpenAPI specification from the provided URL
2. Generate Zod schemas for all data models
3. Generate client operation functions (if `--generate-client` is specified)
4. Generate server handler wrappers (if `--generate-server` is specified)
5. Output all generated files to the `generated` directory

## Watch Mode

You can run the CLI in watch mode to automatically regenerate code when your
OpenAPI specification file changes:

```bash
npm install chokidar-cli @apical-ts/craft
npm exec -- chokidar-cli openapi.yaml -c \
  "@apical-ts/craft generate \
  --generate-server \
  --generate-client \
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

- `--generate-client`: Generate the operation functions for client-side usage
  (default: false)
- `--generate-server`: Generate the operation wrapper functions for server-side
  usage (default: false)

## Output Structure

The generated output follows a consistent structure:

```
generated/
├── client/           # Client operation functions (if --generate-client)
├── server/           # Server handler wrappers (if --generate-server)
└── schemas/          # Zod schemas and TypeScript types
```

Each directory contains:

- An `index.ts` file that exports all the generated code
- Individual files for each operation or schema
- TypeScript declaration files for full type safety

The output directory will be created if it doesn't exist and existing files will
be overwritten.

## Formatting Generated Code

For performance reasons, the CLI does not format the generated TypeScript files
by default. To format them you may use [Biome](https://biomejs.dev/) running the
following command in the output directory:

```bash
pnpx @biomejs/biome format --write .
```

Alternatively, you can use any other slower code formatter of your choice, e.g.

```bash
pnpx prettier --log-level=silent --write .
```
