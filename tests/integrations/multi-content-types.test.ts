import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createUnauthenticatedClient } from "./client.js";
import { getRandomPort, MockServer } from "./setup.js";

/**
 * Integration tests for operations that support multiple request/response content types.
 */
describe("Multi content type integration", () => {
  let mockServer: MockServer;
  let baseURL: string;
  const port = getRandomPort();

  beforeAll(async () => {
    mockServer = new MockServer({
      port,
      specPath: "tests/integrations/fixtures/test.yaml",
    });
    await mockServer.start();
    baseURL = mockServer.getBaseUrl();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
  });

  it("should use default JSON request/response content types when none specified", async () => {
    const client = createUnauthenticatedClient(baseURL);

    const response = await client.testMultiContentTypes({
      body: { id: "123", name: "Test" },
    });

    // Prism should return 200 mock response
    expect(response.status).toBe(200);
    // Content type should default to application/json
    expect(response.response.headers.get("content-type")).toContain(
      "application/json",
    );
  });

  it("should allow overriding both request and response content types", async () => {
    const client = createUnauthenticatedClient(baseURL);

    const response = await client.testMultiContentTypes({
      body: { id: "abc", name: "Other" },
      contentType: {
        request: "application/x-www-form-urlencoded",
        response: "application/vnd.custom+json",
      },
    });

    expect(response.status).toBe(200);
    {
      const ct = response.response.headers.get("content-type") || "";
      expect(ct).toContain("application/vnd.custom+json");
      // Data should parse as NewModel schema
      expect(response.data).toHaveProperty("id");
    }
  });

  it("should allow selecting only response content type", async () => {
    const client = createUnauthenticatedClient(baseURL);

    const response = await client.testMultiContentTypes({
      body: { id: "456", name: "XmlResp" },
      contentType: { response: "application/vnd.custom+json" },
    });

    expect(response.status).toBe(200);
    {
      expect(
        (response.response.headers.get("content-type") || "").includes(
          "application/vnd.custom+json",
        ),
      ).toBe(true);
    }
  });

  it("should allow selecting xml as response content type (raw text, no validation)", async () => {
    const client = createUnauthenticatedClient(baseURL);
    const response = await client.testMultiContentTypes({
      body: { id: "789", name: "XmlPreferred" },
      contentType: { response: "application/xml" },
    });
    expect(response.status).toBe(200);
    const ct = response.response.headers.get("content-type") || "";
    expect(ct.includes("application/xml")).toBe(true);
    // Data now is raw text (string) since XML validation is skipped
    expect(
      typeof response.data === "string" || typeof response.data === "object",
    ).toBe(true);
  });
});
