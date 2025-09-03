# Conclusion

This project is designed with a clear focus on delivering an exceptional
developer experience and robust type safety. Our core goals are to:

- **Eliminate runtime errors** by leveraging _strong_ TypeScript typing and
  comprehensive support for OpenAPI specs (ie. multiple response types).
- **Offer a developer experience similar to tRPC**, but fully driven by OpenAPI
  specifications—combining the best of both worlds: type safety and open
  standards (works with _external_ specs as well).
- **Generate high-quality, reusable schemas** for both API requests and
  responses, ensuring consistency across your codebase.

During our research, we discovered that many existing tools either lacked
flexibility or forced developers into rigid workflows. By emphasizing
modularity, type safety, and ease of integration, this project aims to bridge
those gaps—empowering TypeScript developers to build reliable, maintainable APIs
with confidence.

## Why @apical-ts/craft Matters

### Developer Experience First

We believe that developer tools should enhance productivity, not hinder it.
@apical-ts/craft is designed to feel natural and intuitive, whether you're
building a client application or implementing server-side validation.

### Type Safety Without Compromise

By leveraging the latest TypeScript features and Zod v4, we provide
comprehensive type safety that catches errors at compile time and runtime,
reducing bugs and improving code quality.

### Performance by Design

The operation-based architecture and modular output ensure that your
applications only include the code they actually use, resulting in smaller
bundles and better performance.

### Future-Proof Architecture

Built on modern standards and best practices, @apical-ts/craft grows with your
application and adapts to changing requirements without forcing major
architectural changes.

## Getting Started

Ready to experience the difference? Get started with @apical-ts/craft:

```bash
npx @apical-ts/craft generate \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o ./generated
```
