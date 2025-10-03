import { describe, expect, it } from "vitest";

import { generateServerOperationWrapper } from "../src/server-generator/operation-wrapper-generator.js";

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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/pets/{petId}",
      "get",
      operation as any,
      [],
      doc as any,
    );

    /* Verify it contains the key elements from the problem statement */
    expect(result.wrapperCode).toContain("petFindByStatusWrapper");
    expect(result.wrapperCode).toContain("petFindByStatusHandler");
    expect(result.wrapperCode).toContain("petFindByStatusQuerySchema");
    expect(result.wrapperCode).toContain("petFindByStatusPathSchema");
    // Parameter schemas are now imported, not inline, so we test for usage, not definition
    expect(result.wrapperCode).toContain(
      "petFindByStatusQuerySchema.safeParse",
    );
    expect(result.wrapperCode).toContain("petFindByStatusPathSchema.safeParse");

    /* Verify validation error types */
    expect(result.wrapperCode).toContain("query-error");
    expect(result.wrapperCode).toContain("path-error");
    expect(result.wrapperCode).toContain("headers-error");
    expect(result.wrapperCode).toContain("body-error");

    /* Verify response types */
    expect(result.wrapperCode).toContain('status: "200"');
    expect(result.wrapperCode).toContain('status: "404"');
    expect(result.wrapperCode).toContain("application/json");
    expect(result.wrapperCode).toContain("text/plain");

    /* Verify validation logic sequence */
    expect(result.wrapperCode).toContain("queryParse.success");
    expect(result.wrapperCode).toContain("pathParse.success");
    expect(result.wrapperCode).toContain("headersParse.success");
    expect(result.wrapperCode).toContain("bodyParse.success");

    /* Verify success handler call */
    expect(result.wrapperCode).toContain("isValid: true");
    expect(result.wrapperCode).toContain("value: {");
    expect(result.wrapperCode).toContain("query: queryParse.data");
    expect(result.wrapperCode).toContain("path: pathParse.data");
    expect(result.wrapperCode).toContain("headers: headersParse.data");
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

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test/{id}",
      "get",
      operation as any,
      [],
      doc as any,
    );

    /* Should include validation error discriminated union */
    expect(result.wrapperCode).toContain("testOperationValidationError");
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"query-error"/);
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"path-error"/);
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"headers-error"/);
    expect(result.wrapperCode).toMatch(/\|\s*{\s*kind:\s*"body-error"/);

    /* Should include parsed params type */
    expect(result.wrapperCode).toContain("testOperationParsedParams");
    expect(result.wrapperCode).toContain(
      "query: z.infer<typeof testOperationQuerySchema>",
    );
    expect(result.wrapperCode).toContain(
      "path: z.infer<typeof testOperationPathSchema>",
    );
    expect(result.wrapperCode).toContain(
      "headers: z.infer<typeof testOperationHeadersSchema>",
    );

    /* Should include handler type with discriminated union */
    expect(result.wrapperCode).toContain("testOperationHandler");
    expect(result.wrapperCode).toContain(
      "{ isValid: true; value: testOperationParsedParams }",
    );
    expect(result.wrapperCode).toContain("testOperationValidationError");
  });
});
