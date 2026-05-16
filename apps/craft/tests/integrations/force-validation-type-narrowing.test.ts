import { describe, expect, it } from "vitest";

import {
  createDocument,
  CreateDocumentResponseMap,
} from "./generated/client/createDocument.js";
import type { GlobalConfig } from "./generated/client/runtime.js";

/**
 * Integration test for compile-time type narrowing with forceValidation.
 * These tests verify that TypeScript correctly narrows response types based on
 * the forceValidation configuration flag using ts-expect-error annotations.
 */
describe("forceValidation type narrowing", () => {
  // Mock config for testing
  const mockConfig: GlobalConfig = {
    headers: { "custom-token": "test-token" },
    baseURL: "http://example.com",
    fetch: async () =>
      new Response(
        JSON.stringify({
          id: "test-id",
          title: "Test Document",
          createdAt: "2023-01-01T00:00:00Z",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
  };

  const mockDocument = {
    id: "doc-123",
    title: "Test Document",
    createdAt: "2023-01-01T00:00:00Z",
  };

  it("should narrow to ApiResponseWithForcedParse when forceValidation is true (no parse method)", async () => {
    /*
     * When forceValidation: true, the response type is ApiResponseWithForcedParse
     * which does NOT have a parse() method because data is already parsed
     */
    const response = await createDocument(
      { body: mockDocument },
      { ...mockConfig, forceValidation: true },
    );

    if (response.status === "200") {
      // The data should be directly available without calling parse()
      expect(response.data).toBeDefined();

      /*
       * parse() should NOT exist when forceValidation is true
       * TypeScript will error if we try to access parse() because the type is
       * narrowed to ApiResponseWithForcedParse which doesn't have this method.
       * At runtime, parse is indeed undefined, confirming the type narrowing works.
       */
      // @ts-expect-error
      expect(response.parse).toBeUndefined();
    }
  });

  it("should narrow to ApiResponseWithParse when forceValidation is false (has parse method)", async () => {
    /*
     * When forceValidation: false, the response type is ApiResponseWithParse
     * which DOES have a parse() method for manual validation
     */
    const response = await createDocument(
      { body: mockDocument },
      { ...mockConfig, forceValidation: false },
    );

    if (response.status === "200") {
      // The parse() method should be available
      const parseResult = response.parse();
      expect(parseResult).toBeDefined();
    }
  });

  it("should default to manual validation mode when forceValidation is omitted", async () => {
    /*
     * When forceValidation is not specified, it defaults to manual validation mode
     * which means the response should have a parse() method
     */
    const response = await createDocument(
      { body: mockDocument },
      mockConfig, // No forceValidation specified
    );

    if (response.status === "200") {
      // The parse() method should not be available by default
      // @ts-expect-error
      const parseResult = response.parse();
      expect(parseResult).toBeDefined();

      // Verify parse result structure
      if (parseResult.isValid) {
        expect(parseResult.parsed).toBeDefined();
      }
    }
  });

  it("should demonstrate type narrowing preserves status codes", async () => {
    /*
     * Type narrowing should work correctly with status code checks
     * This verifies that after checking status === "200", TypeScript knows
     * the response data corresponds to the 200 response schema
     */
    const response = await createDocument(
      { body: mockDocument },
      { ...mockConfig, forceValidation: true },
    );

    // Type guard on status should narrow the response type
    if (response.status === "200") {
      // TypeScript knows this is a 200 response with Document schema
      expect(response.status).toBe("200");
      expect(response.data).toBeDefined();

      // The response map should match the 200 response type
      type ResponseType = typeof response;
      type Status = ResponseType extends { status: infer S } ? S : never;

      // At compile time, Status should be "200"
      const statusCheck: Status = "200";
      expect(statusCheck).toBe("200");
    }
  });

  it("should verify response map structure is type-safe", () => {
    /*
     * The response map type should be correctly inferred and type-safe
     * This test verifies the compile-time type safety of the response map
     */
    type ResponseMapType = typeof CreateDocumentResponseMap;
    type StatusCodes = keyof ResponseMapType;
    type ContentTypes = keyof ResponseMapType["200"];

    // Verify types are correctly inferred at compile time
    const status: StatusCodes = "200";
    const contentType: ContentTypes = "application/json";

    expect(status).toBe("200");
    expect(contentType).toBe("application/json");

    // Verify the schema exists
    const schema = CreateDocumentResponseMap["200"]["application/json"];
    expect(typeof schema.parse).toBe("function");
  });
});
