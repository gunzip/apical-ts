import type { OpenAPIObject, ParameterObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import { extractParameterGroups } from "../../src/shared/parameter-utils.js";

const emptyDoc: OpenAPIObject = {
  info: { title: "test", version: "1.0.0" },
  openapi: "3.1.0",
};

describe("extractParameterGroups", () => {
  it("should combine path-level and operation-level parameters", () => {
    const pathParams: ParameterObject[] = [
      { in: "path", name: "id", required: true, schema: { type: "string" } },
    ];
    const operation = {
      parameters: [
        {
          in: "query",
          name: "limit",
          schema: { type: "integer" },
        } satisfies ParameterObject,
      ],
      responses: {},
    };

    const result = extractParameterGroups(operation, pathParams, emptyDoc);

    expect(result.pathParams).toHaveLength(1);
    expect(result.queryParams).toHaveLength(1);
    expect(result.pathParams[0].name).toBe("id");
    expect(result.queryParams[0].name).toBe("limit");
  });

  it("should deduplicate parameters by name and location, with operation-level taking precedence", () => {
    const pathParams: ParameterObject[] = [
      {
        in: "path",
        name: "meeting_id",
        required: true,
        schema: { type: "string" },
        description: "path-level",
      },
    ];
    const operation = {
      parameters: [
        {
          in: "path",
          name: "meeting_id",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "operation-level",
        } satisfies ParameterObject,
      ],
      responses: {},
    };

    const result = extractParameterGroups(operation, pathParams, emptyDoc);

    expect(result.pathParams).toHaveLength(1);
    expect(result.pathParams[0].description).toBe("operation-level");
  });

  it("should keep parameters with same name but different locations", () => {
    const pathParams: ParameterObject[] = [
      { in: "path", name: "id", required: true, schema: { type: "string" } },
    ];
    const operation = {
      parameters: [
        {
          in: "query",
          name: "id",
          schema: { type: "string" },
        } satisfies ParameterObject,
      ],
      responses: {},
    };

    const result = extractParameterGroups(operation, pathParams, emptyDoc);

    expect(result.pathParams).toHaveLength(1);
    expect(result.queryParams).toHaveLength(1);
  });

  it("should handle empty parameters", () => {
    const result = extractParameterGroups({ responses: {} }, [], emptyDoc);

    expect(result.pathParams).toHaveLength(0);
    expect(result.queryParams).toHaveLength(0);
    expect(result.headerParams).toHaveLength(0);
  });

  it("should resolve $ref parameters before deduplicating", () => {
    const doc: OpenAPIObject = {
      ...emptyDoc,
      components: {
        parameters: {
          MeetingId: {
            in: "path",
            name: "meeting_id",
            required: true,
            schema: { type: "string" },
            description: "ref-level",
          },
        },
      },
    };
    const pathParams = [{ $ref: "#/components/parameters/MeetingId" }];
    const operation = {
      parameters: [
        {
          in: "path",
          name: "meeting_id",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "operation-level",
        } satisfies ParameterObject,
      ],
      responses: {},
    };

    const result = extractParameterGroups(operation, pathParams, doc);

    expect(result.pathParams).toHaveLength(1);
    expect(result.pathParams[0].description).toBe("operation-level");
  });
});
