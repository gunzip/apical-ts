# @apical-ts/zod-to-arktype

> Convert Zod v4 schemas to ArkType schemas

This library converts Zod v4 schema definitions to their ArkType equivalents,
enabling you to use ArkType's high-performance runtime type validation with
schemas generated from OpenAPI specifications.

## Features

- 🔄 Converts Zod v4 schemas to ArkType schemas
- 📦 Processes entire directories of schema files
- 🔗 Preserves schema references and imports
- 💬 Maintains JSDoc comments
- ⚡ Fast and efficient conversion
- 🎯 Handles complex patterns: objects, unions, arrays, intersections
- 🛡️ Type-safe with full TypeScript support

## Installation

```bash
pnpm add @apical-ts/zod-to-arktype
```

## Usage

### CLI

Convert a directory of Zod schemas to ArkType:

```bash
pnpx @apical-ts/zod-to-arktype convert -i ./schemas -o ./arktype-schemas
```

#### Options

- `-i, --input <path>` - Input directory containing Zod schemas (required)
- `-o, --output <path>` - Output directory for ArkType schemas (required)

### Programmatic Usage

```typescript
import { convertZodToArkType } from "@apical-ts/zod-to-arktype";

const result = convertZodToArkType(
  'z.object({"id": z.string()})',
  "UserSchema",
);

console.log(result.code); // type.object({id: type.string})
console.log(result.schemaName); // UserSchema
console.log(result.imports); // Set of imported schema names
```

## Conversion Examples

### Simple Object

**Zod:**

```typescript
export const SimpleDefinition = z.object({ id: z.string() });
export type SimpleDefinition = z.infer<typeof SimpleDefinition>;
```

**ArkType:**

```typescript
export const SimpleDefinition = type.object({ id: type.string });
export type SimpleDefinition = typeof SimpleDefinition.infer;
```

### Arrays

**Zod:**

```typescript
export const Messages = z.array(Message);
```

**ArkType:**

```typescript
export const Messages = Message[];
```

### Unions

**Zod:**

```typescript
export const Status = z.union([Active, Inactive]);
```

**ArkType:**

```typescript
export const Status = type.union(Active, Inactive);
```

### Intersections (AllOf)

**Zod:**

```typescript
export const AllOfTest = z.object({
  ...BaseSchema.shape,
  ...ExtensionSchema.shape,
});
```

**ArkType:**

```typescript
export const AllOfTest = type.intersection(BaseSchema, ExtensionSchema);
```

### With Schema References

**Zod:**

```typescript
import { SimpleDefinition } from "./SimpleDefinition.js";

export const WithRef = z.object({ prop1: SimpleDefinition });
```

**ArkType:**

```typescript
import { type } from "arktype";
import { SimpleDefinition } from "./SimpleDefinition.js";

export const WithRef = type.object({ prop1: SimpleDefinition });
export type WithRef = typeof WithRef.infer;
```

## Supported Conversions

### Primitives

| Zod             | ArkType          |
| --------------- | ---------------- |
| `z.string()`    | `type.string`    |
| `z.number()`    | `type.number`    |
| `z.boolean()`   | `type.boolean`   |
| `z.null()`      | `type.null`      |
| `z.undefined()` | `type.undefined` |
| `z.any()`       | `type.any`       |
| `z.unknown()`   | `type.unknown`   |

### String Formats

| Zod                  | ArkType      |
| -------------------- | ------------ |
| `z.string().email()` | `type.email` |
| `z.string().url()`   | `type.url`   |
| `z.string().uuid()`  | `type.uuid`  |

### Number Types

| Zod                | ArkType        |
| ------------------ | -------------- |
| `z.number().int()` | `type.integer` |

### Complex Types

| Zod                         | ArkType                   |
| --------------------------- | ------------------------- |
| `z.object({...})`           | `type.object({...})`      |
| `z.array(T)`                | `T[]`                     |
| `z.union([A, B])`           | `type.union(A, B)`        |
| `z.discriminatedUnion(...)` | `type.union(...)`         |
| `z.intersection(A, B)`      | `type.intersection(A, B)` |
| `z.literal(val)`            | `type.literal(val)`       |
| `z.enum([...])`             | `type.union(...)`         |

### Modifiers

| Zod           | ArkType     |
| ------------- | ----------- |
| `.optional()` | `.optional` |

## Workflow Integration

This tool is designed to work with
[@apical-ts/craft](https://github.com/gunzip/apical-ts/tree/main/apps/craft):

1. Generate Zod schemas from OpenAPI spec using `@apical-ts/craft`
2. Convert Zod schemas to ArkType using this tool
3. Use ArkType schemas in your application for runtime validation

```bash
# Step 1: Generate Zod schemas from OpenAPI
pnpx @apical-ts/craft generate -i ./openapi.yaml -o ./generated

# Step 2: Convert to ArkType
pnpx @apical-ts/zod-to-arktype convert -i ./generated/schemas -o ./arktype-schemas

# Step 3: Use in your app
```

## Development

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

### Format

```bash
pnpm format
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or pull request on GitHub.
