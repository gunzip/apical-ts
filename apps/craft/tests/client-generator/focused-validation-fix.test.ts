import { describe, expect, it } from "vitest";
import type { OperationObject } from "openapi3-ts/oas31";

import { generateResponseHandlers } from "../../src/client-generator/responses.js";

describe("Focused test for forced validation response structure", () => {
  it("should generate correct structure with parseResult.parsed for forced validation", () => {
    const operation: OperationObject = {
      operationId: "testOperation",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                },
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
      "TestOperationResponseMap",
    );

    /* Verify that forced validation uses parseResult.parsed, not parseResult */
    expect(result.responseHandlers[0]).toContain("parsed: parseResult.parsed");
    expect(result.responseHandlers[0]).not.toContain("parsed: parseResult,");

    /* Verify the structure includes conditional logic for force validation */
    expect(result.responseHandlers[0]).toContain("if (config.forceValidation)");
    expect(result.responseHandlers[0]).toContain(
      'if ("parsed" in parseResult)',
    );

    /* Verify manual validation branch still exists */
    expect(result.responseHandlers[0]).toContain("} else {");
    expect(result.responseHandlers[0]).toContain("parse: () =>");
  });
});
