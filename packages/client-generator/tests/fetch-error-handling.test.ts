import { describe, expect, it } from "vitest";

import { generateOperationFunction } from "../src/operation-function-generator.js";

describe("Fetch Error Handling", () => {
  it("should generate inner try/catch around fetch request", () => {
    const pathKey = "/test";
    const method = "get";
    const operation = {
      operationId: "testOperation",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { type: "string" },
            },
          },
        },
      },
    };
    const doc = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {},
    };

    const result = generateOperationFunction(
      pathKey,
      method,
      operation as any,
      [],
      doc,
    );

    /* Verify inner try/catch structure is present */
    expect(result.functionCode).toContain(
      "/* Inner try/catch for fetch-specific errors */",
    );
    expect(result.functionCode).toContain("let response: Response;");
    expect(result.functionCode).toContain("let data: unknown;");
    expect(result.functionCode).toContain(
      "let minimalResponse: { status: number; headers: Map<string, string> };",
    );

    /* Verify fetch is wrapped in inner try/catch */
    expect(result.functionCode).toContain("try {");
    expect(result.functionCode).toContain(
      "response = await config.fetch(url.toString(), {",
    );
    expect(result.functionCode).toContain(
      "data = await parseResponseBody(response);",
    );
    expect(result.functionCode).toContain("} catch (error) {");

    /* Verify fetch-error is returned in inner catch */
    expect(result.functionCode).toContain(`return {
        isValid: false,
        status: undefined,
        kind: "fetch-error",
        error,
      } as const;`);

    /* Verify outer try/catch still exists for unexpected errors */
    expect(result.functionCode).toContain(`return {
      isValid: false,
      status: undefined,
      kind: "unexpected-error",
      error,
    } as const;`);
  });

  it("should handle operation with body correctly", () => {
    const pathKey = "/test";
    const method = "post";
    const operation = {
      operationId: "testPostOperation",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { name: { type: "string" } },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: { type: "string" },
            },
          },
        },
      },
    };
    const doc = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {},
    };

    const result = generateOperationFunction(
      pathKey,
      method,
      operation as any,
      [],
      doc,
    );

    /* Verify fetch call includes body parameter and is wrapped in inner try/catch */
    expect(result.functionCode).toContain('method: "POST"');
    expect(result.functionCode).toContain("body: bodyContent,");
    expect(result.functionCode).toContain(
      "/* Inner try/catch for fetch-specific errors */",
    );
    expect(result.functionCode).toContain('kind: "fetch-error"');
  });

  it("should preserve existing error handling for non-fetch errors", () => {
    const pathKey = "/test";
    const method = "get";
    const operation = {
      operationId: "testOperation",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: { type: "string" },
            },
          },
        },
      },
    };
    const doc = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0.0" },
      paths: {},
    };

    const result = generateOperationFunction(
      pathKey,
      method,
      operation as any,
      [],
      doc,
    );

    /* Verify both inner and outer error handling exist */
    const fetchErrorIndex = result.functionCode.indexOf('kind: "fetch-error"');
    const unexpectedErrorIndex = result.functionCode.indexOf(
      'kind: "unexpected-error"',
    );

    expect(fetchErrorIndex).toBeGreaterThan(-1);
    expect(unexpectedErrorIndex).toBeGreaterThan(-1);
    expect(unexpectedErrorIndex).toBeGreaterThan(fetchErrorIndex); // unexpected-error should come after fetch-error
  });
});
