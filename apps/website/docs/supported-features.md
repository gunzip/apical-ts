---
id: supported-features
title: Supported Features
description:
  Comprehensive list of @apical-ts/craft features including OpenAPI version
  support, type safety, validation, authentication, and performance
  optimizations.
keywords:
  [
    OpenAPI features,
    TypeScript features,
    Zod validation,
    API client features,
    schema generation,
    type safety,
  ]
---

# Supported Features

@apical-ts/craft provides comprehensive support for modern OpenAPI
specifications with a focus on type safety, performance, and developer
experience.

## Core Features

- 🚀 **Multi-version support**: Accepts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x
  specifications
- 🛠️ **Operation-based client generation**: Generates one function per
  operation, with strong typing and per-operation configuration—no need for
  blacklisting operations you don't need!
- 🛡️ **Zod v4 runtime validation (opt-in or automatic)**: Invoke
  `response.parse()` manually, or enable `forceValidation: true` at runtime for
  automatic validation
- 📦 **Small footprint**: Generates each operation and schema/type in its own
  file for maximum tree-shaking and modularity
- 🚀 **Fast code generation**: Optimized for quick generation times, even with
  large specs, sync types and changes in real-time
- 🔒 **Type-safe configuration**: Immutable global defaults, with the ability to
  override config per operation
- 🔑 **Flexible authentication**: Supports OpenAPI security schemes (Bearer, API
  Key, etc.), with dynamic header/query configuration
- 🧩 **Discriminated union response types**: Each operation returns a
  discriminated union of possible responses, enabling exhaustive handling
- ⚠️ **Comprehensive error handling**: No exceptions thrown - all errors
  (network, parsing, unexpected responses) are returned as typed error objects
  with detailed context
- 📁 **File upload/download & binary support**: Handles `multipart/form-data`
  and `application/octet-stream` uploads and downloads
- 📦 **ESM output**: Generated code is ESM-first
- 🪶 **Minimal dependencies**: No runtime dependencies except Zod; works in
  Node.js and browsers
- 🧪 **Self-contained Zod schemas**: Generated schemas can be used independently
  for validation (e.g., in forms) and server-side logic
- 🔄 **Automatic OpenAPI normalization**: All input specs are normalized to
  OpenAPI 3.1.0 before code generation
- ✅ **Comprehensive test suite**: Project includes Vitest-based tests for all
  major features

## Advanced Features

### Multiple Response Types

- Full support for multiple success responses with different status codes
- Each response type is properly typed and validated
- Discriminated unions enable exhaustive pattern matching

### Multiple Content Types

- Support for JSON, XML, form data, and custom content types
- Automatic content type detection and parsing
- Custom deserializers for specific content types

### Security & Authentication

- Support for all OpenAPI security schemes
- Bearer tokens, API keys, custom headers
- Per-operation security configuration
- Dynamic authentication header generation

### Validation & Error Handling

- Request validation using generated Zod schemas
- Response validation (opt-in or automatic)
- Comprehensive error types with context
- Validation error details with field-level information

### File Handling

- File upload support with `multipart/form-data`
- Binary file downloads with proper content types
- Streaming support for large files
- Custom file handling configuration

### Server-Side Features

- Request validation for server handlers
- Response validation before sending
- Type-safe handler context
- Framework-agnostic handler wrappers

### Performance & Optimization

- Tree-shaking friendly modular output
- Minimal runtime overhead
- Fast generation even for large specifications
- Optimized for both development and production use

## Framework Compatibility

### Browsers

- Full browser support with standard fetch API
- Works with all modern bundlers (Webpack, Vite, etc.)
- TypeScript and JavaScript support

### Node.js

- Full Node.js support (requires Node.js 20+)
- Works with popular frameworks (Express, Fastify, etc.)
- Custom fetch implementations supported
