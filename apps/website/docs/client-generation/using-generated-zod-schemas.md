# Using Generated Zod Schemas

You can use the generated Zod schemas to validate and parse your data easily.

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

## Schema Structure

The generated schemas are self-contained Zod v4 schemas that can be used independently for validation, parsing, and type inference. Each schema file contains:

- **Zod schema definition** for runtime validation
- **TypeScript type** derived from the schema
- **Export statements** for both schema and type

```ts
// Generated schema file example
import { z } from "zod";

export const Pet = z.object({
  id: z.number().int(),
  name: z.string(),
  category: z.object({
    id: z.number().int(),
    name: z.string(),
  }).optional(),
  photoUrls: z.array(z.string()),
  tags: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
  })).optional(),
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

// Direct parsing (throws on error)
try {
  const validPet = Pet.parse(petData);
  console.log("Valid pet:", validPet);
} catch (error) {
  console.error("Validation failed:", error);
}
```

### Type Inference

```ts
import { Pet, type Pet as PetType } from "./generated/schemas/Pet.js";

// Use the schema for validation
const validatePet = (data: unknown): PetType | null => {
  const result = Pet.safeParse(data);
  return result.success ? result.data : null;
};

// Use the type for function parameters
const processPet = (pet: PetType) => {
  console.log(`Processing pet: ${pet.name} (ID: ${pet.id})`);
};
```

## Form Validation

The generated schemas are perfect for form validation in web applications:

### React Hook Form Integration

```ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Pet, type Pet as PetType } from "./generated/schemas/Pet.js";

const PetForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PetType>({
    resolver: zodResolver(Pet),
  });

  const onSubmit = (data: PetType) => {
    console.log("Valid pet data:", data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} placeholder="Pet name" />
      {errors.name && <span>Name is required</span>}
      
      <input {...register("photoUrls.0")} placeholder="Photo URL" />
      {errors.photoUrls && <span>At least one photo URL is required</span>}
      
      <button type="submit">Submit</button>
    </form>
  );
};
```

### Vue Composition API

```ts
import { ref, computed } from "vue";
import { Pet, type Pet as PetType } from "./generated/schemas/Pet.js";

export const usePetForm = () => {
  const formData = ref<Partial<PetType>>({});
  const errors = ref<string[]>([]);

  const isValid = computed(() => {
    const result = Pet.safeParse(formData.value);
    errors.value = result.success ? [] : result.error.issues.map(i => i.message);
    return result.success;
  });

  const submitForm = () => {
    if (isValid.value) {
      console.log("Submitting:", formData.value);
    }
  };

  return { formData, errors, isValid, submitForm };
};
```

## Server-Side Validation

Use the schemas for server-side request validation:

### Express.js Middleware

```ts
import { Request, Response, NextFunction } from "express";
import { Pet } from "./generated/schemas/Pet.js";

export const validatePet = (req: Request, res: Response, next: NextFunction) => {
  const result = Pet.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.issues,
    });
  }
  
  req.body = result.data; // Attach validated data
  next();
};

// Usage
app.post("/pets", validatePet, (req, res) => {
  // req.body is now typed and validated
  console.log("Creating pet:", req.body.name);
});
```

### Fastify Schema Validation

```ts
import { FastifyInstance } from "fastify";
import { zodToJsonSchema } from "zod-to-json-schema";
import { Pet } from "./generated/schemas/Pet.js";

export const registerPetRoutes = (fastify: FastifyInstance) => {
  fastify.post("/pets", {
    schema: {
      body: zodToJsonSchema(Pet),
    },
    preHandler: async (request, reply) => {
      const result = Pet.safeParse(request.body);
      if (!result.success) {
        reply.code(400).send({ error: result.error.issues });
        return;
      }
      request.body = result.data;
    },
  }, async (request, reply) => {
    // request.body is validated
    return { message: `Pet ${request.body.name} created` };
  });
};
```

## Data Transformation

Use schemas for data transformation and sanitization:

### Input Sanitization

```ts
import { Pet } from "./generated/schemas/Pet.js";

const sanitizePetData = (rawData: unknown) => {
  // Transform the schema to add sanitization
  const SanitizedPet = Pet.transform((data) => ({
    ...data,
    name: data.name.trim().toLowerCase(),
    photoUrls: data.photoUrls.filter(url => url.startsWith('http')),
  }));

  return SanitizedPet.safeParse(rawData);
};
```

### Default Values

```ts
import { Pet } from "./generated/schemas/Pet.js";

const PetWithDefaults = Pet.extend({
  status: Pet.shape.status.default("available"),
  tags: Pet.shape.tags.default([]),
});

const createPet = (input: Partial<z.infer<typeof Pet>>) => {
  return PetWithDefaults.parse(input);
};
```

## Complex Validation Scenarios

### Conditional Validation

```ts
import { z } from "zod";
import { Pet } from "./generated/schemas/Pet.js";

const PetWithBusinessRules = Pet.refine(
  (data) => {
    // Business rule: sold pets must have at least one photo
    if (data.status === "sold" && data.photoUrls.length === 0) {
      return false;
    }
    return true;
  },
  {
    message: "Sold pets must have at least one photo",
    path: ["photoUrls"],
  }
);
```

### Cross-Field Validation

```ts
import { z } from "zod";
import { User, Pet } from "./generated/schemas/index.js";

const PetOwnership = z.object({
  user: User,
  pet: Pet,
}).refine(
  (data) => {
    // Business rule: user must be over 18 to own a pet
    return data.user.age >= 18;
  },
  {
    message: "User must be over 18 to own a pet",
    path: ["user", "age"],
  }
);
```

## Testing with Schemas

### Unit Testing

```ts
import { describe, it, expect } from "vitest";
import { Pet } from "./generated/schemas/Pet.js";

describe("Pet Schema", () => {
  it("should validate a valid pet", () => {
    const validPet = {
      id: 1,
      name: "Fluffy",
      photoUrls: ["http://example.com/photo.jpg"],
    };

    const result = Pet.safeParse(validPet);
    expect(result.success).toBe(true);
  });

  it("should reject invalid pet data", () => {
    const invalidPet = {
      id: "not-a-number",
      name: "",
      photoUrls: [],
    };

    const result = Pet.safeParse(invalidPet);
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(3);
  });

  it("should handle optional fields", () => {
    const minimalPet = {
      id: 1,
      name: "Minimal Pet",
      photoUrls: ["http://example.com/photo.jpg"],
    };

    const result = Pet.safeParse(minimalPet);
    expect(result.success).toBe(true);
  });
});
```

### Property-Based Testing

```ts
import { fc } from "fast-check";
import { Pet } from "./generated/schemas/Pet.js";

// Generate random valid pet data
const petArbitrary = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.string({ minLength: 1 }),
  photoUrls: fc.array(fc.webUrl()),
  status: fc.oneof(
    fc.constant("available"),
    fc.constant("pending"),
    fc.constant("sold")
  ),
});

describe("Pet Schema Property Tests", () => {
  it("should always validate generated pet data", () => {
    fc.assert(
      fc.property(petArbitrary, (pet) => {
        const result = Pet.safeParse(pet);
        expect(result.success).toBe(true);
      })
    );
  });
});
```

## Advanced Usage

### Schema Composition

```ts
import { z } from "zod";
import { Pet, User } from "./generated/schemas/index.js";

// Combine multiple schemas
const PetStore = z.object({
  owner: User,
  pets: z.array(Pet),
  totalValue: z.number().positive(),
});

// Extend existing schemas
const ExtendedPet = Pet.extend({
  microchipId: z.string().optional(),
  vaccinations: z.array(z.string()).default([]),
});
```

### Partial and Pick Utilities

```ts
import { Pet } from "./generated/schemas/Pet.js";

// Create a partial schema for updates
const PetUpdate = Pet.partial();

// Pick specific fields
const PetSummary = Pet.pick({
  id: true,
  name: true,
  status: true,
});

// Omit sensitive fields
const PublicPet = Pet.omit({
  id: true,
});
```

### Dynamic Schema Creation

```ts
import { z } from "zod";
import { Pet } from "./generated/schemas/Pet.js";

const createFilteredPetSchema = (allowedStatuses: string[]) => {
  return Pet.extend({
    status: z.enum(allowedStatuses as [string, ...string[]]),
  });
};

const AvailablePetSchema = createFilteredPetSchema(["available"]);
```

## Best Practices

1. **Use `safeParse`** instead of `parse` to avoid exceptions
2. **Provide meaningful error messages** for validation failures
3. **Combine with TypeScript** for compile-time and runtime type safety
4. **Test your schemas** thoroughly with valid and invalid data
5. **Use schema composition** to build complex validation logic
6. **Leverage transforms** for data sanitization and normalization
7. **Document business rules** implemented in schema refinements
8. **Keep schemas focused** - one schema per data model
9. **Version your schemas** when making breaking changes
10. **Use consistent naming** across schemas and types