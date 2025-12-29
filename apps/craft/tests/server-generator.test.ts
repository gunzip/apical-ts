import { describe, expect, it } from "vitest";

import { generateServerOperationWrapper } from "../src/server-generator/operation-wrapper-generator.js";

describe("server-generator operation wrapper", () => {
  it("should generate a simple operation wrapper with query parameters", () => {
    const operation = {
      operationId: "testSimpleQuery",
      parameters: [
        {
          name: "query1",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "query2",
          in: "query",
          required: false,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: { type: "string" },
            },
          },
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/test",
      "get",
      operation as any,
      [],
      {} as any,
    );

    expect(result.wrapperCode).toContain("testSimpleQueryWrapper");
    expect(result.wrapperCode).toContain("testSimpleQueryRouteMetadata");
    // Parameter schemas are now accessed from serverRoute.params.shape
    expect(result.wrapperCode).toContain(
      "testSimpleQueryRouteMetadata.params.shape.query.safeParse",
    );
    // No path or headers parameters in this operation, so no safeParse for them
    expect(result.wrapperCode).not.toContain(
      "testSimpleQueryRouteMetadata.params.shape.path.safeParse",
    );
    expect(result.wrapperCode).not.toContain(
      "testSimpleQueryRouteMetadata.params.shape.headers.safeParse",
    );
    expect(result.wrapperCode).toContain('kind: "query-error"');
    expect(result.wrapperCode).toContain('kind: "path-error"');
    expect(result.wrapperCode).toContain('kind: "headers-error"');
    expect(result.wrapperCode).toContain('kind: "body-error"');
    expect(result.wrapperCode).toContain("isValid: true");
  });

  it("should use strict validation for server input types (query, path, headers)", () => {
    const operation = {
      operationId: "testStrictValidation",
      parameters: [
        {
          name: "query1",
          in: "query",
          required: true,
          schema: {
            type: "object",
            properties: {
              prop1: { type: "string" },
              prop2: { type: "number" },
            },
            required: ["prop1"],
          },
        },
        {
          name: "pathParam",
          in: "path",
          required: true,
          schema: {
            type: "object",
            properties: {
              id: { type: "string" },
            },
          },
        },
        {
          name: "authorization",
          in: "header",
          required: false,
          schema: {
            type: "object",
            properties: {
              token: { type: "string" },
            },
          },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: { type: "string" },
            },
          },
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/test/{pathParam}",
      "get",
      operation as any,
      [],
      {} as any,
    );

    /* Schema validation now uses server-specific schemas from serverRoute.params.shape */
    expect(result.wrapperCode).toContain(
      "testStrictValidationRouteMetadata.params.shape.query.safeParse",
    );
    expect(result.wrapperCode).toContain(
      "testStrictValidationRouteMetadata.params.shape.path.safeParse",
    );
    expect(result.wrapperCode).not.toContain("z.strictObject(");
  });

  it("should use strict validation for request body when using schema.strict() method", () => {
    const operation = {
      operationId: "testStrictBodyValidation",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "number" },
              },
              required: ["name"],
            },
          },
          "application/xml": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "number" },
              },
              required: ["name"],
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created",
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/test",
      "post",
      operation as any,
      [],
      {} as any,
    );

    /* Verify that request body validation uses schemas from request map imported from routes */
    expect(result.wrapperCode).toContain("schema.safeParse(req.body)");
    expect(result.wrapperCode).toContain("testStrictBodyValidationRequestMap");
    expect(result.wrapperCode).toContain(
      'from "../routes/testStrictBodyValidation.js"',
    );
    expect(result.wrapperCode).toContain("testStrictBodyValidationWrapper");
    expect(result.wrapperCode).toContain("body-error");
    expect(result.wrapperCode).toContain("parsedBody");
  });

  it("should generate wrapper with path parameters", () => {
    const operation = {
      operationId: "testWithPath",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "OK",
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/test/{id}",
      "get",
      operation as any,
      [],
      {} as any,
    );

    expect(result.wrapperCode).toContain("testWithPathRouteMetadata");
    // Path parameter schemas are now accessed from serverRoute.params.shape
    expect(result.wrapperCode).toContain(
      "testWithPathRouteMetadata.params.shape.path.safeParse",
    );
    expect(result.wrapperCode).toContain("pathParse.data");
  });

  it("should generate wrapper with request body", () => {
    const operation = {
      operationId: "testWithBody",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created",
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/test",
      "post",
      operation as any,
      [],
      {} as any,
    );
    expect(result.wrapperCode).toContain("body-error");
    expect(result.wrapperCode).toContain("parsedBody");
  });

  it("should generate route function with correct path and method", () => {
    const operation = {
      operationId: "testAuthBearer",
      parameters: [
        {
          name: "userId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: { type: "string" },
            },
          },
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/auth/{userId}",
      "GET",
      operation as any,
      [],
      {} as any,
    );
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain("return {");
    /* Route metadata is imported and spread */
    expect(result.wrapperCode).toContain(
      "import { serverRoute as testAuthBearerRouteMetadata }",
    );
    expect(result.wrapperCode).toContain("...testAuthBearerRouteMetadata");
    expect(result.wrapperCode).toContain("wrapper: testAuthBearerWrapper");
  });

  it("should generate route function for different HTTP methods", () => {
    const operation = {
      operationId: "createPet",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Created",
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/pets",
      "POST",
      operation as any,
      [],
      {} as any,
    );
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain("return {");
    /* Route metadata is imported and spread */
    expect(result.wrapperCode).toContain(
      "import { serverRoute as createPetRouteMetadata }",
    );
    expect(result.wrapperCode).toContain("...createPetRouteMetadata");
    expect(result.wrapperCode).toContain("wrapper: createPetWrapper");
  });

  it("should preserve complex path parameters in route function", () => {
    const operation = {
      operationId: "updatePetStatus",
      parameters: [
        {
          name: "petId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "statusId",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "OK",
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/pets/{petId}/status/{statusId}",
      "patch",
      operation as any,
      [],
      {} as any,
    );
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain("return {");
    /* Route metadata is imported and spread */
    expect(result.wrapperCode).toContain(
      "import { serverRoute as updatePetStatusRouteMetadata }",
    );
    expect(result.wrapperCode).toContain("...updatePetStatusRouteMetadata");
    expect(result.wrapperCode).toContain("wrapper: updatePetStatusWrapper");
  });

  it("should include operationId and wrapper fields in route function", () => {
    const operation = {
      operationId: "testAuthBearerHttp",
      parameters: [
        {
          name: "authorization",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "OK",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { message: { type: "string" } },
              },
            },
          },
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/test-auth-bearer-http",
      "get",
      operation as any,
      [],
      {} as any,
    );
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain("return {");
    /* Route metadata is imported and spread */
    expect(result.wrapperCode).toContain(
      "import { serverRoute as testAuthBearerHttpRouteMetadata }",
    );
    expect(result.wrapperCode).toContain("...testAuthBearerHttpRouteMetadata");
    expect(result.wrapperCode).toContain("wrapper: testAuthBearerHttpWrapper");

    /* Verify wrapper function is also generated */
    expect(result.wrapperCode).toContain("testAuthBearerHttpWrapper");
  });

  it("should use operationId correctly when provided", () => {
    const operation = {
      operationId:
        "getUsersId" /* Providing operationId like the core generator would do */,
      responses: {
        200: {
          description: "OK",
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/users/{id}",
      "get",
      operation as any,
      [],
      {} as any,
    );
    expect(result.wrapperCode).toContain("export function route() {");
    /* Route metadata is imported from serverRoute and spread */
    expect(result.wrapperCode).toContain(
      "import { serverRoute as getUsersIdRouteMetadata }",
    );
    expect(result.wrapperCode).toContain("...getUsersIdRouteMetadata");
    expect(result.wrapperCode).toContain("wrapper: getUsersIdWrapper");

    /* Verify wrapper function is generated with the correct name */
    expect(result.wrapperCode).toContain("getUsersIdWrapper");
  });
});
