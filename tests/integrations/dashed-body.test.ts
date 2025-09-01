import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { MockServer, getRandomPort } from "./setup.js";
import { createUnauthenticatedClient } from "./client.js";

/**
 * Integration tests for request/response bodies that contain dashed property names.
 * Verifies that:
 *  - Request body with dashed properties is sent correctly.
 *  - Response body with dashed properties is parsed and (optionally) validated.
 */

describe("Dashed body properties integration", () => {
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

  it("should POST and parse a body containing dashed property names", async () => {
    const client = createUnauthenticatedClient(baseURL);

    const payload = {
      "id-field": "example-id",
      "nested-dash": {
        "child-prop": "child-value",
      },
    } as const;

    const response = await client.testDashedBody({
      body: payload,
    });

    // The mock server (Prism) will echo a 200 only if spec matches.
    if ("success" in response && response.success) {
      expect(response.status).toBe(200);
      // Manually parse/validate (lazy) since forceValidation false by default
      const parsed = await response.parse();
      if ("parsed" in parsed) {
        expect(parsed.parsed["id-field"]).toBe(payload["id-field"]);
        expect(parsed.parsed["nested-dash"]?.["child-prop"]).toBe(
          payload["nested-dash"]?.["child-prop"],
        );
      } else {
        expect.fail("Expected successful parse result");
      }
    } else if ("kind" in response) {
      // Unexpected response; surface diagnostics
      expect.fail(
        `Unexpected error response: ${response.kind} ${response.error}`,
      );
    } else {
      expect.fail("Unknown response shape");
    }
  });
});
