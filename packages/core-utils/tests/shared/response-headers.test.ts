import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { generateResponseHeaderMap } from "../../src/shared/response-headers.js";

describe("response headers", () => {
  it("extracts typed response headers for a status code", () => {
    const operation: OperationObject = {
      operationId: "listPets",
      responses: {
        "200": {
          description: "Success",
          headers: {
            ETag: {
              schema: { type: "string" },
            },
            "X-Rate-Limit": {
              schema: { format: "int32", type: "integer" },
            },
          },
        },
      },
    };

    const result = generateResponseHeaderMap(
      operation,
      "listPets",
      new Set<string>(),
    );

    expect(result.statuses).toEqual([
      {
        statusCode: "200",
        headers: [
          {
            componentSchemaName: undefined,
            normalizedName: "etag",
            originalName: "ETag",
            required: false,
            schemaCode: "z.string()",
          },
          {
            componentSchemaName: undefined,
            normalizedName: "x-rate-limit",
            originalName: "X-Rate-Limit",
            required: false,
            schemaCode: "z.coerce.number().int()",
          },
        ],
      },
    ]);
  });

  it("tracks reusable component headers with shared schema names", () => {
    const operation: OperationObject = {
      operationId: "listPets",
      responses: {
        "200": {
          description: "Success",
          headers: {
            "X-Rate-Limit": {
              $ref: "#/components/headers/RateLimit",
            },
          },
        },
        "429": {
          description: "Too many requests",
          headers: {
            "X-Rate-Limit": {
              $ref: "#/components/headers/RateLimit",
            },
          },
        },
      },
    };

    const doc: OpenAPIObject = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {},
      components: {
        headers: {
          RateLimit: {
            schema: { format: "int32", type: "integer" },
          },
        },
      },
    };

    const result = generateResponseHeaderMap(
      operation,
      "listPets",
      new Set<string>(),
      doc,
    );

    expect(result.statuses).toHaveLength(2);
    expect(result.statuses[0].headers[0]?.componentSchemaName).toBe(
      "RateLimitResponseHeaderSchema",
    );
    expect(result.statuses[1].headers[0]?.componentSchemaName).toBe(
      "RateLimitResponseHeaderSchema",
    );
  });
});
