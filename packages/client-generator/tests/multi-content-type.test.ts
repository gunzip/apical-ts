import type { OperationObject, OpenAPIObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { generateOperationFunction } from "../src/operation-function-generator.js";

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
    } as unknown as OpenAPIObject;

    const result = generateOperationFunction(
      "/pets/findByStatus",
      "post",
      operation,
      [],
      doc,
    );

    // Check that type maps are re-exported from routes (as const exports)
    expect(result.functionCode).toContain(
      "export const PetFindByStatusRequestMap = petFindByStatusRequestMap",
    );
    expect(result.functionCode).toContain(
      "export const PetFindByStatusResponseMap = petFindByStatusResponseMap",
    );

    // Check generic function signature uses re-exported PascalCase type names
    expect(result.functionCode).toContain(
      "export async function petFindByStatus<",
    );
    expect(result.functionCode).toContain(
      'TRequestContentType extends keyof PetFindByStatusRequestMap = "application/json"',
    );
    // Response generic now present to allow Accept header negotiation
    expect(result.functionCode).toContain(
      "TResponseContentType extends { [K in keyof PetFindByStatusResponseMap]: keyof PetFindByStatusResponseMap[K]; }[keyof PetFindByStatusResponseMap] =",
    );

    // Check parameter type uses generic with z.infer for runtime schema validation
    expect(result.functionCode).toContain(
      "body: import('zod').infer<PetFindByStatusRequestMap[TRequestContentType]>",
    );
    // contentType now supports both request and response overrides
    expect(result.functionCode).toContain(
      "contentType?: { request?: TRequestContentType; response?: TResponseContentType }",
    );

    // Check NO options parameter (contentType should be in first parameter now)
    expect(result.functionCode).not.toContain("options?: {");

    // Check return type uses precise ApiResponseWithParse types (using camelCase imported route names in typeof)
    expect(result.functionCode).toContain(
      'Promise<(TForceValidation extends true ? ApiResponseWithForcedParse<"200", typeof petFindByStatusResponseMap> : ApiResponseWithParse<"200", typeof petFindByStatusResponseMap>) | (TForceValidation extends true ? ApiResponseWithForcedParse<"404", typeof petFindByStatusResponseMap> : ApiResponseWithParse<"404", typeof petFindByStatusResponseMap>) | ApiResponseError>',
    );

    // Check discriminated union type definition is NOT generated for client operations
    expect(result.functionCode).not.toContain(
      "export type PetFindByStatusOperationResponse =",
    );
    expect(result.functionCode).not.toContain(
      '{ status: 200; contentType: "application/json"; data: PetFindByStatus200Response }',
    );
    expect(result.functionCode).not.toContain(
      '{ status: 200; contentType: "application/xml"; data: PetFindByStatus200Response }',
    );
    expect(result.functionCode).not.toContain(
      '{ status: 404; contentType: "text/plain"; data: PetFindByStatus404Response }',
    );

    // Check dynamic content type handling looks for contentType in first parameter
    expect(result.functionCode).toContain(
      'const finalRequestContentType = params.contentType?.request || "application/json";',
    );
    expect(result.functionCode).toContain("switch (finalRequestContentType)");
    // Accept header now emitted for response negotiation
    expect(result.functionCode).toContain(
      '"Accept": params.contentType?.response || "application/json",',
    );

    // Check type imports - after refactoring, we import from routes not schemas
    const routeImports = result.importManager.getRouteImports();
    expect(
      routeImports.some((imp) => imp.operationId === "petFindByStatus"),
    ).toBe(true);
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
    } as unknown as OpenAPIObject;

    const result = generateOperationFunction(
      "/users/{id}",
      "get",
      operation,
      [],
      doc,
    );

    // Should now ALWAYS re-export type maps from routes
    expect(result.functionCode).toContain("export const GetUserRequestMap");
    expect(result.functionCode).toContain("export const GetUserResponseMap");

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
    } as unknown as OpenAPIObject;

    const result = generateOperationFunction(
      "/users/{id}",
      "get",
      operation,
      [],
      doc,
    );

    // Should re-export response map from routes for GET operations with responses
    expect(result.functionCode).toContain(
      "export const GetUserByIdResponseMap",
    );

    // Should NOT re-export request map for GET operations with no request body
    expect(result.functionCode).not.toContain("GetUserByIdRequestMap");

    // Should have generic parameter for response (no request body), using re-exported type
    expect(result.functionCode).toContain(
      "TResponseContentType extends { [K in keyof GetUserByIdResponseMap]: keyof GetUserByIdResponseMap[K]; }[keyof GetUserByIdResponseMap]",
    );
    // Should include contentType with response override only
    expect(result.functionCode).toContain(
      "contentType?: { response?: TResponseContentType }",
    );
    // Accept header emitted
    expect(result.functionCode).toContain("contentType?.response");
  });
});
