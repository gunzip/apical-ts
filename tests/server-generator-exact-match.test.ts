import { describe, expect, it } from "vitest";

import { generateServerOperationWrapper } from "../src/server-generator/operation-wrapper-generator.js";

describe("server-generator - problem statement validation", () => {
  it("should match exactly the expected output format from problem statement", () => {
    /* Create operation matching the problem statement example */
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

    /* Verify core wrapper function signature */
    expect(result.wrapperCode).toMatch(
      /export function petFindByStatusWrapper\(\s*handler: petFindByStatusHandler,?\s*\)/,
    );

    /* Verify return function signature */
    expect(result.wrapperCode).toMatch(
      /return async \(req: \{\s*query: unknown;\s*path: unknown;\s*headers: unknown;\s*body\?: unknown;\s*contentType\?: .*\s*\}\): Promise<petFindByStatusResponse>/,
    );

    /* Verify validation sequence: query → path → headers → body */
    const validationPattern =
      /queryParse = .*safeParse\(req\.query\)[\s\S]*pathParse = .*safeParse\(req\.path\)[\s\S]*headersParse = .*safeParse\(req\.headers\)[\s\S]*bodyParse = .*safeParse/;
    expect(result.wrapperCode).toMatch(validationPattern);

    /* Verify error handling with correct error types */
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "query-error", error: queryParse\.error, success: false \}\)/,
    );
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "path-error", error: pathParse\.error, success: false \}\)/,
    );
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "headers-error", error: headersParse\.error, success: false \}\)/,
    );
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "body-error", error: bodyParse\.error, success: false \}\)/,
    );

    /* Verify success handler call with all parameters */
    expect(result.wrapperCode).toMatch(
      /return handler\(\{\s*success: true,\s*value: \{\s*query: queryParse\.data,\s*path: pathParse\.data,\s*headers: headersParse\.data,\s*body: parsedBody\s*\},?\s*\}\)/,
    );

    /* Verify discriminated union types are correctly defined */
    expect(result.wrapperCode).toContain("petFindByStatusValidationError");
    expect(result.wrapperCode).toContain("petFindByStatusParsedParams");
    expect(result.wrapperCode).toContain("petFindByStatusHandler");

    /* Verify response type discriminated by status and contentType */
    expect(result.wrapperCode).toMatch(
      /status: 200.*contentType: "application\/json"/,
    );
    expect(result.wrapperCode).toMatch(
      /status: 404.*contentType: "text\/plain"/,
    );

    /* Verify handler type includes both success and error cases */
    expect(result.wrapperCode).toMatch(
      /petFindByStatusHandler = \(\s*params: \{ success: true; value: petFindByStatusParsedParams \} \| petFindByStatusValidationError,?\s*\) => Promise<petFindByStatusResponse>/,
    );
  });

  it("should correctly handle curried function pattern", () => {
    const operation = {
      operationId: "simpleOp",
      responses: { 200: { description: "OK" } },
    };

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test",
      "get",
      operation as any,
      [],
      doc as any,
    );

    /* Verify curried pattern: operationWrapper(handler)(req) */
    expect(result.wrapperCode).toContain("export function simpleOpWrapper(");
    expect(result.wrapperCode).toContain("handler: simpleOpHandler");
    expect(result.wrapperCode).toContain("return async (req:");

    /* Function returns another function that takes req parameter */
    expect(result.wrapperCode).toMatch(
      /return async \(req: \{[^}]+\}\): Promise<[^>]+>/,
    );
  });

  it("should handle missing parameters gracefully with empty schemas", () => {
    const operation = {
      operationId: "noParams",
      responses: { 200: { description: "OK" } },
    };

    const doc = { paths: {}, info: { title: "Test", version: "1.0" } };

    const result = generateServerOperationWrapper(
      "/test",
      "get",
      operation as any,
      [],
      doc as any,
    );

    /* Should generate empty schemas for missing parameters with strict validation for query/path but not headers */
    expect(result.wrapperCode).toContain(
      "noParamsQuerySchema = z.strictObject({})",
    );
    expect(result.wrapperCode).toContain(
      "noParamsPathSchema = z.strictObject({})",
    );
    expect(result.wrapperCode).toContain(
      "noParamsHeadersSchema = z.object({})",
    );

    /* Should still perform validation even with empty schemas */
    expect(result.wrapperCode).toContain(
      "queryParse = noParamsQuerySchema.safeParse(req.query)",
    );
    expect(result.wrapperCode).toContain(
      "pathParse = noParamsPathSchema.safeParse(req.path)",
    );
    expect(result.wrapperCode).toContain(
      "headersParse = noParamsHeadersSchema.safeParse(req.headers)",
    );
  });
});
