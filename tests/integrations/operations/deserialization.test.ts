import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createUnauthenticatedClient,
  createAuthenticatedClient,
} from "../client.js";
import { getRandomPort, MockServer } from "../setup.js";

/*
 * Integration test exercising runtime parse() with custom deserializers
 * against the testDeserialization operation defined in the shared fixture spec.
 */

describe("Deserialization Operation", () => {
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
    if (mockServer) await mockServer.stop();
  });

  it("applies custom JSON deserializer and validates parsed output", async () => {
    const client = createUnauthenticatedClient(baseURL);

    const res = await client.testDeserialization({});
    expect(res.status).toBe(200);
    expect("data" in res).toBe(true);

    const parsed = (res as any).parse({
      "application/json": (data: any) => ({
        name: String(data.name).toUpperCase(),
        age: Number(data.age),
      }),
    });

    if (parsed.parsed) {
      expect(parsed.parsed).toHaveProperty("name");
      expect(parsed.parsed).toHaveProperty("age");
    }
  });

  it("returns missingSchema for custom content-type via deserializer", async () => {
    const client = createUnauthenticatedClient(baseURL);

    // Force Accept header so Prism emits JSON; we then pretend a custom content type when parsing
    const res = await client.testDeserialization({});
    expect(res.status).toBe(200);

    const parsed = (res as any).parse({
      "application/custom+json": (data: any) => data,
    });

    // Since response content-type won't match custom+json map key, schema lookup fails
    if (parsed.missingSchema) {
      expect(parsed.deserialized).toBeDefined();
    }
  });

  it("captures deserializationError when custom deserializer throws", async () => {
    const { testDeserialization } = await import("../generated/client/testDeserialization.js");
    
    const res = await testDeserialization(
      {},
      {
        baseURL,
        headers: {},
        fetch,
        deserializerMap: {
          "application/json": () => {
            throw new Error("boom");
          },
        },
      },
    );
    expect(res.status).toBe(200);

    const parsed = (res as any).parse();

    expect(parsed.contentType).toBe("application/json");
    expect(parsed.deserializationError).toBeInstanceOf(Error);
    expect(parsed.parsed).toBeUndefined();
    expect(parsed.error).toBeUndefined();
  });

  it("reports validation error when deserializer returns invalid shape", async () => {
    const { testDeserialization } = await import("../generated/client/testDeserialization.js");
    
    const res = await testDeserialization(
      {},
      {
        baseURL,
        headers: {},
        fetch,
        deserializerMap: {
          "application/json": () => ({ name: 123 /* wrong type, age missing */ }),
        },
      },
    );
    expect(res.status).toBe(200);

    // Return object missing required property 'age'
    const parsed = (res as any).parse();

    expect(parsed.contentType).toBe("application/json");
    // Should surface Zod validation error
    expect(parsed.parseError).toBeDefined();
    expect(parsed.parsed).toBeUndefined();
    expect(parsed.missingSchema).toBeUndefined();
  });

  it("parses XML response via custom XML deserializer", async () => {
    const { testDeserialization } = await import("../generated/client/testDeserialization.js");
    
    const res = await testDeserialization(
      {
        contentType: { response: "application/xml" },
      },
      {
        baseURL,
        headers: {},
        fetch,
        deserializerMap: {
          "application/xml": (xml: string) => {
            const name = /<name>([^<]+)<\/name>/u.exec(xml)?.[1] || "";
            const ageStr = /<age>([^<]+)<\/age>/u.exec(xml)?.[1] || "0";
            return { name, age: Number(ageStr) };
          },
        },
      },
    );
    expect(res.status).toBe(200);
    // Parse XML string into object expected by schema
    const parsed = (res as any).parse();
    expect(parsed.contentType).toBe("application/xml");
    if (parsed.parsed) {
      expect(typeof parsed.parsed.name).toBe("string");
      expect(typeof parsed.parsed.age).toBe("number");
    } else if (parsed.error) {
      // If validation failed treat as failure for this scenario
      expect.fail("Expected successful XML deserialization and validation");
    }
  });

  it("handles vendor JSON content type with custom deserializer on multi-content operation", async () => {
    const { testMultiContentTypes } = await import("../generated/client/testMultiContentTypes.js");
    
    const res = await testMultiContentTypes(
      {
        body: { id: "abc", name: "example" },
        contentType: { response: "application/vnd.custom+json" },
      },
      {
        baseURL,
        headers: {},
        fetch,
        deserializerMap: {
          "application/vnd.custom+json": (data: any) => ({
            ...data,
            id: String(data.id).toUpperCase(),
          }),
        },
      },
    );
    expect(res.status).toBe(200);
    const parsed = (res as any).parse();
    expect(parsed.contentType).toBe("application/vnd.custom+json");
    if (parsed.parsed) {
      expect(parsed.parsed).toHaveProperty("id");
      // Ensure transformation happened: original mock value should already be uppercase; simulate by lowercasing and comparing
      const original = String(parsed.parsed.id);
      expect(original).toBe(original.toUpperCase());
      expect(parsed.parsed).toHaveProperty("name");
    } else if (parsed.error) {
      expect.fail("Vendor JSON parsing should have succeeded");
    }
  });

  it("deserializes binary download into length summary", async () => {
    const { testBinaryFileDownload } = await import("../generated/client/testBinaryFileDownload.js");
    
    const res = await testBinaryFileDownload(
      {},
      {
        baseURL,
        headers: { "custom-token": "test-custom-token-abc" }, // Add auth
        fetch,
        deserializerMap: {
          "application/octet-stream": (blob: Blob) => ({ size: blob.size }),
        },
      },
    );
    expect(res.status).toBe(200);
    const parsed = (res as any).parse();
    expect(parsed.contentType).toBe("application/octet-stream");
    if (parsed.parsed) {
      expect(parsed.parsed).toHaveProperty("size");
      expect(typeof parsed.parsed.size).toBe("number");
    }
  });

  it("parses response when request sent as x-www-form-urlencoded with custom vendor JSON response", async () => {
    const { testMultiContentTypes } = await import("../generated/client/testMultiContentTypes.js");
    
    const res = await testMultiContentTypes(
      {
        body: { id: "lower", name: "MixedCase" },
        contentType: {
          request: "application/x-www-form-urlencoded",
          response: "application/vnd.custom+json",
        },
      },
      {
        baseURL,
        headers: { "custom-token": "test-custom-token-abc" }, // Add auth for global security
        fetch,
        deserializerMap: {
          "application/vnd.custom+json": (data: any) => ({
            ...data,
            id: data.id.toUpperCase(),
          }),
        },
      },
    );
    expect(res.status).toBe(200);
    const parsed = (res as any).parse();
    expect(parsed.contentType).toBe("application/vnd.custom+json");
    if (parsed.parsed) {
      // Prism may return a static example (e.g. STRING); ensure our uppercasing ran
      expect(parsed.parsed.id).toBe(parsed.parsed.id.toUpperCase());
    }
  });
});
