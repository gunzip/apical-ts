import { describe, expect, it } from "vitest";

/* Test the new deserialization functionality */
describe("deserialization functionality", () => {
  describe("parseApiResponseUnknownData with deserializerMap", () => {
    /* Mock response object */
    const createMockResponse = (contentType: string): Response =>
      ({
        headers: {
          get: (header: string) =>
            header === "content-type" ? contentType : null,
        },
      }) as Response;

    /* Mock schema with safeParse */
    const createMockSchema = (
      shouldSucceed: boolean,
      result?: unknown,
      error?: unknown,
    ) => ({
      safeParse: (data: unknown) =>
        shouldSucceed
          ? { success: true, data: result ?? data }
          : { success: false, error: error ?? new Error("validation failed") },
    });

    it("should parse JSON response with default (no deserializer)", () => {
      /* Arrange */
      const response = createMockResponse("application/json");
      const data = { name: "John", age: 30 };
      const schemaMap = {
        "application/json": createMockSchema(true, data),
      };

      /* Act - using actual function from config-templates.ts */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(response, data, schemaMap);

      /* Assert */
      expect(result).toEqual({
        contentType: "application/json",
        parsed: data,
      });
    });

    it("should apply custom deserializer for application/json", () => {
      /* Arrange */
      const response = createMockResponse("application/json");
      const originalData = { name: "john", age: "30" };
      const deserializerMap = {
        "application/json": (data: any) => ({
          ...data,
          name: data.name.toUpperCase(),
          age: parseInt(data.age, 10),
        }),
      };
      const expectedDeserialized = { name: "JOHN", age: 30 };
      const schemaMap = {
        "application/json": createMockSchema(true, expectedDeserialized),
      };

      /* Act */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(
        response,
        originalData,
        schemaMap,
        deserializerMap,
      );

      /* Assert */
      expect(result).toEqual({
        contentType: "application/json",
        parsed: expectedDeserialized,
      });
    });

    it("should capture deserializationError when deserializer throws", () => {
      /* Arrange */
      const response = createMockResponse("application/json");
      const data = { invalid: "data" };
      const deserializationError = new Error("Custom deserialization failed");
      const deserializerMap = {
        "application/json": () => {
          throw deserializationError;
        },
      };
      const schemaMap = {
        "application/json": createMockSchema(true),
      };

      /* Act */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(
        response,
        data,
        schemaMap,
        deserializerMap,
      );

      /* Assert */
      expect(result).toEqual({
        contentType: "application/json",
        deserializationError,
      });
    });

    it("should return missingSchema when schema absent", () => {
      /* Arrange */
      const response = createMockResponse("application/xml");
      const data = "<xml>content</xml>";
      const deserializerMap = {
        "application/xml": (data: any) => data.toUpperCase(),
      };
      const schemaMap = {}; /* No schema for XML */

      /* Act */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(
        response,
        data,
        schemaMap,
        deserializerMap,
      );

      /* Assert */
      expect(result).toEqual({
        contentType: "application/xml",
        missingSchema: true,
        deserialized: "<XML>CONTENT</XML>",
      });
    });

    it("should return error on Zod validation failure", () => {
      /* Arrange */
      const response = createMockResponse("application/json");
      const data = { name: "John", age: "invalid" };
      const validationError = new Error("Zod validation failed");
      const schemaMap = {
        "application/json": createMockSchema(false, undefined, validationError),
      };

      /* Act */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(response, data, schemaMap);

      /* Assert */
      expect(result).toEqual({
        contentType: "application/json",
        error: validationError,
      });
    });

    it("should parse XML with custom xml deserializer", () => {
      /* Arrange */
      const response = createMockResponse("application/xml");
      const xmlData = "<user><name>John</name><age>30</age></user>";
      const deserializerMap = {
        "application/xml": (data: string) => {
          /* Simple XML parser mock */
          const nameMatch = data.match(/<name>([^<]+)<\/name>/);
          const ageMatch = data.match(/<age>([^<]+)<\/age>/);
          return {
            name: nameMatch ? nameMatch[1] : null,
            age: ageMatch ? parseInt(ageMatch[1], 10) : null,
          };
        },
      };
      const expectedResult = { name: "John", age: 30 };
      const schemaMap = {
        "application/xml": createMockSchema(true, expectedResult),
      };

      /* Act */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(
        response,
        xmlData,
        schemaMap,
        deserializerMap,
      );

      /* Assert */
      expect(result).toEqual({
        contentType: "application/xml",
        parsed: expectedResult,
      });
    });

    it("should handle binary responses without schema", () => {
      /* Arrange */
      const response = createMockResponse("application/octet-stream");
      const binaryData = new ArrayBuffer(8);
      const schemaMap = {}; /* No schema for binary */

      /* Act */
      const parseApiResponseUnknownData = new Function(
        "response",
        "data",
        "schemaMap",
        "deserializerMap",
        `
        const getResponseContentType = (response) => {
          const raw = response.headers.get("content-type");
          return raw ? raw.split(";")[0].trim().toLowerCase() : "";
        };
        
        const contentType = getResponseContentType(response);
        
        let deserializedData = data;
        let deserializationError = undefined;
        
        if (deserializerMap && deserializerMap[contentType]) {
          try {
            deserializedData = deserializerMap[contentType](data, contentType);
          } catch (error) {
            deserializationError = error;
          }
        }
        
        const schema = schemaMap[contentType];
        if (!schema || typeof schema.safeParse !== "function") {
          return {
            contentType,
            missingSchema: true,
            deserialized: deserializedData,
            ...(deserializationError && { deserializationError }),
          };
        }
        
        if (deserializationError) {
          return {
            contentType,
            deserializationError,
          };
        }
        
        const result = schema.safeParse(deserializedData);
        if (result.success) {
          return {
            contentType,
            parsed: result.data,
          };
        }
        return {
          contentType,
          error: result.error,
        };
        `,
      );

      const result = parseApiResponseUnknownData(
        response,
        binaryData,
        schemaMap,
      );

      /* Assert */
      expect(result).toEqual({
        contentType: "application/octet-stream",
        missingSchema: true,
        deserialized: binaryData,
      });
    });
  });
});
