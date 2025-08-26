import type { OperationObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { generateOperationFunction } from "../../src/client-generator/operation-function-generator.js";
import { generateContentTypeMaps } from "../../src/client-generator/responses.js";

describe("Multi-content-type operation function generation", () => {
  it("should always generate function with type maps and contentType in first parameter", () => {
    const operation: OperationObject = {
      operationId: "petFindByStatus",
      summary: "Find pets by status",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Pet" },
          },
          "application/x-www-form-urlencoded": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                status: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/Pet" },
              },
            },
            "application/xml": {
              schema: { type: "string" },
            },
          },
        },
        "404": {
          description: "Not Found",
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
          },
        },
      },
    };

    const doc = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {},
    };

    const result = generateOperationFunction(
      "/pets/findByStatus",
      "post",
      operation,
      [],
      doc,
    );

    // Check that type maps are always generated
    expect(result.functionCode).toContain(
      "export type PetFindByStatusRequestMap = {",
    );
    expect(result.functionCode).toContain('"application/json": Pet;');
    expect(result.functionCode).toContain(
      '"application/x-www-form-urlencoded": PetFindByStatusRequest;',
    );

    expect(result.functionCode).toContain(
      "export type PetFindByStatusResponseMap = {",
    );
    expect(result.functionCode).toContain(
      '"application/json": PetFindByStatus200Response,',
    );
    expect(result.functionCode).toContain(
      '"application/xml": PetFindByStatus200Response,',
    );
    expect(result.functionCode).toContain(
      '"text/plain": PetFindByStatus404Response,',
    );

    // Check generic function signature
    expect(result.functionCode).toContain(
      "export async function petFindByStatus<",
    );
    expect(result.functionCode).toContain(
      'TRequestContentType extends keyof PetFindByStatusRequestMap = "application/json"',
    );
    // Response generic now present to allow Accept header negotiation
    expect(result.functionCode).toContain(
      "TResponseContentType extends keyof PetFindByStatusResponseMap =",
    );

    // Check parameter type uses generic and includes contentType in first parameter
    expect(result.functionCode).toContain(
      "body: PetFindByStatusRequestMap[TRequestContentType];",
    );
    // contentType now supports both request and response overrides
    expect(result.functionCode).toContain(
      "contentType?: { request?: TRequestContentType; response?: TResponseContentType }",
    );

    // Check NO options parameter (contentType should be in first parameter now)
    expect(result.functionCode).not.toContain("options?: {");

    // Check return type uses discriminated union response types  
    expect(result.functionCode).toContain(
      "Promise<ApiResponse<200, unknown> | ApiResponse<404, unknown>>",
    );

    // Check discriminated union type definition is generated
    expect(result.functionCode).toContain(
      "export type PetFindByStatusResponse =",
    );
    expect(result.functionCode).toContain(
      '{ status: 200; contentType: "application/json"; data: import("zod").infer<typeof PetFindByStatus200Response> }',
    );
    expect(result.functionCode).toContain(
      '{ status: 200; contentType: "application/xml"; data: import("zod").infer<typeof PetFindByStatus200Response> }',
    );
    expect(result.functionCode).toContain(
      '{ status: 404; contentType: "text/plain"; data: import("zod").infer<typeof PetFindByStatus404Response> }',
    );

    // Check dynamic content type handling looks for contentType in first parameter
    expect(result.functionCode).toContain(
      'const finalRequestContentType = contentType?.request || "application/json";',
    );
    expect(result.functionCode).toContain("switch (finalRequestContentType)");
    // Accept header now emitted for response negotiation
    expect(result.functionCode).toContain(
      '"Accept": contentType?.response || "application/json",',
    );

    // Check type imports
    expect(result.typeImports.has("Pet")).toBe(true);
    expect(result.typeImports.has("PetFindByStatusRequest")).toBe(true);
    expect(result.typeImports.has("PetFindByStatus200Response")).toBe(true);
    expect(result.typeImports.has("PetFindByStatus404Response")).toBe(true);
  });

  it("should generate function with type maps even for single content type operations", () => {
    const operation: OperationObject = {
      operationId: "getUser",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/User" },
          },
        },
      },
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
      },
    };

    const doc = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {},
    };

    const result = generateOperationFunction(
      "/users/{id}",
      "get",
      operation,
      [],
      doc,
    );

    // Should now ALWAYS generate type maps
    expect(result.functionCode).toContain("export type GetUserRequestMap");
    expect(result.functionCode).toContain("export type GetUserResponseMap");

    // Should have generic parameters
    expect(result.functionCode).toContain("export async function getUser<");

    // Should include contentType parameter with request & response in unknown mode
    expect(result.functionCode).toContain(
      "contentType?: { request?: TRequestContentType; response?: TResponseContentType }",
    );
  });

  it("should generate regular function for GET operations with no request body", () => {
    const operation: OperationObject = {
      operationId: "getUserById",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
      },
    };

    const doc = {
      info: { title: "Test API", version: "1.0.0" },
      openapi: "3.1.0",
      paths: {},
    };

    const result = generateOperationFunction(
      "/users/{id}",
      "get",
      operation,
      [],
      doc,
    );

    // Should generate response map for GET operations with responses
    expect(result.functionCode).toContain("export type GetUserByIdResponseMap");

    // Should NOT generate request map for GET operations with no request body
    expect(result.functionCode).not.toContain(
      "export type GetUserByIdRequestMap",
    );

    // Should have generic parameter for response (no request body)
    expect(result.functionCode).toContain(
      "TResponseContentType extends keyof GetUserByIdResponseMap",
    );
    // Should include contentType with response override only
    expect(result.functionCode).toContain(
      "contentType?: { response?: TResponseContentType }",
    );
    // Accept header emitted
    expect(result.functionCode).toContain("contentType?.response");
  });
});
