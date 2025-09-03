# Comparison with Alternative Libraries

After
[evaluating several libraries](https://github.com/gunzip/openapi-generator-benchmark),
we found that each has its
[strengths and weaknesses](https://pagopa.github.io/dx/blog/typescript-openapi-generators-0.1-alpha),
but ultimately, we chose to build this project to address specific needs and use
cases.

Here is a comparison of the key features and limitations of each library.

| Feature / Limitation           |          @apical-ts/craft           |        openapi-codegen-ts        | openapi-zod-client |     openapi-ts     |
| ------------------------------ | :---------------------------------: | :------------------------------: | :----------------: | :----------------: |
| **Output structure**           |               Modular               |            Monolithic            |     Monolithic     |     Monolithic     |
| **Dependency footprint**       |         Minimal (Zod only)          | io-ts, @pagopa/ts-commons, fp-ts |  zodios + others   | Minimal (Zod only) |
| **Runtime validation**         |               Zod v4                |              io-ts               |       Zod v3       |       Zod v4       |
| **OpenAPI version support**    | 2.0, 3.0.x, 3.1.x (auto-normalized) |            2.0, 3.0.x            |    3.0.x, 3.1.x    |    3.0.x, 3.1.x    |
| **Error handling**             |           Strongly Typed            |        Typed, exhaustive         |       Basic        |       Basic        |
| **Generation Speed**           |               Faster                |        Slow on big specs         |        Fast        |        Fast        |
| **Schema Quality**             |              Very good              |            Very good             |       Loose        |        Good        |
| **Multiple success responses** |                 ✅                  |                ✅                |         ❌         |         ❌         |
| **Multiple content types**     |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Security header support**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File download response**     |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **Tree-shaking friendly**      |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Per-operation overrides**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File upload support**        |                 ✅                  |                ✅                |         ✅         |         ✅         |
| **Server Validation**          |                 ✅                  |                ❌                |         ❌         |         ❌         |

## Alternative Libraries

- https://github.com/astahmer/openapi-zod-client
- https://github.com/pagopa/openapi-codegen-ts
- https://github.com/hey-api/openapi-ts

## Detailed Comparison

### @apical-ts/craft

**Strengths:**

- Modular, tree-shakable output
- Comprehensive OpenAPI support (2.0, 3.0.x, 3.1.x)
- Strong typing with Zod v4
- Minimal runtime dependencies
- Operation-based architecture
- Multiple success (2xx) responses handling
- Multiple content types and response handling
- Server-side validation support

**Limitations:**

- Project is still in early development
- Still untested on real-world scenarios
- No community

**Best for:** Projects requiring maximum type safety, performance optimization,
and flexibility

### openapi-codegen-ts

**Strengths:**

- Very good schema quality
- Comprehensive type coverage
- Exhaustive error handling

**Limitations:**

- Monolithic output (no tree-shaking)
- Heavy dependency footprint
- Slower generation on large specs
- Limited content type support

**Best for:** Projects where bundle size is not a concern and you need io-ts
integration

### openapi-zod-client

**Strengths:**

- Very simple to use
- Good for simple use cases

**Limitations:**

- Loose schema quality
- Throws unknown exceptions
- Project looks unmaintained
- Limited response type support
- No security header support
- Monolithic output

**Best for:** Simple projects with basic OpenAPI specs

### openapi-ts

While heyapi's openapi-ts is one of the most popular and effective tools for
generating TypeScript clients from OpenAPI specifications, it does have certain
limitations. These limitations motivated the development of this alternative to
address additional use cases and requirements.

**Strengths:**

- Minimal dependencies
- Good schema quality
- Zod v4 support
- Very strong community

**Limitations:**

- Limited response type support
- No multiple content type support
- Weak multiple success response support
- Monolithic output

**Best for:** Projects needing basic client generation with minimal setup

## Why Choose @apical-ts/craft?

### When @apical-ts/craft is the Best Choice

1. **Performance-critical applications** where bundle size matters
2. **Large APIs** with many operations where tree-shaking provides significant
   benefits
3. **Complex APIs** with multiple response types and content types
4. **Full-stack applications** needing both client and server validation
5. **Enterprise applications** requiring comprehensive type safety
6. **Modern development workflows** leveraging ES modules and build optimization

### When to Consider Alternatives

1. **Simple APIs** with basic requirements might work well with lighter
   alternatives
2. **Legacy projects** already using io-ts might benefit from openapi-codegen-ts
3. **Rapid prototyping** where setup time is more important than optimization

## Feature Matrix

| Use Case            | @apical-ts/craft | openapi-codegen-ts | openapi-zod-client | openapi-ts |
| ------------------- | :--------------: | :----------------: | :----------------: | :--------: |
| Large APIs          |   ✅ Excellent   |      ⚠️ Slow       |      ⚠️ Basic      |  ⚠️ Basic  |
| Bundle optimization |   ✅ Excellent   |      ❌ Poor       |      ❌ Poor       |  ⚠️ Basic  |
| Type safety         |   ✅ Excellent   |    ✅ Excellent    |      ⚠️ Good       |  ✅ Good   |
| Server validation   |      ✅ Yes      |       ❌ No        |       ❌ No        |   ✅ Yes   |
| Multiple responses  |      ✅ Yes      |       ✅ Yes       |       ❌ No        |  ⚠️ Basic  |
| File handling       |   ✅ Excellent   |      ✅ Good       |      ⚠️ Basic      |  ✅ Good   |
| Setup complexity    |   ⚠️ Moderate    |    ⚠️ Moderate     |     ✅ Simple      | ✅ Simple  |

The choice of generator depends on your specific requirements, but
@apical-ts/craft excels in scenarios requiring high performance, comprehensive
type safety, and modern development practices.
