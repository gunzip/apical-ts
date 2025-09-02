# Client Generator Module

## Module Structure

### Core Types (`types.ts`)

Contains all TypeScript interfaces and type definitions used throughout the
client generator.

### Utilities (`utils.ts`)

Helper functions for string manipulation, path generation, and content type
detection.

### Parameter Handling (`parameters.ts`)

Functions for extracting, processing, and grouping OpenAPI parameters:

- Parameter reference resolution
- Parameter grouping by location (path, query, header)
- Parameter interface generation
- Destructured parameter signature building

### Response Handling (`responses.ts`)

Functions for processing OpenAPI responses:

- Response handler generation
- Return type determination using discriminated unions
- Content type detection

### Request Body Processing (`request-body.ts`)

Functions for handling request bodies:

- Content type selection and prioritization
- Type resolution for request bodies
- Request body code generation for different content types

### Security Handling (`security.ts`)

Functions for processing authentication and security:

- Global auth header extraction
- Operation-specific security scheme processing
- Security header generation

### Code Generation (`code-generation.ts`)

Core code generation utilities:

- Function body generation
- HTTP client code generation

### Configuration Generator (`config-generator.ts`)

Generates configuration files and types:

- Global configuration interface
- API response types
- Utility functions for response handling

### Operation Extraction (`operation-extractor.ts`)

Functions for parsing OpenAPI documents:

- Base URL extraction
- Operation metadata extraction

### Operation Function Generator (`operation-function-generator.ts`)

Main function for generating individual operation functions:

- Combines all other modules to generate complete TypeScript functions

### File Writer (`file-writer.ts`)

File system operations:

- Individual operation file writing
- Configuration file writing
- Index file generation
- Directory creation

### Main Entry Point (`index.ts`)

Orchestrates the entire client generation process and provides the main public
API.

## Usage

The main entry point is `generateOperations()` function exported from
`index.ts`:

```typescript
import { generateOperations } from "./client-generator/index.js";

await generateOperations(openApiDoc, outputDirectory);
```

This maintains the same API as the original monolithic module while providing a
much cleaner internal structure.
