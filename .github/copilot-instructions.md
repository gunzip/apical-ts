# Copilot Instructions for TypeScript

## Repository Summary

This repository is an **OpenAPI TypeScript Client Generator** that converts
OpenAPI specifications into fully-typed Zod v4 schemas and type-safe REST API
clients. It generates operation-based TypeScript clients with runtime validation
capabilities, supporting OpenAPI 2.0, 3.0.x, and 3.1.x specifications.

**Repository Size**: Medium (~33 TypeScript files, ~4,500 lines of code)  
**Project Type**: CLI tool and library for code generation  
**Languages**: TypeScript (ES2022), Node.js  
**Frameworks**: Zod v4 for schema validation, Vitest for testing  
**Target Runtime**: Node.js 22+

## Build and Validation Instructions

### Prerequisites

- **Node.js**: Version 22+ (specified in `.node-version`)
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

### pnpm Tasks

- `pnpm run build`: Build the project using tsup (compiles TypeScript to dist/
  without type checking)
- `pnpm run build:docs`: Generate documentation by embedding code in README.md
- `pnpm run lint`: Run eslint with autofix on `src/`
- `pnpm run lint:check`: Run eslint on `src/` (no autofix)
- `pnpm run format`: Format all files using Prettier (writes changes)
- `pnpm run format:check`: Check formatting using Prettier (no changes written)
- `pnpm run typecheck`: Run TypeScript type checking only (`tsc --noEmit`)
- `pnpm run test`: Run all tests with Vitest
- `pnpm run test:coverage`: Run tests with coverage report
- `pnpm run start`: Run the CLI from `dist/index.js`
- `pnpm run generate`: Generate client and server from test fixtures
- `pnpm run prepublishOnly`: Build docs and project before publishing
- `pnpm run release:patch`: Bump patch version and push
- `pnpm run release:minor`: Bump minor version and push
- `pnpm run release:major`: Bump major version and push

#### Additional VS Code Tasks

The workspace provides the following VS Code tasks for common workflows:

- **TypeScript Build**: `pnpm run build`
- **Run Tests**: `pnpm test`
- **Test OpenAPI 3.1 Generation**: `pnpm generate`

> **Note:** Always run `pnpm install` before any other command. Use
> `pnpm run typecheck` for type validation, and run `pnpm run lint` and
> `pnpm run format` before committing code.

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
```

**Test Configuration**: Uses Vitest with Node.js environment, tests located in
`tests/`

### CLI Usage

```bash
# Generate schemas only
pnpm start generate -i <openapi-spec> -o <output-dir>

# Generate schemas and client
pnpm start generate -i <openapi-spec> -o <output-dir> --generate-client

# Example with provided test files
pnpm start generate -i test.yaml -o ./generated --generate-client
```

**Note**: Use single command format (`pnpm start generate`) not double-dash
format (`pnpm start -- generate`)

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
3. **Test validation**: `pnpm test` should pass all tests
4. **CLI validation**: Test generation with `test.yaml` or `definitions.yaml`
5. **File Formatting**: `pnpm format:check`must pass
6. **Linting**: `pnpm lint:check`must pass

### Known Issues and Workarounds

- **CLI parsing**: Use `pnpm start generate` (not `pnpm start -- generate`)
- **Error handling**: Generator is robust and continues processing even with
  invalid input files

## Monorepo Layout and Architecture

### Top-Level Directory Structure

```
├── apps/                         # Main packages and applications
│   ├── craft/                    # Core OpenAPI generator package
│   │   ├── src/                  # Source code (client-generator, core-generator, etc.)
│   │   ├── tests/                # Unit and integration tests
│   │   ├── package.json          # Package manifest for craft
│   │   └── ...                   # Build, config, and docs
│   └── examples/                 # Example OpenAPI specs, generated output, and usage
│       ├── generated/            # Example generated client/server/schemas
│       ├── client-examples/      # Example client usage
│       ├── server-examples/      # Example server usage
│       └── ...                   # Benchmarks, fixtures, etc.
├── website/                      # Docusaurus documentation site
├── local/                        # Local experiments, generated files, and scratch
├── .github/                      # GitHub workflows and Copilot instructions
├── package.json                  # Monorepo root manifest (scripts, workspaces)
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── pnpm-lock.yaml                # pnpm lockfile
├── README.md                     # Monorepo overview and usage
├── ...                           # Miscellaneous config, docs, and assets
```

### Key Packages

- `apps/craft/`: Main OpenAPI TypeScript generator (CLI and library)
- `apps/examples/`: Example OpenAPI specs, generated output, and usage
- `apps/website/`: Documentation site (Docusaurus)
- `local/`: Local development, generated files, and scratch

### Top-Level (p)npm Tasks

All commands should be run from the monorepo root unless otherwise noted. Use
`pnpm` for all package management and scripts.

#### Install Dependencies

```bash
pnpm install
```

#### Build All Packages

```bash
pnpm build
# or to build a specific package:
pnpm --filter craft build
```

#### Run All Tests

```bash
pnpm test
# or to test a specific package:
pnpm --filter craft test
```

#### Lint and Format

```bash
pnpm lint
pnpm format
```

#### Generate Example Output

```bash
pnpm --filter craft generate
# or use the CLI directly:
pnpx @apical-ts/craft generate -i <spec> -o <output> --generate-client
```

#### Other Useful Tasks

- `pnpm typecheck` – TypeScript type checking for all packages
- `pnpm build:docs` – Build documentation (Docusaurus)
- `pnpm run start` – Run the CLI (see package-level README for details)

> **Tip:** Use `pnpm --filter <package>` to run scripts in a specific workspace
> package.

### Source Code Architecture (`apps/craft/`)

**Main Entry Point**: `apps/craft/src/index.ts`

- CLI interface using Commander.js
- Exports `generate` function for programmatic usage

**Core Generator** (`apps/craft/src/core-generator/`):

- `index.ts`: Main orchestration and generation logic
- `parser.ts`: OpenAPI specification parsing
- `converter.ts`: OpenAPI version conversion
- `file-writer.ts`: File writing utilities and formatting

**Client Generator** (`apps/craft/src/client-generator/`):

- `index.ts`: Operation client generation orchestration
- `operation-function-generator.ts`: Individual operation function generation
- `parameters.ts`: Parameter handling and validation
- `responses.ts`: Response type generation
- `code-generation.ts`: Core code generation utilities
- `config-generator.ts`: Configuration types and globals
- `operation-extractor.ts`: OpenAPI metadata extraction
- `file-writer.ts`: Operation file writing
- Detailed module documentation in `apps/craft/src/client-generator/README.md`

**Schema Generator** (`apps/craft/src/schema-generator/`):

- `index.ts`: Main schema generation exports
- `schema-converter.ts`: OpenAPI to Zod schema conversion
- `union-types.ts`: Union and discriminated union handling
- `utils.ts`: Schema utilities and type inference
- Generates Zod v4 schemas for runtime validation

**Operation ID Generator** (`apps/craft/src/operation-id-generator/`):

- Generates operation IDs for OpenAPI specs that lack them

**Tests** (`apps/craft/tests/`):

- Unit tests for core functionality and all generators
- Use Vitest with descriptive test names
- Follow Arrange-Act-Assert pattern
- Test helpers and fixtures in `apps/craft/tests/integrations/fixtures/`

### Configuration Files

**TypeScript Configuration** (`tsconfig.json`):

- Target: ES2022, Module: ESNext
- Output: `./dist`, Root: `./src`
- Strict mode enabled

**Test Configuration** (`vitest.config.ts`):

- Node.js environment, globals enabled
- Includes: `tests/**/*.test.ts`
- Coverage: text, json, html reporters, include `src/**/*`, exclude
  `src/tests/**/*`

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
├── package.json                  # Generated package metadata
├── operations/                   # Client operations (if --generate-client)
│   ├── index.ts                  # Operation exports and configuration
│   ├── config.ts                 # Global configuration types
│   └── <operationId>.ts          # Individual operation functions
└── schemas/                      # Zod schemas
  ├── <SchemaName>.ts           # Individual schema files
  └── index.ts                  # Schema exports
```

### Validation Pipeline

1. **Input validation**: OpenAPI spec parsing and reference resolution
2. **Schema generation**: Concurrent Zod schema creation with type safety
3. **Client generation**: Operation function generation with proper imports
4. **Output validation**: File writing with Prettier formatting

### Common Development Workflows

**Adding New Features**:

1. Run `pnpm install` and `pnpm run build` to ensure clean state
2. Add tests in `tests/` following existing patterns
3. Implement functionality in appropriate module
4. Run `pnpm test` to validate changes
5. Test CLI with sample files: `pnpm start generate -i test.yaml -o /tmp/test`

**Debugging Issues**:

1. Use sample files `test.yaml` and `definitions.yaml` for testing
2. Check build output in `dist/` directory
3. Verify generated output structure matches expected format
4. Test both schema-only and full client generation modes

## Trust These Instructions

These instructions are comprehensive and tested. Only search for additional
information if:

- The provided build/test commands fail unexpectedly
- You encounter dependency issues not covered here
- The project structure has significantly changed from what's documented

Always prefer the documented commands and patterns over exploration when
implementing changes.
