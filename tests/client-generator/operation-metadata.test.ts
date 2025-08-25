import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { extractOperationMetadata } from "../../src/client-generator/operation-function-generator.js";

describe("extractOperationMetadata", () => {
  const basicDoc: OpenAPIObject = {
    info: { title: "Test API", version: "1.0.0" },
    openapi: "3.1.0",
    paths: {},
  };

  it("should extract metadata for operation with body and responses", () => {
    const operation: OperationObject = {
      operationId: "createUser",
      summary: "Create a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/User" },
          },
        },
      },
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        "400": {
          description: "Bad Request",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "string" } },
              },
            },
          },
        },
      },
    };

    const metadata = extractOperationMetadata(
      "/users",
      "post",
      operation,
      [],
      basicDoc,
    );

    /* Basic operation info */
    expect(metadata.functionName).toBe("createUser");
    expect(metadata.operationName).toBe("CreateUser");
    expect(metadata.summary).toBe("/** Create a new user */\n");
    expect(metadata.hasBody).toBe(true);

    /* Type imports should include referenced schemas */
    expect(metadata.typeImports.has("User")).toBe(true);
    expect(metadata.typeImports.has("CreateUser400Response")).toBe(true);

    /* Body info */
    expect(metadata.bodyInfo.shouldGenerateRequestMap).toBe(true);
    expect(metadata.bodyInfo.shouldGenerateResponseMap).toBe(true);
    expect(metadata.bodyInfo.requestMapTypeName).toBe("CreateUserRequestMap");
    expect(metadata.bodyInfo.responseMapTypeName).toBe("CreateUserResponseMap");
    expect(metadata.bodyInfo.requestContentTypes).toEqual(["application/json"]);

    /* Parameter groups should be empty for operation without parameters */
    expect(metadata.parameterGroups.pathParams).toEqual([]);
    expect(metadata.parameterGroups.queryParams).toEqual([]);
    expect(metadata.parameterGroups.headerParams).toEqual([]);

    /* Response handlers */
    expect(metadata.responseHandlers.responseHandlers.length).toBeGreaterThan(
      0,
    );
    expect(metadata.responseHandlers.returnType).toContain("ApiResponse");

    /* Security */
    expect(metadata.overridesSecurity).toBe(false);
    expect(metadata.operationSecurityHeaders).toEqual([]);

    /* Function body should be generated */
    expect(metadata.functionBodyCode).toContain("fetch");
  });

  it("should extract metadata for GET operation without body", () => {
    const operation: OperationObject = {
      operationId: "getUser",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "include",
          in: "query",
          required: false,
          schema: { type: "array", items: { type: "string" } },
        },
      ],
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
        "404": {
          description: "Not Found",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { error: { type: "string" } },
              },
            },
          },
        },
      },
    };

    const metadata = extractOperationMetadata(
      "/users/{id}",
      "get",
      operation,
      [],
      basicDoc,
    );

    /* Basic operation info */
    expect(metadata.functionName).toBe("getUser");
    expect(metadata.operationName).toBe("GetUser");
    expect(metadata.summary).toBe("");
    expect(metadata.hasBody).toBe(false);

    /* Parameter groups should contain path and query params */
    expect(metadata.parameterGroups.pathParams).toHaveLength(1);
    expect(metadata.parameterGroups.pathParams[0].name).toBe("id");
    expect(metadata.parameterGroups.queryParams).toHaveLength(1);
    expect(metadata.parameterGroups.queryParams[0].name).toBe("include");
    expect(metadata.parameterGroups.headerParams).toEqual([]);

    /* Body info should reflect no request body */
    expect(metadata.bodyInfo.shouldGenerateRequestMap).toBe(false);
    /* Response map should be generated when responses contain content */
    expect(metadata.bodyInfo.shouldGenerateResponseMap).toBe(true);
    expect(metadata.bodyInfo.requestContentTypes).toEqual([]);
    expect(metadata.bodyInfo.bodyTypeInfo).toBeUndefined();

    /* Parameter structures should include path and query parameters */
    expect(metadata.parameterStructures.destructuredParams).toContain("path");
    expect(metadata.parameterStructures.destructuredParams).toContain("query");
    expect(metadata.parameterStructures.paramsInterface).toContain(
      "id: string",
    );
  });

  it("should handle operation with path-level parameters", () => {
    const operation: OperationObject = {
      operationId: "updateUser",
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/UserUpdate" },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/User" },
            },
          },
        },
      },
    };

    const pathLevelParameters = [
      {
        name: "id",
        in: "path" as const,
        required: true,
        schema: { type: "string" },
      },
      {
        name: "version",
        in: "header" as const,
        required: false,
        schema: { type: "string" },
      },
    ];

    const metadata = extractOperationMetadata(
      "/users/{id}",
      "put",
      operation,
      pathLevelParameters,
      basicDoc,
    );

    /* Should include path-level parameters */
    expect(metadata.parameterGroups.pathParams).toHaveLength(1);
    expect(metadata.parameterGroups.pathParams[0].name).toBe("id");
    expect(metadata.parameterGroups.headerParams).toHaveLength(1);
    expect(metadata.parameterGroups.headerParams[0].name).toBe("version");

    /* Parameter structures should include both path-level and operation parameters */
    expect(metadata.parameterStructures.destructuredParams).toContain("path");
    expect(metadata.parameterStructures.destructuredParams).toContain(
      "headers",
    );
    expect(metadata.parameterStructures.destructuredParams).toContain("body");
  });

  it("should handle operation with security schemes", () => {
    const docWithSecurity: OpenAPIObject = {
      ...basicDoc,
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
          bearerAuth: {
            type: "http",
            scheme: "bearer",
          },
        },
      },
      security: [{ apiKey: [] }],
    };

    const operation: OperationObject = {
      operationId: "protectedOperation",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Success",
        },
      },
    };

    const metadata = extractOperationMetadata(
      "/protected",
      "get",
      operation,
      [],
      docWithSecurity,
    );

    /* Should detect security override */
    expect(metadata.overridesSecurity).toBe(true);

    /* Should extract operation-specific security headers */
    expect(metadata.operationSecurityHeaders).toHaveLength(1);
    expect(metadata.operationSecurityHeaders[0].headerName).toBe(
      "Authorization",
    );
    expect(metadata.operationSecurityHeaders[0].schemeName).toBe("bearerAuth");

    /* Should extract global auth headers */
    expect(metadata.authHeaders).toContain("X-API-Key");
  });

  it("should handle operation without responses", () => {
    const operation: OperationObject = {
      operationId: "deleteUser",
      responses: {},
    };

    const metadata = extractOperationMetadata(
      "/users/{id}",
      "delete",
      operation,
      [],
      basicDoc,
    );

    /* Should handle empty responses gracefully */
    expect(metadata.functionName).toBe("deleteUser");
    expect(metadata.responseHandlers.responseHandlers).toEqual([]);
    expect(metadata.bodyInfo.shouldGenerateResponseMap).toBe(false);
  });

  it("should throw error when operationId is missing", () => {
    const operation: OperationObject = {
      /* No operationId */
      responses: {
        "200": { description: "Success" },
      },
    };

    expect(() => {
      extractOperationMetadata("/test", "get", operation, [], basicDoc);
    }).toThrow("Operation ID is required");
  });

  it("should handle empty parameter structures correctly", () => {
    const operation: OperationObject = {
      operationId: "simpleOperation",
      responses: {
        "200": { description: "Success" },
      },
    };

    const metadata = extractOperationMetadata(
      "/simple",
      "get",
      operation,
      [],
      basicDoc,
    );

    /* Should generate empty parameter structures */
    expect(metadata.parameterStructures.destructuredParams).toBe("{}");
    expect(metadata.parameterStructures.paramsInterface).toBe("{}");
    expect(metadata.hasBody).toBe(false);
    expect(metadata.bodyInfo.bodyTypeInfo).toBeUndefined();
  });
});
