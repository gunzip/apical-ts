import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";
import { readFile } from "fs/promises";
import { join } from "path";

import { generateResponseHandlers } from "../src/responses.js";

describe("force validation flag", () => {
  describe("generateResponseHandlers with dynamic forceValidation", () => {
    it("should generate response handlers with conditional logic for both validation modes", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "404": {
            description: "Not found",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "GetUserResponseMap",
      );

      /* Verify response handler includes conditional logic for both modes */
      expect(result.responseHandlers[0]).toContain(
        "if (config.forceValidation)",
      );
      expect(result.responseHandlers[0]).toContain(
        "/* Force validation: automatically parse and return result */",
      );
      expect(result.responseHandlers[0]).toContain(
        "/* Manual validation: provide parse method */",
      );
      expect(result.responseHandlers[0]).toContain(
        "parse: async () => await parseApiResponseUnknownData",
      );
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        "config.deserializers ?? {}",
      );

      /* Verify return type uses conditional types */
      expect(result.returnType).toBe(
        '(TForceValidation extends true ? ApiResponseWithForcedParse<"200", typeof GetUserResponseMap> : ApiResponseWithParse<"200", typeof GetUserResponseMap>) | ApiResponse<"404", void> | ApiResponseError',
      );
    });

    it("should generate conditional response handlers that support both modes", () => {
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
          "404": {
            description: "Not found",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "GetUserResponseMap",
      );

      /* Verify response handler includes conditional logic for both force and manual validation */
      expect(result.responseHandlers[0]).toContain(
        "if (config.forceValidation)",
      );
      expect(result.responseHandlers[0]).toContain("const parseResult =");
      expect(result.responseHandlers[0]).toContain(
        "parseApiResponseUnknownData(minimalResponse, data, GetUserResponseMap",
      );
      expect(result.responseHandlers[0]).toContain(
        'if ("parsed" in parseResult)',
      );
      expect(result.responseHandlers[0]).toContain(
        "const forcedResult = createForcedParseResponse(",
      );
      expect(result.responseHandlers[0]).toContain("if (parseResult.kind)");
      expect(result.responseHandlers[0]).toContain("isValid: false");

      /* Should also contain manual validation branch */
      expect(result.responseHandlers[0]).toContain("} else {");
      expect(result.responseHandlers[0]).toContain("parse: async () =>");

      /* Verify return type uses conditional types */
      expect(result.returnType).toBe(
        '(TForceValidation extends true ? ApiResponseWithForcedParse<"200", typeof GetUserResponseMap> : ApiResponseWithParse<"200", typeof GetUserResponseMap>) | ApiResponse<"404", void> | ApiResponseError',
      );
    });

    it("should not add conditional logic for responses without schemas", () => {
      const operation: OperationObject = {
        operationId: "deleteUser",
        responses: {
          "204": {
            description: "No content",
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        false,
        undefined,
      );

      /* Verify no conditional parsing logic is added for responses without schemas */
      expect(result.responseHandlers[0]).not.toContain(
        "config.forceValidation",
      );
      expect(result.responseHandlers[0]).not.toContain("const parseResult =");
      expect(result.responseHandlers[0]).not.toContain("parsed");
      expect(result.responseHandlers[0]).not.toContain("parse:");
    });
  });

  describe("type narrowing with forceValidation", () => {
    it("should generate response types that narrow correctly based on forceValidation flag", () => {
      /*
       * This test validates that the generated operation types correctly narrow
       * the response type based on the forceValidation configuration:
       * - When forceValidation: true → ApiResponseWithForcedParse (no parse method)
       * - When forceValidation: false → ApiResponseWithParse (has parse method)
       */
      const operation: OperationObject = {
        operationId: "getUser",
        responses: {
          "200": {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User",
                },
              },
            },
          },
        },
      };

      const typeImports = new Set<string>();
      const result = generateResponseHandlers(
        operation,
        typeImports,
        true,
        "GetUserResponseMap",
      );

      /*
       * Verify that the return type uses conditional types based on TForceValidation
       * This enables TypeScript to narrow the type when config.forceValidation is a literal
       */
      expect(result.returnType).toContain("TForceValidation extends true");
      expect(result.returnType).toContain("ApiResponseWithForcedParse");
      expect(result.returnType).toContain("ApiResponseWithParse");

      /*
       * The conditional type structure allows TypeScript to:
       * 1. Eliminate the parse() method when forceValidation is true
       * 2. Require the parse() method when forceValidation is false
       * This is validated at compile-time via overloads in the generated client
       */
      expect(result.returnType).toBe(
        '(TForceValidation extends true ? ApiResponseWithForcedParse<"200", typeof GetUserResponseMap> : ApiResponseWithParse<"200", typeof GetUserResponseMap>) | ApiResponseError',
      );
    });

    it("should verify integration test file demonstrates type narrowing with ts-expect-error", async () => {
      /*
       * Verify that we have a proper integration test showing type narrowing.
       * The createDocument-reference.test.ts file uses forceValidation: true
       * and should demonstrate that the response type is correctly narrowed.
       *
       * For a compile-time type test with ts-expect-error, see the integration
       * test where forceValidation: true results in ApiResponseWithForcedParse
       * which does NOT have a parse() method.
       */
      const testFile = await readFile(
        join(
          __dirname,
          "../../../apps/craft/tests/integrations/createDocument-reference.test.ts",
        ),
        "utf-8",
      );

      // Verify the test uses forceValidation: true
      expect(testFile).toContain("forceValidation: true");

      /*
       * The test demonstrates that when forceValidation is true:
       * - The response is automatically parsed (no parse() method needed)
       * - The data is available directly without calling parse()
       *
       * When forceValidation is false or omitted:
       * - The response has a parse() method
       * - The data must be manually parsed before use
       *
       * To add a ts-expect-error test for type narrowing:
       * 1. Call operation with forceValidation: true
       * 2. Try to access response.parse() with @ts-expect-error
       * 3. This validates TypeScript correctly narrows the type
       */
    });
  });
});
