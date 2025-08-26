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
    expect(result.wrapperCode).toContain("query1: z.string()");
    expect(result.wrapperCode).toContain("query2: z.string()");
    expect(result.wrapperCode).toContain("type: \"query_error\"");
    expect(result.wrapperCode).toContain("type: \"path_error\"");
    expect(result.wrapperCode).toContain("type: \"headers_error\"");
    expect(result.wrapperCode).toContain("type: \"body_error\"");
    expect(result.wrapperCode).toContain("type: \"ok\"");
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
    expect(result.wrapperCode).toContain("id: z.string()");
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
    expect(result.wrapperCode).toContain("body_error");
    expect(result.wrapperCode).toContain("parsedBody");
  });
});