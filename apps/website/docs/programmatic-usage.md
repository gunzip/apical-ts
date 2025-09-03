# Programmatic Usage

In addition to the CLI, @apical-ts/craft provides a programmatic API that allows
you to integrate code generation directly into your build processes, scripts, or
applications.

## Installation

First, install the package as a dependency:

```bash
npm install @apical-ts/craft
# or
pnpm add @apical-ts/craft
# or
yarn add @apical-ts/craft
```

## Basic Usage

Import and use the `generate` function:

```typescript
import { generate } from "@apical-ts/craft";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

## Configuration Options

The `generate` function accepts a configuration object with the following
options:

### Required Options

- **`input`** (`string`): Path to the OpenAPI specification file or URL
- **`output`** (`string`): Output directory for generated code

### Optional Options

- **`generateClient`** (`boolean`): Generate client operation functions
  (default: `false`)
- **`generateServer`** (`boolean`): Generate server handler wrappers (default:
  `false`)

## Error Handling

The `generate` function throws errors for various failure conditions:

```typescript
import { generate } from "@apical-ts/craft";

try {
  await generate({
    input: "./openapi.yaml",
    output: "./generated",
    generateClient: true,
  });
  console.log("Generation completed successfully!");
} catch (error) {
  console.error("Generation failed:", error.message);
  process.exit(1);
}
```

Common error scenarios:

- Invalid or missing OpenAPI specification file
- Network errors when fetching remote URLs
- File system permission issues
- Malformed OpenAPI specifications
