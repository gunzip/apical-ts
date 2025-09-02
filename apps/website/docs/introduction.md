# Introduction

Effortlessly turn your OpenAPI specifications into **fully-typed Zod v4
schemas** ready for runtime (client or server) validation and TypeScript
development. 🚀

Need a **client**? Instantly generate a type-safe, low-footprint,
operation-based REST API client alongside your schemas.

Need to **validate server requests and return typed responses**? 🛡️ We've got
you covered with built-in support for request and response validation using Zod
schemas.

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

Curious why you should choose this generator over others? See our comparison
with alternative libraries for more details or check our comprehensive feature
list for more information.

## Quick Start

Get started with @apical-ts/craft in just a few commands:

```bash
# Generate schemas and client from an OpenAPI specification
pnpx @apical-ts/craft generate \
  --generate-server \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This will create:

- **`server/`** - Typed handler wrappers
- **`client/`** - Individual operation functions for each API endpoint
- **`schemas/`** - Zod schemas and TypeScript types

## Key Features

- 🎯 **Operation-based architecture** - Each API operation becomes a standalone,
  typed function
- 🛡️ **Runtime validation** - Built on Zod v4 for robust type safety and
  validation
- 🔄 **Multiple content types** - Full support for JSON, XML, form data, and
  more
- 📝 **OpenAPI compatibility** - Supports OpenAPI 2.0, 3.0.x, and 3.1.x
  specifications
- 🚀 **Zero dependencies** - Generated code has minimal runtime dependencies
- 🧪 **Self-contained schemas** - Generated Zod schemas can be used
  independently
- ✅ **Comprehensive testing** - Thoroughly tested with a full test suite

## Next Steps

- Learn how to use the [CLI tool](cli-usage)
- Explore [programmatic usage](programmatic-usage) for build integrations
- Dive into [client generation](client-generation/define-configuration) to build
  type-safe API clients
- Check out our comprehensive feature documentation for a complete overview
