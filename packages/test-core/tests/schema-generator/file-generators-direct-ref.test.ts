import { describe, expect, it } from "vitest";

import type { SchemaObject } from "openapi3-ts/oas31";

import {
  generateRecursiveSchemaFile,
  createRecursiveContext,
} from "@apical-ts/core-utils";

describe("file-generators - direct $ref recursive properties", () => {
  it("should detect direct $ref self-reference as recursive", async () => {
    const recursiveContext = createRecursiveContext();

    /* Schema with direct self-reference via $ref */
    const treeNodeSchema: SchemaObject = {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        parent: {
          $ref: "#/components/schemas/TreeNode",
        },
        children: {
          type: "array",
          items: {
            $ref: "#/components/schemas/TreeNode",
          },
        },
      },
      required: ["name"],
    };

    const result = await generateRecursiveSchemaFile({
      description: "A tree node with parent and children references",
      name: "TreeNode",
      originalSchemaName: "TreeNode",
      recursiveContext,
      schema: treeNodeSchema,
      extraProps: "strip",
    });

    /* Verify the generated content contains getter syntax for recursive properties */
    expect(result.content).toContain('get "parent"()');
    expect(result.content).toContain('get "children"()');
    expect(result.content).toContain("return TreeNode");
    expect(result.content).toContain("return z.array(TreeNode)");

    /* Verify non-recursive properties use regular syntax */
    expect(result.content).toContain('"name": z.string()');

    /* Verify the file structure */
    expect(result.content).toContain("export const TreeNode =");
    expect(result.content).toContain("export type TreeNode =");
    expect(result.fileName).toBe("TreeNode.ts");
  });

  it("should detect short-form $ref self-reference as recursive", async () => {
    const recursiveContext = createRecursiveContext();

    /* Schema with short-form self-reference */
    const categorySchema: SchemaObject = {
      type: "object",
      properties: {
        id: {
          type: "string",
        },
        parentCategory: {
          $ref: "#/Category", // Short form reference
        },
        subcategories: {
          type: "array",
          items: {
            $ref: "#/Category",
          },
        },
      },
      required: ["id"],
    };

    const result = await generateRecursiveSchemaFile({
      description: "A category with parent and subcategory references",
      name: "Category",
      originalSchemaName: "Category",
      recursiveContext,
      schema: categorySchema,
      extraProps: "strip",
    });

    /* Verify the generated content contains getter syntax for recursive properties */
    expect(result.content).toContain('get "parentCategory"()');
    expect(result.content).toContain('get "subcategories"()');
    expect(result.content).toContain("return Category");
    expect(result.content).toContain("return z.array(Category)");

    /* Verify non-recursive properties use regular syntax */
    expect(result.content).toContain('"id": z.string()');
  });

  it("should not treat non-self $ref as recursive", async () => {
    const recursiveContext = createRecursiveContext();

    /* Schema with reference to different schema */
    const userSchema: SchemaObject = {
      type: "object",
      properties: {
        name: {
          type: "string",
        },
        profile: {
          $ref: "#/components/schemas/Profile", // Reference to different schema
        },
        friends: {
          type: "array",
          items: {
            $ref: "#/components/schemas/User", // Self-reference (should be recursive)
          },
        },
      },
      required: ["name"],
    };

    const result = await generateRecursiveSchemaFile({
      description: "A user with profile and friends",
      name: "User",
      originalSchemaName: "User",
      recursiveContext,
      schema: userSchema,
      extraProps: "strip",
    });

    /* Verify only self-references use getter syntax */
    expect(result.content).toContain('get "friends"()'); // Self-reference
    expect(result.content).toContain("return z.array(User)");

    /* Verify non-self reference is handled normally (would need imports) */
    expect(result.content).not.toContain('get "profile"()');

    /* Regular properties use regular syntax */
    expect(result.content).toContain('"name": z.string()');
  });

  it("should handle optional direct $ref self-references", async () => {
    const recursiveContext = createRecursiveContext();

    /* Schema where self-reference is optional */
    const nodeSchema: SchemaObject = {
      type: "object",
      properties: {
        value: {
          type: "number",
        },
        next: {
          $ref: "#/components/schemas/Node", // Optional self-reference
        },
      },
      required: ["value"], // 'next' is not required
    };

    const result = await generateRecursiveSchemaFile({
      description: "A linked list node",
      name: "Node",
      originalSchemaName: "Node",
      recursiveContext,
      schema: nodeSchema,
      extraProps: "strip",
    });

    /* Verify optional recursive property has .optional() */
    expect(result.content).toContain('get "next"()');
    expect(result.content).toContain("return Node.optional()");

    /* Required property doesn't have .optional() */
    expect(result.content).toContain('"value": z.number()');
    expect(result.content).not.toContain('"value": z.number().optional()');
  });
});
