---
id: schema-validation-modes
title: Handle Additional Properties
description:
  Control how Zod schemas handle additional properties using the --extra-props
  CLI flag. Configure strict, loose, or strip modes for object validation.
keywords:
  [
    schema validation,
    extra props,
    additional properties,
    Zod strict mode,
    Zod loose mode,
    OpenAPI validation,
    CLI options,
  ]
---

# Handle Additional Properties

@apical-ts/craft provides fine-grained control over how generated Zod schemas
handle additional properties through the `--extra-props` CLI flag. This feature
allows you to configure validation behavior for object schemas based on your
application's requirements.

## Overview

By default, Zod objects will parse successfully even when additional properties
are present in the input data, but these extra properties are stripped from the
output. The `--extra-props` flag allows you to change this behavior to either be
more permissive (loose mode) or more restrictive (strict mode).

## CLI Usage

Add the `--extra-props` flag to your generate command:

```bash
npx @apical-ts/craft generate \
  --extra-props <mode> \
  -i openapi.yaml \
  -o generated
```

Where `<mode>` can be one of:

- `strip` (default) - Additional properties are removed from parsed objects
- `loose` - Additional properties are preserved in parsed objects
- `strict` - Additional properties cause validation errors

## Validation Modes

### Strip Mode (Default)

When `--extra-props` is not specified or set to `strip`, schemas behave like
standard Zod objects:

```bash
# These commands are equivalent
npx @apical-ts/craft generate -i openapi.yaml -o generated
npx @apical-ts/craft generate --extra-props strip -i openapi.yaml -o generated
```

**Generated schema:**

```typescript
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});
```

**Behavior:**

```typescript
const input = {
  id: 1,
  name: "John",
  email: "john@example.com",
  extraField: "ignored",
};

const result = UserSchema.parse(input);
// result = { id: 1, name: "John", email: "john@example.com" }
// extraField is stripped away
```

### Loose Mode

When set to `loose`, additional properties are preserved in the parsed result:

```bash
npx @apical-ts/craft generate --extra-props loose -i openapi.yaml -o generated
```

**Generated schema:**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })
  .loose();
```

**Behavior:**

```typescript
const input = {
  id: 1,
  name: "John",
  email: "john@example.com",
  extraField: "preserved",
};

const result = UserSchema.parse(input);
// result = { id: 1, name: "John", email: "john@example.com", extraField: "preserved" }
// extraField is kept in the result
```

### Strict Mode

When set to `strict`, additional properties cause validation to fail:

```bash
npx @apical-ts/craft generate --extra-props strict -i openapi.yaml -o generated
```

**Generated schema:**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
  })
  .strict();
```

**Behavior:**

```typescript
const input = {
  id: 1,
  name: "John",
  email: "john@example.com",
  extraField: "causes_error",
};

const result = UserSchema.safeParse(input);
// result.success = false
// result.error contains details about the unexpected property
```

## OpenAPI `additionalProperties` Handling

The `--extra-props` flag only affects object schemas that **do not** have an
explicit `additionalProperties` setting in the OpenAPI specification. When
`additionalProperties` is explicitly defined, it takes precedence:

### Explicit `additionalProperties: false`

```yaml
# OpenAPI Schema
User:
  type: object
  additionalProperties: false
  properties:
    id:
      type: integer
    name:
      type: string
```

**Generated schema (regardless of --extra-props flag):**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .strict();
```

The schema is always strict when `additionalProperties: false` is explicitly
set.

### Explicit `additionalProperties: true`

```yaml
# OpenAPI Schema
User:
  type: object
  additionalProperties: true
  properties:
    id:
      type: integer
    name:
      type: string
```

**Generated schema (regardless of --extra-props flag):**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .catchall(z.unknown());
```

The `.catchall(z.unknown())` method allows any additional properties to be
present and preserved in the parsed result.

### `additionalProperties` with Schema

```yaml
# OpenAPI Schema
User:
  type: object
  additionalProperties:
    type: string
  properties:
    id:
      type: integer
    name:
      type: string
```

**Generated schema (regardless of --extra-props flag):**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .catchall(z.string());
```

When `additionalProperties` contains a schema definition, Zod's `.catchall()`
method is used to validate additional properties according to the specified
schema.

**Behavior:**

```typescript
const input = {
  id: 1,
  name: "John",
  email: "john@example.com", // string - valid
  age: 25, // number - invalid, should be string
};

const result = UserSchema.safeParse(input);
// result.success = false (age is not a string)
// Only additional properties matching the schema type are allowed
```

### `additionalProperties` with Complex Schema

```yaml
# OpenAPI Schema
User:
  type: object
  additionalProperties:
    type: object
    properties:
      value:
        type: string
      metadata:
        type: object
  properties:
    id:
      type: integer
    name:
      type: string
```

**Generated schema:**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .catchall(
    z.object({
      value: z.string(),
      metadata: z.object({}).passthrough(),
    }),
  );
```

### `additionalProperties: true` vs No Explicit Setting

**With `additionalProperties: true`:**

```yaml
User:
  type: object
  additionalProperties: true # Explicitly allows any additional properties
  properties:
    id:
      type: integer
```

**Generated schema:**

```typescript
export const UserSchema = z
  .object({
    id: z.number(),
  })
  .catchall(z.unknown());
```

**Without explicit `additionalProperties` (subject to --extra-props):**

```yaml
User:
  type: object
  # No additionalProperties specified
  properties:
    id:
      type: integer
```

**Generated schema (depends on --extra-props flag):**

```typescript
// --extra-props strip (default)
export const UserSchema = z.object({
  id: z.number(),
});

// --extra-props loose
export const UserSchema = z
  .object({
    id: z.number(),
  })
  .loose();

// --extra-props strict
export const UserSchema = z
  .object({
    id: z.number(),
  })
  .strict();
```

## Use Cases

### Strip Mode (Default)

- **Best for**: Most applications where you want clean, predictable data
  structures
- **Use when**: You want to ignore unknown fields from API responses
- **Security**: Prevents unexpected data from reaching your application logic

### Loose Mode

- **Best for**: Working with evolving APIs or third-party services
- **Use when**: You need to preserve all data from API responses for logging or
  debugging
- **Flexibility**: Allows handling of API versions with additional fields

### Strict Mode

- **Best for**: Critical applications requiring exact data validation
- **Use when**: You want to catch API contract violations immediately
- **Reliability**: Ensures your application only processes expected data
  structures

## Examples

### Basic Usage

Generate schemas with strict validation:

```bash
npx @apical-ts/craft generate \
  --extra-props strict \
  --client \
  -i https://api.example.com/openapi.json \
  -o ./generated
```

### Combined with Other Options

Use loose mode with server generation:

```bash
npx @apical-ts/craft generate \
  --extra-props loose \
  --server \
  --client \
  -i ./specs/api.yaml \
  -o ./src/generated
```

### Runtime Usage

After generation, use the schemas in your application:

```typescript
import { UserSchema } from "./generated/schemas";

// Strict validation example
try {
  const user = UserSchema.parse(apiResponse);
  // Process user data knowing it's exactly what's expected
} catch (error) {
  // Handle validation error - unexpected properties found
  console.error("API response validation failed:", error);
}

// Safe parsing with error handling
const result = UserSchema.safeParse(apiResponse);
if (result.success) {
  const user = result.data;
  // Process validated user data
} else {
  // Handle validation errors gracefully
  console.warn("Invalid user data:", result.error.issues);
}
```

## Best Practices

1. **Start with strip mode** (default) for most applications
2. **Use strict mode** for critical data validation where API contract
   compliance is essential
3. **Use loose mode** when working with external APIs that may add fields over
   time
4. **Always use `.safeParse()`** when validation failures are expected
5. **Test with real API data** to ensure your chosen mode works with actual
   responses
6. **Document your choice** in your project's README for team members
