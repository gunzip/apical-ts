import type { SchemaObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  analyzeRecursiveReference,
  createRecursiveContext,
  findReferencesInSchema,
  generateRecursiveReference,
} from "../../src/schema-generator/recursive-handlers.js";

describe("recursive-handlers", () => {
  describe("createRecursiveContext", () => {
    it("should create empty recursive context", () => {
      const context = createRecursiveContext();

      expect(context.recursiveSchemas).toBeInstanceOf(Set);
      expect(context.recursiveSchemas.size).toBe(0);
      expect(context.recursiveProperties).toBeInstanceOf(Map);
      expect(context.recursiveProperties.size).toBe(0);
      expect(context.referenceStack).toEqual([]);
    });
  });

  describe("analyzeRecursiveReference", () => {
    it("should detect self-referencing schema", () => {
      const context = createRecursiveContext();
      context.referenceStack.push("#/components/schemas/TreeNode");

      const result = analyzeRecursiveReference(
        "#/components/schemas/TreeNode",
        context,
        "TreeNode",
      );

      expect(result.isRecursive).toBe(true);
      expect(result.isDirectSelfReference).toBe(true);
    });

    it("should detect cycle in reference stack", () => {
      const context = createRecursiveContext();
      context.referenceStack.push("Parent");
      context.referenceStack.push("Child");

      // Now Parent is trying to reference itself, creating a cycle
      const result = analyzeRecursiveReference(
        "#/components/schemas/Parent",
        context,
        "SomeOtherSchema",
      );

      expect(result.isRecursive).toBe(true);
      expect(result.cyclePath).toEqual(["Parent", "Child", "Parent"]);
    });

    it("should not detect recursion for new reference", () => {
      const context = createRecursiveContext();
      context.referenceStack.push("#/components/schemas/Other");

      const result = analyzeRecursiveReference(
        "#/components/schemas/NewSchema",
        context,
        "CurrentSchema",
      );

      expect(result.isRecursive).toBe(false);
    });

    it("should handle non-schema references", () => {
      const context = createRecursiveContext();

      const result = analyzeRecursiveReference(
        "#/paths/users",
        context,
        "User",
      );

      expect(result.isRecursive).toBe(false);
    });

    it("should extract reference name correctly", () => {
      const context = createRecursiveContext();
      context.referenceStack.push("#/components/schemas/TreeNode");

      const result = analyzeRecursiveReference(
        "#/components/schemas/TreeNode",
        context,
        "TreeNode",
      );

      expect(result.referenceName).toBe("TreeNode");
    });
  });

  describe("generateRecursiveReference", () => {
    it("should generate getter syntax for recursive self-reference", () => {
      const result = generateRecursiveReference("TreeNode", "children", {
        currentSchemaName: "TreeNode",
      });

      expect(result.code).toContain("get children()");
      expect(result.code).toContain("return TreeNode");
      expect(result.imports.has("TreeNode")).toBe(true);
    });

    it("should generate getter with strict validation", () => {
      const result = generateRecursiveReference("RecursiveSchema", "self", {
        currentSchemaName: "RecursiveSchema",
        strictValidation: true,
      });

      expect(result.code).toContain("get self()");
      expect(result.code).toContain("return RecursiveSchemaStrict");
      expect(result.imports.has("RecursiveSchemaStrict")).toBe(true);
    });

    it("should handle regular reference generation", () => {
      const result = generateRecursiveReference("RegularSchema", "reference", {
        currentSchemaName: "CurrentSchema",
      });

      expect(result.code).toContain("get reference()");
      expect(result.code).toContain("return RegularSchema");
      expect(result.imports.has("RegularSchema")).toBe(true);
    });

    it("should handle property name sanitization", () => {
      const result = generateRecursiveReference("Schema", "recursive-ref", {
        currentSchemaName: "Schema",
      });

      expect(result.code).toContain("get recursive-ref()");
      expect(result.code).toContain("return Schema");
    });
  });

  describe("recursive context management", () => {
    it("should track schemas currently being processed", () => {
      const context = createRecursiveContext();

      expect(context.referenceStack.includes("TestSchema")).toBe(false);

      context.referenceStack.push("TestSchema");
      expect(context.referenceStack.includes("TestSchema")).toBe(true);

      context.referenceStack.pop();
      expect(context.referenceStack.includes("TestSchema")).toBe(false);
    });

    it("should track recursive schemas", () => {
      const context = createRecursiveContext();

      expect(context.recursiveSchemas.has("RecursiveSchema")).toBe(false);

      context.recursiveSchemas.add("RecursiveSchema");
      expect(context.recursiveSchemas.has("RecursiveSchema")).toBe(true);
    });

    it("should track recursive properties within schemas", () => {
      const context = createRecursiveContext();

      expect(context.recursiveProperties.has("TreeNode")).toBe(false);

      context.recursiveProperties.set("TreeNode", new Set(["children"]));
      expect(context.recursiveProperties.has("TreeNode")).toBe(true);
      expect(context.recursiveProperties.get("TreeNode")?.has("children")).toBe(
        true,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty reference", () => {
      const context = createRecursiveContext();

      const result = analyzeRecursiveReference("", context, "TestSchema");

      expect(result.isRecursive).toBe(false);
    });

    it("should handle malformed reference", () => {
      const context = createRecursiveContext();

      const result = analyzeRecursiveReference(
        "not-a-valid-ref",
        context,
        "TestSchema",
      );

      expect(result.isRecursive).toBe(false);
    });

    it("should handle deeply nested reference stack", () => {
      const context = createRecursiveContext();

      // Create a deep reference stack
      for (let i = 0; i < 10; i++) {
        context.referenceStack.push(`Schema${i}`);
      }

      const result = analyzeRecursiveReference(
        "#/components/schemas/Schema5",
        context,
        "CurrentSchema",
      );

      expect(result.isRecursive).toBe(true);
      expect(result.cyclePath).toBeDefined();
    });
  });

  describe("findReferencesInSchema", () => {
    it("should find references in simple schema", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          user: {
            $ref: "#/components/schemas/User",
          },
          profile: {
            $ref: "#/components/schemas/Profile",
          },
        },
      };

      const refs = findReferencesInSchema(schema);
      expect(refs).toContain("#/components/schemas/User");
      expect(refs).toContain("#/components/schemas/Profile");
      expect(refs).toHaveLength(2);
    });

    it("should find nested references", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Item",
            },
          },
        },
      };

      const refs = findReferencesInSchema(schema);
      expect(refs).toContain("#/components/schemas/Item");
      expect(refs).toHaveLength(1);
    });

    it("should find references in allOf/anyOf/oneOf", () => {
      const schema: SchemaObject = {
        allOf: [
          { $ref: "#/components/schemas/Base" },
          {
            anyOf: [
              { $ref: "#/components/schemas/TypeA" },
              { $ref: "#/components/schemas/TypeB" },
            ],
          },
        ],
      };

      const refs = findReferencesInSchema(schema);
      expect(refs).toContain("#/components/schemas/Base");
      expect(refs).toContain("#/components/schemas/TypeA");
      expect(refs).toContain("#/components/schemas/TypeB");
      expect(refs).toHaveLength(3);
    });

    it("should return empty array for schema without references", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
      };

      const refs = findReferencesInSchema(schema);
      expect(refs).toEqual([]);
    });

    it("should handle deeply nested structures", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              nested: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    deepRef: {
                      $ref: "#/components/schemas/DeepType",
                    },
                  },
                },
              },
            },
          },
        },
      };

      const refs = findReferencesInSchema(schema);
      expect(refs).toContain("#/components/schemas/DeepType");
      expect(refs).toHaveLength(1);
    });

    it("should handle self-referencing schemas", () => {
      const schema: SchemaObject = {
        type: "object",
        properties: {
          name: { type: "string" },
          children: {
            type: "array",
            items: {
              $ref: "#/components/schemas/TreeNode",
            },
          },
        },
      };

      const refs = findReferencesInSchema(schema);
      expect(refs).toContain("#/components/schemas/TreeNode");
      expect(refs).toHaveLength(1);
    });
  });
});
