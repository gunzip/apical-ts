import { describe, it, expect } from "vitest";
import { testQueryParamInlineEnum } from "../integrations/generated/client/testQueryParamInlineEnum.js";

describe("Query Parameter Integration", () => {
  it("should correctly serialize complex query parameters in real operations", async () => {
    // Mock fetch to capture the URL that gets called
    let capturedUrl: string = "";
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(null, { status: 404 });
    };

    // Call the operation with array parameter
    const result = await testQueryParamInlineEnum(
      {
        query: {
          "fields[catalog-item-bulk-create-job]": [
            "status",
            "created_at",
            "total_count",
          ],
        },
      },
      {
        baseURL: "https://api.example.com",
        fetch: mockFetch,
        headers: {},
        forceValidation: false,
      },
    );

    // Check that the URL contains properly serialized parameters
    expect(capturedUrl).toContain(
      "fields%5Bcatalog-item-bulk-create-job%5D=status",
    );
    expect(capturedUrl).toContain(
      "fields%5Bcatalog-item-bulk-create-job%5D=created_at",
    );
    expect(capturedUrl).toContain(
      "fields%5Bcatalog-item-bulk-create-job%5D=total_count",
    );

    // Check that it's using exploded format (multiple parameters with same name)
    const url = new URL(capturedUrl);
    const params = url.searchParams.getAll(
      "fields[catalog-item-bulk-create-job]",
    );
    expect(params).toEqual(["status", "created_at", "total_count"]);
  });

  it("should handle empty arrays correctly", async () => {
    let capturedUrl: string = "";
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(null, { status: 404 });
    };

    const result = await testQueryParamInlineEnum(
      {
        query: {
          "fields[catalog-item-bulk-create-job]": [],
        },
      },
      {
        baseURL: "https://api.example.com",
        fetch: mockFetch,
        headers: {},
        forceValidation: false,
      },
    );

    // Empty arrays should not add any query parameters
    const url = new URL(capturedUrl);
    expect(url.searchParams.has("fields[catalog-item-bulk-create-job]")).toBe(
      false,
    );
  });

  it("should handle undefined query parameters correctly", async () => {
    let capturedUrl: string = "";
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(null, { status: 404 });
    };

    const result = await testQueryParamInlineEnum(
      {
        query: {},
      },
      {
        baseURL: "https://api.example.com",
        fetch: mockFetch,
        headers: {},
        forceValidation: false,
      },
    );

    // Undefined parameters should not add any query parameters
    const url = new URL(capturedUrl);
    expect(url.searchParams.has("fields[catalog-item-bulk-create-job]")).toBe(
      false,
    );
  });
});
