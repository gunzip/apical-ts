import { describe, it, expect } from "vitest";
import { generateResponseHandlers } from "../../src/client-generator/responses.js";
import { buildTypeAliases } from "../../src/client-generator/templates/operation-templates.js";
import { renderConfigInterface } from "../../src/client-generator/templates/config-templates.js";
import type { OperationObject } from "openapi3-ts/oas31";

/*
 * Tests for the deserializers refactoring
 * Verifies that the GlobalConfig includes deserializers and parse methods use config.deserializers as fallback
 */

describe("DeserializerMap Refactoring", () => {
  it("should include deserializers in GlobalConfig interface", () => {
    const configStructure = {
      auth: {
        hasAuthHeaders: true,
        authHeadersType: "AuthHeaders",
      },
      server: {
        baseURLType: "string",
        defaultBaseURL: "https://api.example.com",
      },
    };

    const result = renderConfigInterface(configStructure);

    expect(result).toContain("deserializers?: DeserializerMap;");
    expect(result).toContain("export interface GlobalConfig");
  });

  it("should generate parse methods that use config.deserializers as fallback", () => {
    const operation: OperationObject = {
      operationId: "testOperation",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/TestSchema",
              },
            },
            "application/xml": {
              schema: {
                $ref: "#/components/schemas/TestSchema",
              },
            },
          },
        },
      },
    };

    const typeImports = new Set<string>();
    const result = generateResponseHandlers(
      operation,
      typeImports,
      true,
      "TestOperationResponseMap",
    );

    /* Verify parse method uses only config.deserializers */
    expect(result.responseHandlers[0]).toContain("config.deserializers");
    expect(result.responseHandlers[0]).toContain("parse: ()");
    expect(result.responseHandlers[0]).not.toContain(
      "deserializers || config.deserializers",
    );
    expect(result.responseHandlers[0]).not.toContain(
      "parse: (deserializers?:",
    );
  });

  it("should generate content-type indexed deserializer map types", () => {
    const mockParameterGroups = {
      queryParams: [],
      pathParams: [],
      headerParams: [],
    };

    const config = {
      operationId: "testOperation",
      responseMapTypeName: "TestOperationResponseMap",
      shouldGenerateResponseMap: true,
      shouldGenerateRequestMap: false,
      requestMapTypeName: "TestOperationRequestMap",
      parameterGroups: mockParameterGroups,
      contentTypeMaps: {
        responseMapType: `{
  "200": {
    "application/json": TestSchema,
    "application/xml": TestSchema,
  },
}`,
        requestMapType: "{}",
      },
      typeImports: new Set<string>(),
    };

    const result = buildTypeAliases(config);

    /* Verify the DeserializerMap type extracts content types, not status codes */
    expect(result).toContain("TestOperationResponseDeserializerMap");
    expect(result).toContain("keyof typeof TestOperationResponseMap[Status]");
    expect(result).toContain("[keyof typeof TestOperationResponseMap]");

    /* Should not directly index by status codes like the old implementation */
    expect(result).not.toContain(
      "keyof typeof TestOperationResponseMap, import",
    );
  });

  it("should use only config.deserializers without explicit parameter", () => {
    const operation: OperationObject = {
      operationId: "backCompatTest",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                },
              },
            },
          },
        },
      },
    };

    const typeImports = new Set<string>();
    const result = generateResponseHandlers(
      operation,
      typeImports,
      true,
      "BackCompatTestResponseMap",
    );

    /* Parse method should take no parameters */
    expect(result.responseHandlers[0]).toContain("parse: ()");
    expect(result.responseHandlers[0]).not.toContain(
      "parse: (deserializers?:",
    );

    /* Should use only config.deserializers */
    expect(result.responseHandlers[0]).toContain("config.deserializers");
    expect(result.responseHandlers[0]).not.toContain(
      "deserializers || config.deserializers",
    );
  });
});
