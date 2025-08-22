# Copilot Instructions for TypeScript OpenAPI Generator

## Repository Summary

This repository is an **OpenAPI TypeScript Client Generator** that converts OpenAPI 3.1.0 specifications into fully-typed Zod v4 schemas and type-safe REST API clients. It generates operation-based TypeScript clients with runtime validation capabilities, supporting OpenAPI 2.0, 3.0.x, and 3.1.x specifications.

**Repository Size**: Medium (~33 TypeScript files, ~4,500 lines of code)  
**Project Type**: CLI tool and library for code generation  
**Languages**: TypeScript (ES2022), Node.js  
**Frameworks**: Zod v4 for schema validation, Vitest for testing  
**Target Runtime**: Node.js 20.18.2+

## Build and Validation Instructions

### Prerequisites

- **Node.js**: Version 20.18.2 (specified in `.node-version`)
- **Package Manager**: pnpm 10.14.0+ (ALWAYS use pnpm, not npm)

### Setup Commands

```bash
# Install pnpm if not available
npm install -g pnpm@10.14.0

# Install dependencies (ALWAYS run this first)
pnpm install
```

### Build Process

```bash
# Build the project (compiles TypeScript to dist/)
pnpm run build
# Build time: ~2 seconds
```

**Preconditions**:

- Dependencies must be installed with `pnpm install`
- No linting is required before build

**Postconditions**:

- Creates `dist/` directory with compiled JavaScript
- All TypeScript files compiled to ES2022 modules

### Testing

```bash
# Run all tests
pnpm test
# Test time: ~1 second (58 tests across 5 files)
```

**Test Configuration**: Uses Vitest with Node.js environment, tests located in `src/tests/`

### CLI Usage

```bash
# Generate schemas only
pnpm start generate -i <openapi-spec> -o <output-dir>

# Generate schemas and client
pnpm start generate -i <openapi-spec> -o <output-dir> --generate-client

# Example with provided test files
pnpm start generate -i test.yaml -o ./generated --generate-client
```

**Note**: Use single command format (`pnpm start generate`) not double-dash format (`pnpm start -- generate`)

### Programmatic Usage

```typescript
import { generate } from "./src/core-generator/index.js";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

### Validation Steps

1. **Always run `pnpm install` before any other command**
2. **Build validation**: `pnpm run build` should complete without errors
3. **Test validation**: `pnpm test` should pass all 58 tests
4. **CLI validation**: Test generation with `test.yaml` or `definitions.yaml`

### Known Issues and Workarounds

- **No linting configured**: There are no ESLint rules, rely on TypeScript compiler errors
- **No format script**: Prettier is available as dependency but no npm script exists
- **CLI parsing**: Use `pnpm start generate` (not `pnpm start -- generate`)
- **Error handling**: Generator is robust and continues processing even with invalid input files

## Project Layout and Architecture

### Root Directory Structure

```
├── .github/instructions/           # Copilot test guidelines
├── src/                           # Source code
├── dist/                          # Build output (generated)
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts              # Test configuration
├── .node-version                  # Node.js version requirement
├── pnpm-lock.yaml                # pnpm lockfile
├── test.yaml                      # Sample OpenAPI spec for testing
├── definitions.yaml               # Sample schema definitions
└── README.md                      # Comprehensive documentation
```

### Source Code Architecture (`src/`)

**Main Entry Point**: `src/index.ts`

- CLI interface using Commander.js
- Exports `generate` function for programmatic usage

**Core Generator** (`src/core-generator/`):

- `index.ts`: Main orchestration and generation logic
- `parser.ts`: OpenAPI specification parsing
- `converter.ts`: OpenAPI version conversion
- `file-writer.ts`: File writing utilities and formatting

**Client Generator** (`src/client-generator/`):

- `index.ts`: Operation client generation orchestration
- `operation-function-generator.ts`: Individual operation function generation
- `parameters.ts`: Parameter handling and validation
- `responses.ts`: Response type generation
- `code-generation.ts`: Core code generation utilities
- `config-generator.ts`: Configuration types and globals
- `operation-extractor.ts`: OpenAPI metadata extraction
- `file-writer.ts`: Operation file writing
- Detailed module documentation in `src/client-generator/README.md`

**Schema Generator** (`src/schema-generator/`):

- `index.ts`: Main schema generation exports
- `schema-converter.ts`: OpenAPI to Zod schema conversion
- `union-types.ts`: Union and discriminated union handling
- `utils.ts`: Schema utilities and type inference
- Generates Zod v4 schemas for runtime validation

**Operation ID Generator** (`src/operation-id-generator/`):

- Generates operation IDs for OpenAPI specs that lack them

**Tests** (`src/tests/`):

- Unit tests for core functionality
- Use Vitest with descriptive test names
- Follow Arrange-Act-Assert pattern

### Configuration Files

**TypeScript Configuration** (`tsconfig.json`):

- Target: ES2022, Module: ESNext
- Output: `./dist`, Root: `./src`
- Strict mode enabled

**Test Configuration** (`vitest.config.ts`):

- Node.js environment, globals enabled
- Includes: `src/tests/**/*.test.ts`
- Coverage: text, json, html reporters

**Package Configuration** (`package.json`):

- Type: "module" (ES modules)
- Main scripts: build, start, test
- Dependencies: Zod, OpenAPI3-TS, Commander, etc.

### Dependencies Overview

**Runtime Dependencies**:

- `zod ^4.0.0`: Schema validation and type generation
- `openapi3-ts ^4.3.0`: OpenAPI TypeScript types
- `commander ^14.0.0`: CLI framework
- `@apidevtools/json-schema-ref-parser`: Reference resolution
- `js-yaml`, `swagger2openapi`: Format support
- `p-limit`: Concurrency control

**Development Dependencies**:

- `typescript ^5.4.5`: TypeScript compiler
- `vitest ^1.6.0`: Test framework
- `prettier ^3.2.5`: Code formatting
- `@types/*`: TypeScript definitions

### Key Architectural Patterns

1. **Modular Design**: Each generator has clear responsibilities
2. **Pipeline Architecture**: Parse → Convert → Generate → Write
3. **Concurrent Processing**: Uses p-limit for parallel schema generation
4. **Type Safety**: Full TypeScript coverage with strict mode
5. **Error Resilience**: Graceful fallbacks for malformed inputs

### Generated Output Structure

```
<output-dir>/
├── package.json              # Generated package metadata
├── operations/               # Client operations (if --generate-client)
│   ├── index.ts             # Operation exports and configuration
│   ├── config.ts            # Global configuration types
│   └── <operationId>.ts     # Individual operation functions
└── schemas/                  # Zod schemas
    ├── <SchemaName>.ts      # Individual schema files
    └── index.ts             # Schema exports
```

### Validation Pipeline

1. **Input validation**: OpenAPI spec parsing and reference resolution
2. **Schema generation**: Concurrent Zod schema creation with type safety
3. **Client generation**: Operation function generation with proper imports
4. **Output validation**: File writing with Prettier formatting

### Common Development Workflows

**Adding New Features**:

1. Run `pnpm install` and `pnpm run build` to ensure clean state
2. Add tests in `src/tests/` following existing patterns
3. Implement functionality in appropriate module
4. Run `pnpm test` to validate changes
5. Test CLI with sample files: `pnpm start generate -i test.yaml -o /tmp/test`

**Debugging Issues**:

1. Use sample files `test.yaml` and `definitions.yaml` for testing
2. Check build output in `dist/` directory
3. Verify generated output structure matches expected format
4. Test both schema-only and full client generation modes

## Trust These Instructions

These instructions are comprehensive and tested. Only search for additional information if:

- The provided build/test commands fail unexpectedly
- You encounter dependency issues not covered here
- The project structure has significantly changed from what's documented

Always prefer the documented commands and patterns over exploration when implementing changes.
