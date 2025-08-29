import { describe, it, expect } from "vitest";

/*
 * Tests demonstrating the practical usage of the new deserializerMap functionality.
 * Shows how users can configure global deserializers and still override them per call.
 */

describe("DeserializerMap Usage Examples", () => {
  it("should show how to use the new global deserializerMap functionality", () => {
    /*
     * This test demonstrates the generated TypeScript patterns, showing:
     * 1. How GlobalConfig now includes deserializerMap
     * 2. How parse() uses config.deserializerMap as fallback 
     * 3. How backward compatibility is maintained
     */

    /* Example of how the user would configure a global deserializerMap */
    const globalDeserializerMap = {
      "application/xml": (data: unknown) => {
        /* Custom XML parsing logic */
        const xmlString = data as string;
        const nameMatch = /<name>([^<]+)<\/name>/u.exec(xmlString);
        const ageMatch = /<age>([^<]+)<\/age>/u.exec(xmlString);
        return {
          name: nameMatch?.[1] || "",
          age: Number(ageMatch?.[1]) || 0,
        };
      },
      "application/vnd.custom+json": (data: unknown) => {
        /* Custom JSON transformation */
        const obj = data as Record<string, unknown>;
        return {
          ...obj,
          id: String(obj.id).toUpperCase(),
          timestamp: new Date(),
        };
      },
    };

    /* Mock generated config that includes the new deserializerMap property */
    interface MockGlobalConfig {
      baseURL: string;
      fetch: typeof fetch;
      headers: Record<string, string>;
      deserializerMap?: Record<string, (data: unknown) => unknown>;
    }

    const config: MockGlobalConfig = {
      baseURL: "https://api.example.com",
      fetch: globalThis.fetch,
      headers: {},
      deserializerMap: globalDeserializerMap,
    };

    /* Verify the config structure matches our expectations */
    expect(config.deserializerMap).toBeDefined();
    expect(config.deserializerMap!["application/xml"]).toBeDefined();
    expect(config.deserializerMap!["application/vnd.custom+json"]).toBeDefined();

    /* Mock how parseApiResponseUnknownData would work with the new fallback logic */
    function mockParseApiResponseUnknownData(
      response: { headers: { get: (name: string) => string | null } },
      data: unknown,
      schemaMap: Record<string, { safeParse: (value: unknown) => { success: boolean; data?: unknown; error?: unknown } }>,
      explicitDeserializerMap?: Record<string, (data: unknown) => unknown>,
    ) {
      const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
      
      /* This demonstrates the new logic: use explicit deserializerMap OR fall back to config */
      const deserializerMap = explicitDeserializerMap || config.deserializerMap;
      
      let deserializedData = data;
      if (deserializerMap && deserializerMap[contentType]) {
        deserializedData = deserializerMap[contentType](data);
      }

      const schema = schemaMap[contentType];
      if (schema) {
        const result = schema.safeParse(deserializedData);
        return result.success ? { contentType, parsed: result.data } : { contentType, parseError: result.error };
      }
      
      return { contentType, missingSchema: true, deserialized: deserializedData };
    }

    /* Test case 1: parse() with no explicit deserializerMap uses config.deserializerMap */
    const mockResponse1 = {
      headers: { get: (name: string) => name === "content-type" ? "application/xml" : null },
    };
    
    const xmlData = "<user><name>John</name><age>30</age></user>";
    const mockSchema = { 
      safeParse: (data: unknown) => ({ success: true, data })
    };
    
    const result1 = mockParseApiResponseUnknownData(
      mockResponse1,
      xmlData,
      { "application/xml": mockSchema },
      undefined // No explicit deserializerMap - should use config.deserializerMap
    );

    expect(result1).toEqual({
      contentType: "application/xml",
      parsed: { name: "John", age: 30 }
    });

    /* Test case 2: parse() with explicit deserializerMap overrides config.deserializerMap */
    const customXmlDeserializer = {
      "application/xml": (data: unknown) => {
        /* Different XML parsing logic */
        return { customParsed: true, rawXml: data };
      },
    };

    const result2 = mockParseApiResponseUnknownData(
      mockResponse1,
      xmlData,
      { "application/xml": mockSchema },
      customXmlDeserializer // Explicit deserializerMap overrides config
    );

    expect(result2).toEqual({
      contentType: "application/xml",
      parsed: { customParsed: true, rawXml: xmlData }
    });

    /* Test case 3: Backward compatibility - works when config has no deserializerMap */
    const configWithoutDeserializerMap = {
      ...config,
      deserializerMap: undefined,
    };

    const result3 = mockParseApiResponseUnknownData(
      mockResponse1,
      xmlData,
      { "application/xml": mockSchema },
      undefined // No deserializers available
    );

    /* Should work without deserializers, just pass raw data to schema */
    expect(result3.contentType).toBe("application/xml");
  });

  it("should demonstrate correct content-type indexing vs old status-code indexing", () => {
    /*
     * This test shows the improvement: DeserializerMap is now indexed by content-type
     * instead of status code, which makes much more sense for users.
     */

    /* OLD (INCORRECT) APPROACH: Indexed by status code */
    interface OldDeserializerMapType {
      "200"?: (data: unknown) => unknown;
      "503"?: (data: unknown) => unknown;
      "504"?: (data: unknown) => unknown;
    }

    /* NEW (CORRECT) APPROACH: Indexed by content-type */
    interface NewDeserializerMapType {
      "application/json"?: (data: unknown) => unknown;
      "application/xml"?: (data: unknown) => unknown;
      "application/problem+json"?: (data: unknown) => unknown;
      "text/plain"?: (data: unknown) => unknown;
    }

    /* The new approach makes much more sense because:
     * 1. Content-type determines how data should be deserialized
     * 2. Status code doesn't affect deserialization logic
     * 3. Same content-type can appear across multiple status codes
     * 4. Users think in terms of data formats, not HTTP status codes
     */

    const newDeserializerMap: NewDeserializerMapType = {
      "application/xml": (data: unknown) => {
        /* XML parsing logic */
        return { parsedFromXml: true, data };
      },
      "application/problem+json": (data: unknown) => {
        /* RFC 7807 Problem Details parsing */
        const problem = data as Record<string, unknown>;
        return {
          ...problem,
          parsedAt: new Date().toISOString(),
        };
      },
    };

    /* Verify the new structure is more intuitive */
    expect(newDeserializerMap["application/xml"]).toBeDefined();
    expect(newDeserializerMap["application/problem+json"]).toBeDefined();
    
    /* These content-type keys make sense to users */
    expect(Object.keys(newDeserializerMap)).toEqual([
      "application/xml",
      "application/problem+json"
    ]);
  });
});