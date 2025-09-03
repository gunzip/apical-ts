# Using Generated Zod Schemas

You can use the generated Zod schemas to validate and parse your data directly.

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

## Schema Structure

The generated schemas are self-contained Zod v4 schemas that can be used
independently for validation, parsing, and type inference. Each schema file
contains:

- **Zod schema definition** for runtime validation
- **TypeScript type** derived from the schema
- **Export statements** for both schema and type

```ts
// Generated schema file example
import { z } from "zod";

export const Pet = z.object({
  id: z.number().int(),
  name: z.string(),
  category: z
    .object({
      id: z.number().int(),
      name: z.string(),
    })
    .optional(),
  photoUrls: z.array(z.string()),
  tags: z
    .array(
      z.object({
        id: z.number().int(),
        name: z.string(),
      }),
    )
    .optional(),
  status: z.enum(["available", "pending", "sold"]).optional(),
});

export type Pet = z.infer<typeof Pet>;
```

## Basic Usage

### Validation

```ts
import { Pet } from "./generated/schemas/Pet.js";

const petData = {
  id: 1,
  name: "Fluffy",
  photoUrls: ["http://example.com/photo.jpg"],
};

// Safe parsing (doesn't throw)
const result = Pet.safeParse(petData);
if (result.success) {
  console.log("Valid pet:", result.data);
} else {
  console.error("Validation errors:", result.error.issues);
}
```
