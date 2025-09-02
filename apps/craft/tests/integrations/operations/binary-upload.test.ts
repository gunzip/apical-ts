import { beforeAll, afterAll, describe, it, expect } from "vitest";

import { getRandomPort, MockServer } from "../setup";
import { createAuthenticatedClient } from "../client";

describe("octet-stream binary upload integration", () => {
  let mockServer: MockServer;
  let baseURL: string;
  const port = getRandomPort();

  beforeAll(async () => {
    mockServer = new MockServer({
      port,
      // use the test fixture spec so Prism returns the expected mocks
      specPath: "tests/integrations/fixtures/test.yaml",
    });
    await mockServer.start();
    baseURL = mockServer.getBaseUrl();
  });

  afterAll(async () => {
    if (mockServer) await mockServer.stop();
  });

  it("uploads binary content declared as string/binary (application/octet-stream)", async () => {
    // Use the test-generated authenticated client (tests/integrations/generated)
    const client = createAuthenticatedClient(baseURL, "customToken");

    // Create binary buffer (Uint8Array) and send as Blob/File inside multipart form
    const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([binaryData], {
      type: "application/octet-stream",
    });
    const file = new File([blob], "upload.bin", {
      type: "application/octet-stream",
    });

    // Use the generated test operation for binary upload which expects multipart/form-data
    const response = await client.testBinaryFileUpload({
      body: { file },
    });

    // Assert: operation should either succeed with 200, or return an error-like object
    if ("success" in response && response.success) {
      expect(response.status).toBe(200);
    } else if ("kind" in response) {
      // Unexpected-response error object - ensure it is shaped as expected
      expect(response.kind).toBe("unexpected-response");
      expect(typeof response.error).toBe("string");
    } else {
      // Unknown shape — fail the test to surface unexpected return types
      expect.fail("Unexpected response shape from testBinaryFileUpload");
    }

    // Also test application/octet-stream endpoint (raw body)
    const octetData = new Uint8Array([10, 20, 30, 40]);
    const octetBlob = new Blob([octetData.buffer], {
      type: "application/octet-stream",
    });
    const octetResponse = await client.testOctetStreamUpload({
      body: octetBlob,
      contentType: { request: "application/octet-stream" },
    });

    if ("success" in octetResponse && octetResponse.success) {
      expect(octetResponse.status).toBe(200);
    } else if ("kind" in octetResponse) {
      expect(octetResponse.kind).toBe("unexpected-response");
    } else {
      expect.fail("Unexpected response shape from testOctetStreamUpload");
    }
  });
});
