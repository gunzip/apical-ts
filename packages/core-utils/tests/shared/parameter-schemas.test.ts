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

  it("should deduplicate security headers and preserve explicit header schemas", () => {
    const parameterGroups = {
      queryParams: [],
      headerParams: [
        {
          in: "header",
          name: "X-Auth-Email",
          required: true,
          schema: { type: "string" },
          description: "Explicit email header",
        },
      ],
      pathParams: [],
      cookieParams: [],
    };

    const result = generateParameterSchemas(
      "getUsers",
      parameterGroups as any,
      {
        securityHeaders: [
          {
            headerName: "X-Auth-Email",
            isOverride: true,
            isRequired: true,
            schemeName: "emailAuth",
          },
          {
            headerName: "X-Auth-Email",
            isOverride: true,
            isRequired: true,
            schemeName: "emailAuthAlt",
          },
          {
            headerName: "X-Auth-Key",
            isOverride: true,
            isRequired: true,
            schemeName: "keyAuth",
          },
          {
            headerName: "X-Auth-Key",
            isOverride: true,
            isRequired: true,
            schemeName: "keyAuthAlt",
          },
        ],
      },
    );

    expect((result.schemaCode.match(/"X-Auth-Email":/g) ?? []).length).toBe(1);
    expect((result.schemaCode.match(/"X-Auth-Key":/g) ?? []).length).toBe(1);
    expect(result.schemaCode).toContain('.describe("Explicit email header")');
  });

  it("materializes global security headers as optional client fields and required server fields", () => {
    const parameterGroups = {
      queryParams: [],
      headerParams: [],
      pathParams: [],
      cookieParams: [],
    };
    const securityHeaders = [
      {
        headerName: "custom-token",
        isOverride: false,
        isRequired: false,
        schemeName: "customToken",
      },
    ];

    const clientResult = generateParameterSchemas(
      "getCatalog",
      parameterGroups,
      {
        securityHeaders,
      },
    );
    const serverResult = generateParameterSchemas(
      "getCatalog",
      parameterGroups,
      {
        lowercaseHeaderKeys: true,
        parameterSchemaKind: "server",
        securityHeaders,
      },
    );

    expect(clientResult.schemaCode).toContain("getCatalogHeadersSchema");
    expect(clientResult.schemaCode).toContain("z.object(");
    expect(clientResult.schemaCode).toContain("z.string().optional()");
    expect(clientResult.schemaCode).not.toContain('"custom-token": z.string() }');

    expect(serverResult.schemaCode).toContain("getCatalogHeadersSchema");
    expect(serverResult.schemaCode).toContain("z.object(");
    expect(serverResult.schemaCode).toContain('"custom-token"');
    expect(serverResult.schemaCode).toContain("z.string()");
  });
});
