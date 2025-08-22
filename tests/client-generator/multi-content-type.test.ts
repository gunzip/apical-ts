import type { OperationObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { generateOperationFunction } from "../../src/client-generator/operation-function-generator.js";

describe("Multi-content-type operation function generation", () => {
  it("should generate function with generic content type support", () => {
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
                status: { type: "string" }
              }
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
                items: { $ref: "#/components/schemas/Pet" }
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

    // Check that type maps are generated
    expect(result.functionCode).toContain("export type PetFindByStatusRequestMap = {");
    expect(result.functionCode).toContain('"application/json": Pet;');
    expect(result.functionCode).toContain('"application/x-www-form-urlencoded": PetFindByStatusRequest;');
    
    expect(result.functionCode).toContain("export type PetFindByStatusResponseMap = {");
    expect(result.functionCode).toContain('"application/json": ApiResponse<200, PetFindByStatus200Response>;');
    expect(result.functionCode).toContain('"application/xml": ApiResponse<200, PetFindByStatus200Response>;');
    expect(result.functionCode).toContain('"text/plain": ApiResponse<404, PetFindByStatus404Response>;');
    
    // Check generic function signature
    expect(result.functionCode).toContain("export async function petFindByStatus<");
    expect(result.functionCode).toContain("TRequestContentType extends keyof PetFindByStatusRequestMap = \"application/json\"");
    expect(result.functionCode).toContain("TResponseContentType extends keyof PetFindByStatusResponseMap = \"application/json\"");
    
    // Check parameter type uses generic
    expect(result.functionCode).toContain("body: PetFindByStatusRequestMap[TRequestContentType];");
    
    // Check options parameter
    expect(result.functionCode).toContain("options?: { requestContentType?: TRequestContentType; responseContentType?: TResponseContentType }");
    
    // Check return type uses generic
    expect(result.functionCode).toContain("Promise<PetFindByStatusResponseMap[TResponseContentType]>");
    
    // Check dynamic content type handling
    expect(result.functionCode).toContain("const finalRequestContentType = options?.requestContentType || \"application/json\";");
    expect(result.functionCode).toContain("switch (finalRequestContentType)");
    expect(result.functionCode).toContain("\"Accept\": options?.responseContentType || \"application/json\",");
    
    // Check type imports
    expect(result.typeImports.has("Pet")).toBe(true);
    expect(result.typeImports.has("PetFindByStatusRequest")).toBe(true);
    expect(result.typeImports.has("PetFindByStatus200Response")).toBe(true);
    expect(result.typeImports.has("PetFindByStatus404Response")).toBe(true);
  });

  it("should generate regular function for single content type operations", () => {
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

    // Should NOT generate type maps for single content type
    expect(result.functionCode).not.toContain("export type GetUserRequestMap");
    expect(result.functionCode).not.toContain("export type GetUserResponseMap");
    
    // Should NOT have generic parameters
    expect(result.functionCode).not.toContain("export async function getUser<");
    
    // Should have normal function signature
    expect(result.functionCode).toContain("export async function getUser(");
    
    // Should NOT have options parameter for content types
    expect(result.functionCode).not.toContain("requestContentType?: TRequestContentType");
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

    console.log("Generated function code:");
    console.log(result.functionCode);

    // Should NOT generate type maps for single content type
    expect(result.functionCode).not.toContain("export type GetUserByIdRequestMap");
    expect(result.functionCode).not.toContain("export type GetUserByIdResponseMap");
    
    // Should NOT have generic parameters
    expect(result.functionCode).not.toContain("export async function getUserById<");
    
    // Should have normal function signature
    expect(result.functionCode).toContain("export async function getUserById(");
    
    // Should NOT have options parameter for content types
    expect(result.functionCode).not.toContain("options?.responseContentType");
    
    // Should have normal headers without options references
    expect(result.functionCode).not.toContain("Accept: options?.responseContentType");
  });
});