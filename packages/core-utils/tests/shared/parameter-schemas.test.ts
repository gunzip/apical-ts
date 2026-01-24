import { describe, expect, it } from "vitest";

import { generateParameterSchemas } from "../../src/shared/parameter-schemas.js";

describe("generateParameterSchemas", () => {
  it("should include parameter descriptions", () => {
    const parameterGroups = {
      queryParams: [
        {
          in: "query",
          name: "userId",
          required: true,
          schema: { type: "string" },
          description: "The unique ID of the user",
        },
      ],
      headerParams: [],
      pathParams: [],
      cookieParams: [],
    };

    const result = generateParameterSchemas("getUsers", parameterGroups as any);
    expect(result.schemaCode).toContain(
      '.describe("The unique ID of the user")',
    );
  });

  it("should handle optional parameters with descriptions", () => {
    const parameterGroups = {
      queryParams: [
        {
          in: "query",
          name: "limit",
          required: false,
          schema: { type: "integer" },
          description: "Maximum number of items",
        },
      ],
      headerParams: [],
      pathParams: [],
      cookieParams: [],
    };

    const result = generateParameterSchemas("getUsers", parameterGroups as any);
    // .optional() should come before .describe()
    expect(result.schemaCode).toContain(
      'z.number().int().optional().describe("Maximum number of items")',
    );
  });

  it("should use parameter description as override for schema description", () => {
    const parameterGroups = {
      queryParams: [
        {
          in: "query",
          name: "userId",
          required: true,
          description: "Param desc",
          schema: {
            type: "string",
            description: "Schema desc",
          },
        },
      ],
      headerParams: [],
      pathParams: [],
      cookieParams: [],
    };

    const result = generateParameterSchemas("getUsers", parameterGroups as any);
    // Zod .describe() replaces the previous one, so we should see both or just the last one depending on implementation
    // Our implementation currently does: z.string().describe("Schema desc").describe("Param desc")
    expect(result.schemaCode).toContain(
      '.describe("Schema desc").describe("Param desc")',
    );
  });
});
