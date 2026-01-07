import { describe, expect, it } from "vitest";

import { generateServerOperationWrapper } from "../src/index.js";

describe("server-generator comprehensive validation", () => {
  it("should generate code matching the problem statement example pattern", () => {
    /* Create an operation similar to the problem statement example */
    const operation = {
      operationId: "petFindByStatus",
      parameters: [
        {
          name: "status",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "petId",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^\\d+$" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PetRequest" },
          },
        },
      },
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PetArrayResponse" },
            },
          },
        },
        404: {
          description: "Not found",
          content: {
            "text/plain": {
              schema: { type: "string" },
            },
          },
        },
      },
    };

    const result = generateServerOperationWrapper(
      "/pets/{petId}",
      "get",
      operation as any,
      [],
      {} as any,
    );

    /* Verify it contains the key elements from the problem statement */
    expect(result.wrapperCode).toContain("petFindByStatusWrapper");
    expect(result.wrapperCode).toContain("petFindByStatusHandler");
    expect(result.wrapperCode).toContain("petFindByStatusRouteMetadata");
    expect(result.wrapperCode).toContain("petFindByStatusRouteMetadata.params");
    // Parameter schemas are now accessed from serverRoute.params.shape
    expect(result.wrapperCode).toContain(
      "petFindByStatusRouteMetadata.params.shape.query.safeParse",
    );

    /* Verify validation error types */
    expect(result.wrapperCode).toContain("query-error");
    expect(result.wrapperCode).toContain("path-error");
    expect(result.wrapperCode).toContain("headers-error");
    expect(result.wrapperCode).toContain("body-error");

    /* Verify response type is imported from routes */
    expect(result.wrapperCode).toContain(
      'import type { petFindByStatusResponse } from "../routes/petFindByStatus.js"',
    );
    expect(result.wrapperCode).toContain("petFindByStatusResponse");

    /* Verify validation logic sequence */
    expect(result.wrapperCode).toContain("queryParse.success");
    expect(result.wrapperCode).toContain("pathParse.success");
    // No headers parameter in this operation, so no headersParse
    expect(result.wrapperCode).not.toContain("headersParse.success");
    expect(result.wrapperCode).toContain("bodyParse.success");

    /* Verify success handler call */
    expect(result.wrapperCode).toContain("isValid: true");
    expect(result.wrapperCode).toContain("value: {");
    expect(result.wrapperCode).toContain("query: queryParse.data");
    expect(result.wrapperCode).toContain("path: pathParse.data");
    // No headers in return value since operation has no header parameters
    expect(result.wrapperCode).not.toContain("headers: headersParse.data");
    expect(result.wrapperCode).toContain("body: parsedBody");
  });

  it("should generate proper TypeScript types for discriminated unions", () => {
    const operation = {
      operationId: "testOperation",
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "OK" },
      },
    };

    const result = generateServerOperationWrapper(
      "/test/{id}",
      "get",
      operation as any,
      [],
      {} as any,
    );

    /* Should include validation error discriminated union */
    expect(result.wrapperCode).toContain("testOperationValidationError");
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"query-error"/);
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"path-error"/);
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"headers-error"/);
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"body-error"/);

    /* Should define parsed params type locally with server transformations */
    expect(result.wrapperCode).toContain("testOperationParsedParams");
    // After refactoring, server uses typeof serverRoute.params instead of separate type
    expect(result.wrapperCode).toContain(
      "typeof testOperationRouteMetadata.params",
    );
    expect(result.wrapperCode).toContain("body?: undefined");

    /* Should include handler type with discriminated union */
    expect(result.wrapperCode).toContain("testOperationHandler");
    expect(result.wrapperCode).toContain(
      "{ isValid: true; value: testOperationParsedParams }",
    );
    expect(result.wrapperCode).toContain("testOperationValidationError");
  });
});
