# ReadOnly and WriteOnly Properties

@apical-ts/craft provides comprehensive support for OpenAPI's `readOnly` and
`writeOnly` properties, enabling type-safe handling of properties that should
only appear in requests or responses.

## Overview

The `readOnly` and `writeOnly` keywords in OpenAPI schemas define property
access patterns:

- **`readOnly: true`**: Property is included only in responses, excluded from
  requests
- **`writeOnly: true`**: Property is included only in requests, excluded from
  responses

This feature is essential for APIs that have server-computed fields (like IDs,
timestamps) or sensitive request-only fields (like passwords).

## How It Works

### Schema Variants

When a schema contains `readOnly` or `writeOnly` properties, the generator
automatically creates specialized variants:

- **Base Schema**: The complete schema with all properties (used for
  documentation and type inference)
- **Request Variant** (`*Request`): Excludes `readOnly` properties, used for
  request body types
- **Response Variant** (`*Response`): Excludes `writeOnly` properties, used for
  response types

These variants are generated using Zod's `.omit()` method for maximum type
safety:

```ts
// Generated base schema
export const User = z.object({
  id: z.string(), // readOnly
  createdAt: z.string(), // readOnly
  username: z.string(),
  email: z.string(),
  password: z.string(), // writeOnly
});

export type User = z.infer<typeof User>;

// Auto-generated Request variant (excludes readOnly fields)
export const UserRequest = User.omit({
  id: true,
  createdAt: true,
});
export type UserRequest = z.infer<typeof UserRequest>;

// Auto-generated Response variant (excludes writeOnly fields)
export const UserResponse = User.omit({
  password: true,
});
export type UserResponse = z.infer<typeof UserResponse>;
```

### Import Support

The variants can be imported directly from their own files or from the base
schema file:

```ts
// Both imports work identically
import { UserRequest } from "./schemas/User.js";
import { UserRequest } from "./schemas/UserRequest.js";

// Response variant
import { UserResponse } from "./schemas/User.js";
import { UserResponse } from "./schemas/UserResponse.js";
```

## Client Operations

Client operations automatically use the appropriate variant based on context:

### Request Bodies

Operations use the Request variant (excludes `readOnly` properties):

```ts
import { createUser } from "./generated/operations/createUser.js";

// ✅ Valid - no readOnly fields required
const result = await createUser({
  body: {
    username: "alice",
    email: "alice@example.com",
    password: "secret123",
  },
});

// ❌ Type Error - readOnly fields not allowed
const invalid = await createUser({
  body: {
    id: "123", // Error: readOnly property excluded from UserRequest
    username: "alice",
  },
});
```

### Response Types

Operations return response types that exclude `writeOnly` properties:

```ts
const result = await getUser({ id: "123" });

if (result.success) {
  const user = result.value.data;
  console.log(user.id); // ✅ Available (readOnly field in response)
  console.log(user.username); // ✅ Available
  console.log(user.password); // ❌ Type Error - writeOnly not in response
}
```

## OpenAPI Schema Example

```yaml
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          readOnly: true
          description: Auto-generated user ID
        createdAt:
          type: string
          format: date-time
          readOnly: true
          description: Account creation timestamp
        username:
          type: string
        email:
          type: string
        password:
          type: string
          writeOnly: true
          description: Password (never returned from API)
      required:
        - id
        - username

paths:
  /users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/User"
      responses:
        "201":
          description: User created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
```

## Nested Objects

ReadOnly and writeOnly properties work correctly with nested objects:

```yaml
components:
  schemas:
    Product:
      type: object
      properties:
        sku:
          type: string
        name:
          type: string
        metadata:
          type: object
          properties:
            createdBy:
              type: string
              readOnly: true
            internalNotes:
              type: string
              writeOnly: true
```

Generated code:

```ts
// Request variant - excludes createdBy but includes internalNotes
export const ProductRequest = Product.omit({
  metadata: {
    createdBy: true,
  },
});

// Response variant - includes createdBy but excludes internalNotes
export const ProductResponse = Product.omit({
  metadata: {
    internalNotes: true,
  },
});
```

## Using Variants Directly

You can use Request and Response variants in your own code for validation:

```ts
import { User, UserRequest, UserResponse } from "./generated/schemas/User.js";

// Validate incoming request data
const requestData = UserRequest.parse(rawInput);

// Validate API response
const responseData = UserResponse.parse(apiResponse);

// Full schema for documentation
const fullSchema = User;
```

## Type Safety Benefits

The variant approach provides several advantages:

1. **Compile-time checks**: TypeScript catches attempts to send readOnly fields
2. **Runtime validation**: Zod schemas validate the correct fields are present
3. **Clear semantics**: Type names (`UserRequest`, `UserResponse`) make intent
   explicit
4. **No bloat**: Only relevant properties are validated
5. **Better errors**: Validation failures only mention relevant fields

## Mixed Scenarios

Schemas can have any combination of properties:

```ts
// Schema with everything
const UserFull = z.object({
  id: z.string(), // readOnly
  username: z.string(),
  email: z.string(),
  password: z.string(), // writeOnly
  twoFactorSecret: z.string(), // writeOnly
});

// Request - has username, email, password, twoFactorSecret; no id
export const UserRequest = UserFull.omit({
  id: true,
});

// Response - has id, username, email; no password, twoFactorSecret
export const UserResponse = UserFull.omit({
  password: true,
  twoFactorSecret: true,
});
```

## Server-Side Usage

If using the generated schemas for server-side validation, use the appropriate
variant:

```ts
import { UserRequest, UserResponse } from "./generated/schemas/User.js";

// Validate incoming request body
app.post("/users", (req, res) => {
  const data = UserRequest.parse(req.body);
  // data contains: username, email, password (no id, createdAt)

  const newUser = createUserInDb(data);

  // Return with response type (id, username, email are included)
  res.json(UserResponse.parse(newUser));
});
```

## Best Practices

1. **Use Request variants for client requests** - Ensures only the right fields
   are sent
2. **Use Response variants for API responses** - Ensures you don't accidentally
   expose secret fields
3. **Leverage type checking** - Let TypeScript catch misuse at compile time
4. **Validate at boundaries** - Use Zod's `.parse()` when processing external
   data
5. **Document intent** - Use `description` fields to explain why properties are
   readOnly/writeOnly

## Common Patterns

### Server-Generated IDs

```yaml
User:
  properties:
    id:
      type: string
      readOnly: true
    name:
      type: string
```

### Timestamps

```yaml
User:
  properties:
    createdAt:
      type: string
      format: date-time
      readOnly: true
    updatedAt:
      type: string
      format: date-time
      readOnly: true
```

### Sensitive Input Fields

```yaml
User:
  properties:
    password:
      type: string
      writeOnly: true
    apiKey:
      type: string
      writeOnly: true
```

### Complex Metadata

```yaml
Product:
  properties:
    sku:
      type: string
    metadata:
      type: object
      properties:
        internal:
          type: string
          writeOnly: true
        analytics:
          type: object
          writeOnly: true
```

## Migration Guide

If you have existing code without readOnly/writeOnly properties:

1. Update your OpenAPI schema to mark properties with `readOnly: true` or
   `writeOnly: true`
2. Regenerate your client code
3. Update imports to use `*Request` and `*Response` variants where needed
4. TypeScript will highlight any type mismatches to fix

The generator maintains backward compatibility - schemas without
readOnly/writeOnly properties work exactly as before.
