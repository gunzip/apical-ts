# Client Generator Templates

This directory contains TypeScript template modules used by the OpenAPI
TypeScript Client Generator to render operation-based API clients. Each file is
responsible for generating a specific aspect of the client code.

## File Overview

- **config-templates.ts**: Renders configuration types, interfaces, and utility
  functions for the generated client.
- **content-type-templates.ts**: Handles code generation for request content
  types (e.g., JSON, form data).
- **function-body-templates.ts**: Generates the main body of operation
  functions, including request construction and parameter handling.
- **operation-templates.ts**: Orchestrates the rendering of complete operation
  functions, including type aliases and parameter declarations.
- **parameter-templates.ts**: Generates code for operation parameters (path,
  query, header), including destructuring and interface types.
- **request-body-templates.ts**: Handles request body code generation for
  different content types.
- **response-templates.ts**: Generates response handler code and response type
  mappings.
- **security-templates.ts**: Handles security and authentication header code
  generation.

## Usage

These templates are imported and composed by the client generator modules to
produce fully-typed, Zod-validated TypeScript clients from OpenAPI
specifications.
