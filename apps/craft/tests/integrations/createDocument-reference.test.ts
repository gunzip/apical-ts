import { describe, expect, it } from "vitest";

import {
  createDocument,
  CreateDocumentResponseMap,
} from "./generated/client/createDocument.js";

describe("createDocument response reference integration", () => {
  it("should have correctly populated response map", () => {
    // Verify that the response map is not empty and contains the correct structure
    expect(CreateDocumentResponseMap).toEqual({
      "200": {
        "application/json": expect.any(Object), // Should be the documentalias Zod schema
      },
    });

    // Verify the schema is actually a Zod schema by checking for parse method
    const schema = CreateDocumentResponseMap["200"]["application/json"];
    expect(typeof schema.parse).toBe("function");
  });

  it("should have correct TypeScript signature for response types", () => {
    // This test verifies the TypeScript types are correct at compile time
    // If the response reference resolution worked correctly, the function should:
    // 1. Accept the Document type in request body
    // 2. Return ApiResponseWithForcedParse<"200", typeof CreateDocumentResponseMap>

    // Mock a successful response for type checking
    const mockDocument = {
      id: "doc-123",
      title: "Test Document",
      createdAt: "2023-01-01T00:00:00Z",
    };

    // The function call should compile without errors - this validates the types
    const promise = createDocument(
      { body: mockDocument },
      {
        baseURL: "http://example.com",
        fetch: async () => {
          // Mock a successful response
          return new Response(JSON.stringify(mockDocument), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        },
        headers: {},
        forceValidation: true,
      },
    );

    // Verify the return type is a Promise
    expect(promise).toBeInstanceOf(Promise);
  });

  it("should handle response reference resolution in type system", () => {
    // Test that the response map type correctly maps to the Document schema
    // This verifies that the $ref resolution worked for type generation

    type ResponseMapType = typeof CreateDocumentResponseMap;
    type Status200Type = ResponseMapType["200"];
    type JsonType = Status200Type["application/json"];

    // At compile time, JsonType should be the document schema
    // At runtime, we can verify it's a proper Zod schema
    const schema = CreateDocumentResponseMap["200"]["application/json"];

    // Verify it can parse valid document data
    const validDocument = {
      id: "doc-456",
      title: "Another Test Document",
      createdAt: "2023-01-02T00:00:00Z",
    };

    expect(() => schema.parse(validDocument)).not.toThrow();

    // Verify it rejects invalid data
    const invalidDocument = {
      id: "doc-789",
      // missing required title and createdAt
    };

    expect(() => schema.parse(invalidDocument)).toThrow();
  });
});
