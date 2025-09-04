# Comparison with Alternative Libraries

This document provides a comparison between `@apical-ts/craft` and other popular
TypeScript OpenAPI client generators.

## @apical-ts/craft

**Strengths:**

- Modular, tree-shakable output
- Exact typings with Zod v4
- Minimal runtime dependencies (only Zod v4)
- Operation-based architecture, easy to debug
- Multiple success (2xx) responses handling
- Multiple content types and response handling
- Server-side validation support

**Limitations:**

- Project is still in early development
- Still untested on real-world scenarios
- No community

**Best for:** Projects requiring maximum type safety, performance optimization,
and flexibility

## @heyapi/openapi-ts

While [heyapi's openapi-ts](https://github.com/hey-api/openapi-ts) is one of the
most popular and effective tools for generating TypeScript clients from OpenAPI
specifications, it does have certain limitations. These limitations motivated
the development of this alternative to address additional use cases and
requirements.

**Strengths:**

- Minimal dependencies
- Good schema quality
- Zod v4 support
- Very strong community

**Limitations:**

- Does not discriminate by status code
- Weak multiple success response support
- No multiple content type support
- Throws unknown exceptions
- Monolithic output

**Best for:** Simple projects with basic requirements

## Massimo

Massimo is the new kid on the block, offering a fresh approach to generating
TypeScript clients from OpenAPI specifications. While it brings some innovative
ideas to the table, at the time of writing, it also has its own set of
limitations.

One notable aspect of Massimo is that, aside from @apical-ts/craft, it is the
only client generator I have found that produces discriminated unions for
response payloads based on status codes. In my opinion, this is the minimum
requirement for a robust client generator.

**Strengths:**

- Highly optimized for performance on Node.js backends
- Supports typed payloads with discriminated unions
- Solid AJV validation support (backend only)

**Limitations:**

- The frontend-generated client lacks payload validation
- Invalid requests return a generic error without a reason
- Typings don't distinguish payloads by content type
- For multiple success responses, it types only the first one found (200).
- Does not generate runtime schemas for validation, only types
- Throws exceptions

**Best for:** Node.js backend applications where performance is critical

## openapi-zod-client

[openapi-zod-client](https://github.com/astahmer/openapi-zod-client) is a
straightforward tool for generating TypeScript clients. However, it has several
limitations that may affect its suitability for more complex projects.

**Strengths:**

- Very simple to use

**Limitations:**

- Loose schema quality
- Throws unknown exceptions
- Cannot handle multiple success responses
- Project looks unmaintained
- Depends on zodios (which looks unmaintained)
- You cannot access response status codes
- No security header support
- Monolithic output
- No Zod v4 support

**Best for:** N/A

## When to Consider @apical-ts/craft?

1. **Large APIs** with many operations where tree-shaking provides benefits
1. **Complex APIs** with multiple response types and content types
1. **Full-stack applications** needing both client and server validation
1. **Enterprise applications** requiring comprehensive type safety

## When to Consider Alternatives

1. **Simple APIs** with basic requirements might work well with lighter
   alternatives
1. **Rapid prototyping** where setup time is more important than optimization
1. **Community support** is a priority
