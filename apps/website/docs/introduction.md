---
id: introduction
title: Introduction
description:
  Learn how @apical-ts/craft transforms OpenAPI specifications into fully-typed
  Zod v4 schemas and type-safe REST API clients. Generate robust TypeScript code
  with runtime validation.
keywords:
  [
    OpenAPI,
    TypeScript,
    Zod,
    code generation,
    API client,
    type safety,
    schema validation,
    openapi-zod-client alternative,
  ]
---

# Introduction

@apical-ts/craft effortlessly turn your OpenAPI specifications into
**fully-typed Zod v4 schemas** ready for runtime (client or server) validation
and TypeScript development.

You may ask: why another Typescript OpenAPI generator? The answer lies in full
commitment to **strict type safety**. With @apical-ts/craft, you get:

- 🎯 **Operation-based architecture** – Each API operation is a standalone,
  fully-typed function
- 🛡️ **Runtime validation** – Zod v4 ensures robust type safety for requests and
  responses
- 🔄 **Multiple content types** – Supports JSON, XML, form data, and more
- 📝 **OpenAPI compatibility** – Works with OpenAPI 2.0, 3.0.x, and 3.1.x specs
- 🚀 **Minimal dependencies** – Generated code is lightweight and easy to
  integrate
- 🧪 **Self-contained schemas** – Zod schemas are generated for independent use
- 🛑 **No runtime exceptions** – Client operations are safe and predictable
- 🙅‍♂️ **No accidental undefined access** – Strict typings prevent undefined
  property access
- 🦄 **Discriminated unions** – Polymorphic schemas are handled with precise
  union types
- 🎉 **Multiple success responses** – Handles multiple success codes (e.g.,
  `200`, `201`) with payloads
- 🌐 **Wildcard response support** – Supports wildcard status codes (e.g.,
  `2XX`, `4XX`)
- 🔁 **Circular reference support** – Handles circular schema references
  gracefully without overflows
- 🐞 **Rich error reporting** – Debug operations easily with detailed errors

## Quick Start

Get started with @apical-ts/craft in just a few commands:

```bash
# Generate schemas and client from an OpenAPI specification
npx @apical-ts/craft generate \
  --server \
  --client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated

# Install runtime dependencies for the generated code
cd generated
npm install
```

This will create:

- **`server/`** - Typed handler wrappers
- **`client/`** - Individual operation functions for each API endpoint
- **`schemas/`** - Zod schemas and TypeScript types

:::note

The generated client and server code requires `zod` as a runtime dependency for
schema validation. Make sure to install it in your project.

:::

## Project Status & Versioning

@apical-ts/craft is under active development. In accordance with the
[Semantic Versioning](https://semver.org/) specification, the project will begin
strict semantic versioning starting from version `1.0.0`. Until then, breaking
changes may occur in minor releases. To avoid unexpected breaking changes, it is
recommended to **pin a specific version** when using the CLI or as a dependency.

For example, when using `npx`:

```bash
npx @apical-ts/craft@0.3.1 generate ...
```

Replace `0.3.1` with the desired version. This ensures consistent behavior even
as the project evolves.

## Live Demo

Explore the live demo to see @apical-ts/craft in action:

<iframe style={{ width: "100%", minHeight: "600px", height: "600px" }}
src="https://stackblitz.com/edit/apical-craft-example?ctl=1&embed=1&file=src%2Fclient.ts&view=editor&theme=dark"></iframe>

<!-- ![Demo of OpenAPI TypeScript Generator](../static/img/demo.gif) -->

## Why another generator?

We all like the developer experience of [tRPC](https://trpc.io/), but not always
we're in control of the backend. OpenAPI specifications provide a powerful way
to define your API contracts, and with @apical-ts/craft, you can easily generate
TypeScript code that strictly adheres to those contracts, all while enjoying a
seamless developer experience.

Many existing generators lack flexibility and strong type safety. Most do not
support multiple success responses or multiple content types, and their typings
are often too loose—making it easy to accidentally access undefined properties.
With **stricter** guardrails, @apical-ts/craft helps developers (and Gen-AIs)
build more robust and reliable implementations.

Curious why you should choose this generator over others? See our
[comparison with alternative libraries](./comparison-with-alternative-libraries.md)
for more details or check our comprehensive feature list for more information.

## Next Steps

- Learn how to use the [CLI tool](cli-usage)
- Dive into [client generation](client-generation/define-configuration) to build
  type-safe API clients
- Check out our comprehensive feature documentation for a complete overview
