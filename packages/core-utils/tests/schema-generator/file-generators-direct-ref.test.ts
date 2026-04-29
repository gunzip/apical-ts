import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { SchemaObject } from "openapi3-ts/oas31";

import {
  generateRecursiveSchemaFile,
  generateSchemaFile,
} from "../../src/schema-generator/file-generators.js";
import { createRecursiveContext } from "../../src/schema-generator/recursive-handlers.js";

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

describe("file-generators - z.lazy() for non-object recursive schemas", () => {
  it("should use z.lazy() for array schemas that self-reference", async () => {
    const recursiveContext = createRecursiveContext();
    recursiveContext.recursiveSchemas.add("requestTracerTrace");

    /* Array schema where items contain a self-reference */
    const traceSchema: SchemaObject = {
      type: "array",
      items: {
        type: "object",
        properties: {
          trace: {
            $ref: "#/components/schemas/requestTracerTrace",
          },
        },
      },
    };

    const result = await generateSchemaFile(
      "requestTracerTrace",
      traceSchema,
      undefined,
      { recursiveContext },
    );

    /* Should wrap self-reference in z.lazy() */
    expect(result.content).toContain("z.lazy(() => requestTracerTrace)");
    /* Should add an explicit recursive public type instead of widening to unknown */
    expect(result.content).toContain(
      'export type requestTracerTrace = Array<{ "trace"?: requestTracerTrace }>;',
    );
    expect(result.content).toContain(
      "export const requestTracerTrace: z.ZodType<requestTracerTrace> =",
    );
  });

  it("should use z.lazy() for circular self-referencing schemas", async () => {
    const recursiveContext = createRecursiveContext();
    recursiveContext.recursiveSchemas.add("workersKvAny");

    /* Schema that references itself */
    const kvSchema: SchemaObject = {
      anyOf: [
        { type: "string" },
        { type: "number" },
        { type: "boolean" },
        {
          type: "array",
          items: { $ref: "#/components/schemas/workersKvAny" },
        },
        {
          type: "object",
          additionalProperties: {
            $ref: "#/components/schemas/workersKvAny",
          },
        },
      ],
    };

    const result = await generateSchemaFile(
      "workersKvAny",
      kvSchema,
      undefined,
      {
        recursiveContext,
      },
    );

    /* Should wrap self-references in z.lazy() */
    expect(result.content).toContain("z.lazy(() => workersKvAny)");
    expect(result.content).toContain(
      "export type workersKvAny = string | number | boolean | Array<workersKvAny> | { [key: string]: workersKvAny };",
    );
    expect(result.content).toContain(
      "export const workersKvAny: z.ZodType<workersKvAny> =",
    );
  });

  it("should NOT add z.ZodType annotation for non-recursive schemas", async () => {
    const recursiveContext = createRecursiveContext();

    const simpleSchema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
    };

    const result = await generateSchemaFile(
      "SimpleSchema",
      simpleSchema,
      undefined,
      { recursiveContext },
    );

    /* Should NOT have type annotation */
    expect(result.content).toContain("export const SimpleSchema =");
    expect(result.content).not.toContain(": z.ZodType<");
  });

  it("should NOT add z.ZodType annotation for schemas in recursive set without direct self-reference", async () => {
    const recursiveContext = createRecursiveContext();
    // Mark IndirectNode as recursive (part of a cycle) but its code won't reference itself
    recursiveContext.recursiveSchemas.add("IndirectNode");

    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        related: { $ref: "#/components/schemas/OtherNode" },
      },
    };

    const result = await generateSchemaFile("IndirectNode", schema, undefined, {
      recursiveContext,
    });

    /* Should NOT have z.ZodType annotation since code doesn't reference IndirectNode */
    expect(result.content).toContain("export const IndirectNode =");
    expect(result.content).not.toContain(": z.ZodType<");
  });
});

describe("file-generators - recursive generated types compile", () => {
  it("should preserve exported types for direct self-recursive non-object schemas", async () => {
    const recursiveContext = createRecursiveContext();
    recursiveContext.recursiveSchemas.add("workersKvAny");
    recursiveContext.recursiveSchemas.add("requestTracerTrace");

    const workersKvAny = await generateSchemaFile(
      "workersKvAny",
      {
        anyOf: [
          { type: "string" },
          { type: "number" },
          { type: "boolean" },
          {
            type: "array",
            items: { $ref: "#/components/schemas/workersKvAny" },
          },
          {
            type: "object",
            additionalProperties: {
              $ref: "#/components/schemas/workersKvAny",
            },
          },
        ],
      },
      undefined,
      { recursiveContext },
    );

    const requestTracerTrace = await generateSchemaFile(
      "requestTracerTrace",
      {
        type: "array",
        items: {
          type: "object",
          properties: {
            trace: {
              $ref: "#/components/schemas/requestTracerTrace",
            },
          },
        },
      },
      undefined,
      { recursiveContext },
    );

    await expect(
      typecheckGeneratedSchemas({
        "requestTracerTrace.ts": requestTracerTrace.content,
        "workersKvAny.ts": workersKvAny.content,
        "recursive-types.ts": `
import type { requestTracerTrace as RequestTracerTrace } from "./requestTracerTrace.js";
import { requestTracerTrace } from "./requestTracerTrace.js";
import type { workersKvAny as WorkersKvAny } from "./workersKvAny.js";
import { workersKvAny } from "./workersKvAny.js";

type IsUnknown<T> = unknown extends T ? ([T] extends [unknown] ? true : false) : false;

const traceValue: RequestTracerTrace = [{ trace: [] }];
const kvValue: WorkersKvAny = [{ nested: ["value", 1, false] }];
const parsedTrace: RequestTracerTrace = requestTracerTrace.parse(traceValue);
const parsedKv: WorkersKvAny = workersKvAny.parse(kvValue);
const traceIsUnknown: IsUnknown<RequestTracerTrace> = false;
const kvIsUnknown: IsUnknown<WorkersKvAny> = false;

void parsedTrace;
void parsedKv;
void traceIsUnknown;
void kvIsUnknown;

// @ts-expect-error requestTracerTrace should stay an array type
const invalidTrace: RequestTracerTrace = { trace: [] };
// @ts-expect-error workersKvAny should reject null
const invalidKv: WorkersKvAny = null;

void invalidTrace;
void invalidKv;
`,
      }),
    ).resolves.toBeUndefined();
  });

  it("should keep indirect recursive object cycles compiling without direct-self annotations", async () => {
    const recursiveContext = createRecursiveContext();
    recursiveContext.recursiveSchemas.add("Category");
    recursiveContext.recursiveSchemas.add("CategoryParent");

    const category = await generateRecursiveSchemaFile({
      description: "Category node",
      name: "Category",
      originalSchemaName: "Category",
      recursiveContext,
      schema: {
        properties: {
          parent: { $ref: "#/components/schemas/CategoryParent" },
        },
        type: "object",
      },
    });
    const categoryParent = await generateRecursiveSchemaFile({
      description: "Category parent node",
      name: "CategoryParent",
      originalSchemaName: "CategoryParent",
      recursiveContext,
      schema: {
        properties: {
          child: { $ref: "#/components/schemas/Category" },
        },
        type: "object",
      },
    });

    expect(category.content).not.toContain(": z.ZodType<");
    expect(categoryParent.content).not.toContain(": z.ZodType<");

    await expect(
      typecheckGeneratedSchemas({
        "Category.ts": category.content,
        "CategoryParent.ts": categoryParent.content,
        "indirect-cycle.ts": `
import type { Category } from "./Category.js";
import type { CategoryParent } from "./CategoryParent.js";

const categoryValue: Category = {};
const parentValue: CategoryParent = { child: categoryValue };

void categoryValue;
void parentValue;
`,
      }),
    ).resolves.toBeUndefined();
  });
});

const execFileAsync = promisify(execFile);

async function typecheckGeneratedSchemas(
  files: Record<string, string>,
): Promise<void> {
  const workspaceDir = path.join(
    process.cwd(),
    "tests",
    ".recursive-schema-typecheck",
  );

  await fs.rm(workspaceDir, { force: true, recursive: true });
  await fs.mkdir(workspaceDir, { recursive: true });

  try {
    await Promise.all(
      Object.entries(files).map(async ([fileName, content]) => {
        await fs.writeFile(path.join(workspaceDir, fileName), content);
      }),
    );

    await fs.writeFile(
      path.join(workspaceDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "ESNext",
          moduleResolution: "bundler",
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        include: ["./**/*.ts"],
      }),
    );

    await execFileAsync(
      "pnpm",
      [
        "exec",
        "tsgo",
        "--noEmit",
        "-p",
        path.join(workspaceDir, "tsconfig.json"),
      ],
      { cwd: process.cwd() },
    );
  } finally {
    await fs.rm(workspaceDir, { force: true, recursive: true });
  }
}
