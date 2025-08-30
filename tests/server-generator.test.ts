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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test",
      "get",
      operation as any,
      [],
      doc as any,
    );

    expect(result.wrapperCode).toContain("testSimpleQueryWrapper");
    expect(result.wrapperCode).toContain("testSimpleQueryQuerySchema");
    expect(result.wrapperCode).toContain('"query1": z.string()');
    expect(result.wrapperCode).toContain('"query2": z.string()');
    expect(result.wrapperCode).toContain('kind: "query-error"');
    expect(result.wrapperCode).toContain('kind: "path-error"');
    expect(result.wrapperCode).toContain('kind: "headers-error"');
    expect(result.wrapperCode).toContain('kind: "body-error"');
    expect(result.wrapperCode).toContain("success: true");
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test/{pathParam}",
      "get",
      operation as any,
      [],
      doc as any,
    );

    /* Verify that query and path schemas use z.strictObject, but headers use z.object */
    expect(result.wrapperCode).toContain("z.strictObject(");
    expect(result.wrapperCode).toContain("z.object("); // Headers still use z.object
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test",
      "post",
      operation as any,
      [],
      doc as any,
    );

    /* Verify that request body validation uses .strict() method conditionally */
    expect(result.wrapperCode).toContain("schema.strict().safeParse(req.body)");
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test/{id}",
      "get",
      operation as any,
      [],
      doc as any,
    );

    expect(result.wrapperCode).toContain("testWithPathPathSchema");
    expect(result.wrapperCode).toContain('"id": z.string()');
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test",
      "post",
      operation as any,
      [],
      doc as any,
    );

    expect(result.wrapperCode).toContain("testWithBodyWrapper");
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/auth/{userId}",
      "GET",
      operation as any,
      [],
      doc as any,
    );

    expect(result.wrapperCode).toContain("testAuthBearerWrapper");
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain(
      'return { path: "/auth/{userId}", method: "get" } as const;',
    );
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/pets",
      "POST",
      operation as any,
      [],
      doc as any,
    );

    expect(result.wrapperCode).toContain("createPetWrapper");
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain(
      'return { path: "/pets", method: "post" } as const;',
    );
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/pets/{petId}/status/{statusId}",
      "patch",
      operation as any,
      [],
      doc as any,
    );

    expect(result.wrapperCode).toContain("updatePetStatusWrapper");
    expect(result.wrapperCode).toContain("export function route() {");
    expect(result.wrapperCode).toContain(
      'return { path: "/pets/{petId}/status/{statusId}", method: "patch" } as const;',
    );
  });
});
