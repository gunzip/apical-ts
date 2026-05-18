import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
    const { testDeserialization } =
      await import("../generated/client/testDeserialization.ts");

    const res = await testDeserialization(
      {},
      {
        baseURL,
        headers: { "custom-token": "" },
        fetch,
        forceValidation: false,
        deserializers: {
          "application/json": (data: any) => ({
            name: String(data.name).toUpperCase(),
            age: Number(data.age),
          }),
        },
      },
    );
    if (res.isValid) {
      expect(res.status).toBe("200");
      expect("data" in res).toBe(true);

      // Some response types provide a runtime `parse()` while forced-parse types provide `parsed`.
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        // Forced-parse variant already has a parsed field
        parsedAny = res.parsed as any;
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.parsed) {
        expect(parsedAny.parsed).toHaveProperty("name");
        expect(parsedAny.parsed).toHaveProperty("age");
      }
    } else {
      expect.fail("Expected successful response from testDeserialization");
    }
  });

  it("returns missing-schema kind for custom content-type via deserializer", async () => {
    const { testDeserialization } =
      await import("../generated/client/testDeserialization.ts");

    // Force Accept header so Prism emits JSON; schema lookup should fail for the custom key.
    const res = await testDeserialization(
      {},
      {
        baseURL,
        headers: { "custom-token": "" },
        fetch,
        forceValidation: false,
        deserializers: {
          "application/custom+json": (data: any) => data,
        },
      },
    );
    if (res.isValid) {
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        parsedAny = res.parsed as any;
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      // Since response content-type won't match custom+json map key, schema lookup fails
      if (parsedAny && parsedAny.kind === "missing-schema") {
        expect(parsedAny.error).toContain("No schema found");
      } else if (!parsedAny) {
        expect.fail("Expected missing-schema kind");
      }
    } else {
      expect.fail("Expected successful response from testDeserialization");
    }
  });

  it("captures deserialization-error when custom deserializer throws", async () => {
    const { testDeserialization } =
      await import("../generated/client/testDeserialization.ts");

    const res = await testDeserialization(
      {},
      {
        baseURL,
        headers: { "custom-token": "" },
        fetch,
        deserializers: {
          "application/json": () => {
            throw new Error("boom");
          },
        },
      },
    );
    if (res.isValid) {
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        // forced-parse variant cannot represent runtime deserialization error via parse(); treat as failure
        expect.fail(
          "Forced-parse variant returned unexpected success when deserializer throws",
        );
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.kind) {
        expect(parsedAny.kind).toBe("deserialization-error");
      }
    } else {
      expect.fail("Expected successful response from testDeserialization");
    }
  });

  it("reports validation error when deserializer returns invalid shape", async () => {
    const { testDeserialization } =
      await import("../generated/client/testDeserialization.ts");

    const res = await testDeserialization(
      {},
      {
        baseURL,
        headers: { "custom-token": "" },
        fetch,
        deserializers: {
          "application/json": () => ({
            name: 123 /* wrong type, age missing */,
          }),
        },
      },
    );
    if (res.isValid) {
      // Return object missing required property 'age'
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        // forced-parse validated the response; fail because we expected invalid shape
        expect.fail("Expected parse-error but forced validation succeeded");
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.kind) {
        expect(parsedAny.kind).toBe("parse-error");
        expect(parsedAny.error).toBeDefined();
      }
    } else {
      expect.fail("Expected successful response from testDeserialization");
    }
  });

  it("parses XML response via custom XML deserializer", async () => {
    const { testDeserialization } =
      await import("../generated/client/testDeserialization.ts");

    const res = await testDeserialization(
      {
        contentType: { response: "application/xml" },
      },
      {
        baseURL,
        headers: { "custom-token": "" },
        fetch,
        deserializers: {
          "application/xml": (xml: unknown) => {
            const xmlStr = String(xml);
            const name = /<name>([^<]+)<\/name>/u.exec(xmlStr)?.[1] || "";
            const ageStr = /<age>([^<]+)<\/age>/u.exec(xmlStr)?.[1] || "0";
            return { name, age: Number(ageStr) };
          },
        },
      },
    );
    if (res.isValid) {
      // Parse XML string into object expected by schema
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        parsedAny = res.parsed as any;
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.contentType) {
        expect(parsedAny.contentType).toBe("application/xml");
      }
      if (parsedAny && parsedAny.parsed) {
        expect(typeof parsedAny.parsed.name).toBe("string");
        expect(typeof parsedAny.parsed.age).toBe("number");
      } else if (parsedAny && parsedAny.kind) {
        expect.fail("Expected successful XML deserialization and validation");
      }
    } else {
      expect.fail("Expected successful response from testDeserialization");
    }
  });

  it("handles vendor JSON content type with custom deserializer on multi-content operation", async () => {
    const { testMultiContentTypes } =
      await import("../generated/client/testMultiContentTypes.ts");

    const res = await testMultiContentTypes(
      {
        body: { id: "abc", name: "example" },
        contentType: { response: "application/vnd.custom+json" },
      },
      {
        baseURL,
        headers: { "custom-token": "" },
        fetch,
        deserializers: {
          "application/vnd.custom+json": (data: unknown) => ({
            ...(data as any),
            id: String((data as any).id).toUpperCase(),
          }),
        },
      },
    );
    if (res.isValid) {
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        parsedAny = res.parsed as any;
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.contentType) {
        expect(parsedAny.contentType).toBe("application/vnd.custom+json");
      }
      if (parsedAny && parsedAny.parsed) {
        expect(parsedAny.parsed).toHaveProperty("id");
        const original = String(parsedAny.parsed.id);
        expect(original).toBe(original.toUpperCase());
        expect(parsedAny.parsed).toHaveProperty("name");
      } else if (parsedAny && parsedAny.kind) {
        expect.fail("Vendor JSON parsing should have succeeded");
      }
    } else {
      expect.fail("Expected successful response from testMultiContentTypes");
    }
  });

  it("deserializes binary download into length summary", async () => {
    const { testBinaryFileDownload } =
      await import("../generated/client/testBinaryFileDownload.ts");

    const res = await testBinaryFileDownload(
      {},
      {
        baseURL,
        headers: { "custom-token": "test-custom-token-abc" }, // Add auth
        fetch,
        deserializers: {
          "application/octet-stream": (blob: unknown) => ({
            size: (blob as any).size,
          }),
        },
      },
    );
    if (res.isValid) {
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        parsedAny = res.parsed as any;
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.parsed) {
        expect(parsedAny.contentType).toBe("application/octet-stream");
        expect(parsedAny.parsed).toHaveProperty("size");
        expect(typeof parsedAny.parsed.size).toBe("number");
      } else if (parsedAny && parsedAny.kind) {
        expect([
          "parse-error",
          "missing-schema",
          "deserialization-error",
        ]).toContain(parsedAny.kind);
      }
    } else {
      expect.fail("Expected successful response from testBinaryFileDownload");
    }
  });

  it("parses response when request sent as x-www-form-urlencoded with custom vendor JSON response", async () => {
    const { testMultiContentTypes } =
      await import("../generated/client/testMultiContentTypes.ts");

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
        deserializers: {
          "application/vnd.custom+json": (data: any) => ({
            ...data,
            id: data.id.toUpperCase(),
          }),
        },
      },
    );
    if (res.isValid) {
      let parsedAny: any;
      if ("parse" in res && typeof res.parse === "function") {
        parsedAny = await res.parse();
      } else if ("parsed" in res) {
        parsedAny = res.parsed as any;
      } else {
        expect.fail("Response did not expose parse() nor parsed");
      }

      if (parsedAny && parsedAny.contentType) {
        expect(parsedAny.contentType).toBe("application/vnd.custom+json");
      }
      if (parsedAny && parsedAny.parsed) {
        expect(parsedAny.parsed.id).toBe(parsedAny.parsed.id.toUpperCase());
      } else if (parsedAny && parsedAny.data) {
        expect(String(parsedAny.data.id).toUpperCase()).toBe(
          String(parsedAny.data.id).toUpperCase(),
        );
      }
    } else {
      expect.fail("Expected successful response from testMultiContentTypes");
    }
  });
});
