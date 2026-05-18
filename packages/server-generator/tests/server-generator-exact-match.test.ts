import { describe, expect, it } from "vitest";

import { generateServerOperationWrapper } from "../src/index.js";

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

    const result = generateServerOperationWrapper(
      "/pets/{petId}",
      "get",
      operation as any,
      [],
      {} as any,
    );

    /* Verify core wrapper function signature */
    expect(result.wrapperCode).toMatch(
      /export function petFindByStatusWrapper\(\s*handler: petFindByStatusHandler,?\s*\)/,
    );

    /* Verify return function signature */
    expect(result.wrapperCode).toMatch(
      /return async \(req: \{\s*query: unknown;\s*path: unknown;\s*headers: unknown;\s*body\?: unknown;\s*contentType\?: .*\s*\}\): Promise<petFindByStatusRouteResponse>/,
    );

    /* Verify validation sequence: query → path → body (no headers in this operation) */
    const validationPattern =
      /queryParse = await validateStandardSchema\(.*req\.query\)[\s\S]*pathParse = await validateStandardSchema\(.*req\.path\)[\s\S]*bodyParse = await validateStandardSchema/;
    expect(result.wrapperCode).toMatch(validationPattern);

    /* Verify error handling with correct error types */
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "query-error", error: queryParse\.error, isValid: false \}\)/,
    );
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "path-error", error: pathParse\.error, isValid: false \}\)/,
    );
    // No headers in this operation, so no headersParse error handling
    expect(result.wrapperCode).not.toContain("headersParse");
    expect(result.wrapperCode).toMatch(
      /return handler\(\{ kind: "body-error", error: bodyParse\.error, isValid: false \}\)/,
    );

    /* Verify success handler call with query, path, and body (no headers) */
    expect(result.wrapperCode).toMatch(
      /return handler\(\{\s*isValid: true,\s*value: \{\s*query: queryParse\.value,\s*path: pathParse\.value,\s*body: parsedBody\s*\},?\s*\}\)/,
    );

    /* Verify discriminated union types are correctly defined */
    expect(result.wrapperCode).toContain("petFindByStatusValidationError");
    expect(result.wrapperCode).toContain("petFindByStatusParsedParams");
    expect(result.wrapperCode).toContain("petFindByStatusHandler");

    /* Verify response type is imported from routes */
    expect(result.wrapperCode).toContain(
      'import type { petFindByStatusRouteResponse } from "../routes/petFindByStatus.ts"',
    );
    expect(result.wrapperCode).toContain("petFindByStatusRouteResponse");

    /* Verify handler type includes both success and error cases */
    expect(result.wrapperCode).toMatch(
      /petFindByStatusHandler = \(\s*params: \{ isValid: true; value: petFindByStatusParsedParams \} \| petFindByStatusValidationError,?\s*\) => Promise<petFindByStatusRouteResponse>/,
    );
  });

  it("should correctly handle curried function pattern", () => {
    const operation = {
      operationId: "simpleOp",
      responses: { 200: { description: "OK" } },
    };

    const result = generateServerOperationWrapper(
      "/test",
      "get",
      operation as any,
      [],
      {} as any,
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

    const result = generateServerOperationWrapper(
      "/test",
      "get",
      operation as any,
      [],
      {} as any,
    );

    /* Should reference server parameter schemas from serverRoute.params */
    expect(result.wrapperCode).toContain("noParamsRouteMetadata");

    /* Should NOT perform validation when there are no parameters */
    expect(result.wrapperCode).not.toContain(
      "validateStandardSchema(noParamsRouteMetadata.params.shape.query, req.query)",
    );
    expect(result.wrapperCode).not.toContain(
      "validateStandardSchema(noParamsRouteMetadata.params.shape.path, req.path)",
    );
    expect(result.wrapperCode).not.toContain(
      "validateStandardSchema(noParamsRouteMetadata.params.shape.headers, req.headers)",
    );

    /* ParsedParams type should not include query, path, or headers fields when not present */
    const parsedParamsMatch = result.wrapperCode.match(
      /type noParamsParsedParams = \{([^}]+)\}/s,
    );
    expect(parsedParamsMatch).toBeDefined();
    if (parsedParamsMatch) {
      const parsedParamsBody = parsedParamsMatch[1];
      expect(parsedParamsBody).not.toContain("query");
      expect(parsedParamsBody).not.toContain("path");
      expect(parsedParamsBody).not.toContain("headers");
      expect(parsedParamsBody).toContain("body");
    }

    /* Return value should not include query, path, or headers when not present */
    expect(result.wrapperCode).not.toContain("query: queryParse.value");
    expect(result.wrapperCode).not.toContain("path: pathParse.value");
    expect(result.wrapperCode).not.toContain("headers: headersParse.value");
  });
});
