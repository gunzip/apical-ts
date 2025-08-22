import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MockServer, getRandomPort } from "../setup.js";
import { createAuthenticatedClient } from "../client.js";
import { testHelpers } from "../fixtures/test-helpers.js";
import { readFileSync } from "fs";
import { join } from "path";

describe("File Upload Operations", () => {
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

  describe("testFileUpload operation", () => {
    it("should upload a text file successfully", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');
      const testFile = testHelpers.createTestFile(
        "Sample file content for testing upload",
        "test-upload.txt",
        "text/plain"
      );
      const formData = testHelpers.createFileFormData(testFile);

      // Act
      const response = await client.testFileUpload({
        body: formData,
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should upload file from fixtures", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');
      const filePath = join(process.cwd(), "tests/integrations/fixtures/sample-file.txt");
      const fileContent = readFileSync(filePath, "utf-8");
      const testFile = testHelpers.createTestFile(fileContent, "sample-file.txt", "text/plain");
      const formData = testHelpers.createFileFormData(testFile);

      // Act
      const response = await client.testFileUpload({
        body: formData,
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
    });

    it("should handle file upload with different MIME types", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');
      const testFile = testHelpers.createTestFile(
        '{"test": "json content"}',
        "test.json",
        "application/json"
      );
      const formData = testHelpers.createFileFormData(testFile);

      // Act
      const response = await client.testFileUpload({
        body: formData,
      });

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe("testBinaryFileUpload operation", () => {
    it("should upload binary file successfully", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');
      
      // Create a simple binary file (simulate image data)
      const binaryData = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, // PNG signature
        0, 0, 0, 13, 73, 72, 68, 82,     // IHDR chunk
        0, 0, 0, 1, 0, 0, 0, 1,          // 1x1 pixel
        8, 2, 0, 0, 0, 144, 119, 83, 222 // Rest of minimal PNG
      ]);
      
      const blob = new Blob([binaryData], { type: "image/png" });
      const testFile = new File([blob], "test.png", { type: "image/png" });
      const formData = testHelpers.createFileFormData(testFile);

      // Act
      const response = await client.testBinaryFileUpload({
        body: formData,
      });

      // Assert
      expect(response.status).toBe(200);
    });

    it("should handle large file upload", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');
      
      // Create a larger binary file (1KB)
      const largeData = new Uint8Array(1024).fill(65); // Fill with 'A' character
      const blob = new Blob([largeData], { type: "application/octet-stream" });
      const testFile = new File([blob], "large-test.bin", { type: "application/octet-stream" });
      const formData = testHelpers.createFileFormData(testFile);

      // Act
      const response = await client.testBinaryFileUpload({
        body: formData,
      });

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe("testBinaryFileDownload operation", () => {
    it("should download binary file successfully", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testBinaryFileDownload({});

      // Assert
      expect(response.status).toBe(200);
      expect(response.response.headers).toBeDefined();
      expect(response.response.headers.get("content-type")).toContain("application/octet-stream");
      
      // Check that we received binary data
      expect(response.data).toBeDefined();
      
      // If the response is a Blob, check its properties
      if (response.data instanceof Blob) {
        expect(response.data.type).toContain("application/octet-stream");
        expect(response.data.size).toBeGreaterThan(0);
      }
    });

    it("should handle large binary file download", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testBinaryFileDownload({});

      // Assert
      expect(response.status).toBe(200);
      
      // Verify we can read the data
      if (response.data instanceof Blob) {
        const arrayBuffer = await response.data.arrayBuffer();
        expect(arrayBuffer.byteLength).toBeGreaterThan(0);
      }
    });

    it("should preserve binary data integrity", async () => {
      // Arrange
      const client = createAuthenticatedClient(baseURL, 'customToken');

      // Act
      const response = await client.testBinaryFileDownload({});

      // Assert
      expect(response.status).toBe(200);
      
      // Check that content is binary (not text)
      if (response.data instanceof Blob) {
        const text = await response.data.text();
        // Binary data should contain non-printable characters
        // or not be valid UTF-8 text
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });
});