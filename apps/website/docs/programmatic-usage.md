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

## Examples

### Generate Schemas Only

```typescript
import { generate } from "@apical-ts/craft";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
});
```

### Generate Client Code

```typescript
import { generate } from "@apical-ts/craft";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

### Generate Server Code

```typescript
import { generate } from "@apical-ts/craft";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateServer: true,
});
```

### Generate Everything

```typescript
import { generate } from "@apical-ts/craft";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
  generateServer: true,
});
```

### Using Remote URLs

```typescript
import { generate } from "@apical-ts/craft";

await generate({
  input: "https://petstore.swagger.io/v2/swagger.json",
  output: "./petstore-client",
  generateClient: true,
});
```

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

## Build Tool Integration

### Webpack Plugin

```typescript
// webpack.config.js
import { generate } from "@apical-ts/craft";

class OpenAPIGeneratorPlugin {
  apply(compiler) {
    compiler.hooks.beforeRun.tapAsync(
      "OpenAPIGeneratorPlugin",
      async (compiler, callback) => {
        try {
          await generate({
            input: "./api/openapi.yaml",
            output: "./src/generated",
            generateClient: true,
          });
          callback();
        } catch (error) {
          callback(error);
        }
      },
    );
  }
}

export default {
  // ... other webpack config
  plugins: [
    new OpenAPIGeneratorPlugin(),
    // ... other plugins
  ],
};
```

### Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { generate } from "@apical-ts/craft";

export default defineConfig({
  plugins: [
    {
      name: "openapi-generator",
      buildStart: async () => {
        await generate({
          input: "./api/openapi.yaml",
          output: "./src/generated",
          generateClient: true,
        });
      },
    },
  ],
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "generate": "node scripts/generate.js",
    "prebuild": "npm run generate",
    "predev": "npm run generate"
  }
}
```

```typescript
// scripts/generate.js
import { generate } from "@apical-ts/craft";

async function main() {
  console.log("Generating API client...");

  await generate({
    input: "./api/openapi.yaml",
    output: "./src/generated",
    generateClient: true,
  });

  console.log("API client generated successfully!");
}

main().catch((error) => {
  console.error("Generation failed:", error);
  process.exit(1);
});
```

### CI/CD Integration

#### GitHub Actions

```yaml
# .github/workflows/generate-api.yml
name: Generate API Client
on:
  push:
    paths:
      - "api/openapi.yaml"

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run generate
      - uses: stefanzweifel/git-auto-commit-action@v4
        with:
          commit_message: "Auto-generate API client"
```

#### Docker

```dockerfile
FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY api/openapi.yaml ./api/
COPY scripts/generate.js ./scripts/

RUN npm run generate

# Copy generated files for the next stage
COPY src/generated ./generated/
```

## Advanced Usage

### Dynamic Configuration

```typescript
import { generate } from "@apical-ts/craft";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./build-config.json", "utf8"));

for (const spec of config.specifications) {
  await generate({
    input: spec.input,
    output: `./generated/${spec.name}`,
    generateClient: spec.generateClient,
    generateServer: spec.generateServer,
  });
}
```

### Conditional Generation

```typescript
import { generate } from "@apical-ts/craft";

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

if (isDevelopment) {
  // Generate from local spec during development
  await generate({
    input: "./api/openapi.yaml",
    output: "./src/generated",
    generateClient: true,
  });
} else if (isProduction) {
  // Generate from remote spec in production
  await generate({
    input: "https://api.production.com/openapi.json",
    output: "./src/generated",
    generateClient: true,
  });
}
```

## Performance Considerations

- **Caching**: Consider caching generated files and only regenerating when the
  input changes
- **Parallel Generation**: If generating multiple clients, consider running them
  in parallel
- **File Watching**: Use file watchers to regenerate only when specifications
  change
- **Output Comparison**: Compare generated output to avoid unnecessary rebuilds
