import { describe, it, expect } from "vitest";
import {
  convertOpenAPI20to30,
  convertOpenAPI30to31,
  convertToOpenAPI31,
  isOpenAPI20,
  isOpenAPI30,
  isOpenAPI31,
} from "../src/core-generator/converter.js";

describe("OpenAPI Converter", () => {
  describe("Version detection", () => {
    it("should detect OpenAPI 2.0 (Swagger) specifications", () => {
      const swagger20 = {
        swagger: "2.0",
        info: { title: "Test", version: "1.0.0" },
      };
      expect(isOpenAPI20(swagger20)).toBe(true);
      expect(isOpenAPI30(swagger20)).toBe(false);
      expect(isOpenAPI31(swagger20)).toBe(false);
    });

    it("should detect OpenAPI 3.0 specifications", () => {
      const openapi30 = {
        openapi: "3.0.1",
        info: { title: "Test", version: "1.0.0" },
      };
      expect(isOpenAPI20(openapi30)).toBe(false);
      expect(isOpenAPI30(openapi30)).toBe(true);
      expect(isOpenAPI31(openapi30)).toBe(false);
    });

    it("should detect OpenAPI 3.1 specifications", () => {
      const openapi31 = {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
      };
      expect(isOpenAPI20(openapi31)).toBe(false);
      expect(isOpenAPI30(openapi31)).toBe(false);
      expect(isOpenAPI31(openapi31)).toBe(true);
    });
  });

  describe("OpenAPI 3.0 to 3.1 conversion", () => {
    it("should convert nullable properties to type arrays", () => {
      const openapi30 = {
        openapi: "3.0.1",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                name: { type: "string", nullable: true },
                age: { type: "integer", nullable: false },
              },
            },
          },
        },
      };

      const result = convertOpenAPI30to31(openapi30 as any);

      expect(result.openapi).toBe("3.1.0");
      const userSchema = result.components?.schemas?.User as any;
      expect(userSchema.properties.name.type).toEqual(["string", "null"]);
      expect(userSchema.properties.name.nullable).toBeUndefined();
      expect(userSchema.properties.age.nullable).toBeUndefined();
    });

    it("should convert exclusiveMinimum/Maximum from boolean to numeric", () => {
      const openapi30 = {
        openapi: "3.0.1",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            NumberTest: {
              type: "number",
              minimum: 0,
              exclusiveMinimum: true,
              maximum: 100,
              exclusiveMaximum: true,
            },
          },
        },
      };

      const result = convertOpenAPI30to31(openapi30 as any);
      const schema = result.components?.schemas?.NumberTest as any;

      expect(schema.exclusiveMinimum).toBe(0);
      expect(schema.minimum).toBeUndefined();
      expect(schema.exclusiveMaximum).toBe(100);
      expect(schema.maximum).toBeUndefined();
    });

    it("should convert example to examples array", () => {
      const openapi30 = {
        openapi: "3.0.1",
        info: { title: "Test", version: "1.0.0" },
        paths: {},
        components: {
          schemas: {
            StringTest: {
              type: "string",
              example: "test value",
            },
          },
        },
      };

      const result = convertOpenAPI30to31(openapi30 as any);
      const schema = result.components?.schemas?.StringTest as any;

      expect(schema.examples).toEqual(["test value"]);
      expect(schema.example).toBeUndefined();
    });
  });

  describe("Swagger 2.0 to OpenAPI 3.0 conversion", () => {
    it("should convert Swagger 2.0 to OpenAPI 3.0", async () => {
      const swagger20 = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        host: "api.example.com",
        basePath: "/v1",
        schemes: ["https"],
        paths: {
          "/users": {
            get: {
              summary: "Get users",
              responses: {
                "200": {
                  description: "Success",
                  schema: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
      };

      const result = await convertOpenAPI20to30(swagger20);

      expect(result.openapi).toBe("3.0.0");
      expect(result.servers).toBeDefined();
      expect(result.servers?.[0]?.url).toBe("https://api.example.com/v1");
      expect(
        (result.paths as any)["/users"].get.responses["200"].content
      ).toBeDefined();
    });
  });

  describe("Universal conversion", () => {
    it("should convert OpenAPI 2.0 to 3.1 through convertToOpenAPI31", async () => {
      const swagger20 = {
        swagger: "2.0",
        info: { title: "Test API", version: "1.0.0" },
        host: "api.example.com",
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "Success",
                  schema: { type: "string", nullable: true },
                },
              },
            },
          },
        },
      };

      const result = await convertToOpenAPI31(swagger20);

      expect(result.openapi).toBe("3.1.0");
      expect(result.servers).toBeDefined();

      // Check that nullable was converted properly during the 2.0 -> 3.0 -> 3.1 chain
      const responseSchema = (result.paths as any)["/test"].get.responses["200"]
        .content["*/*"].schema;
      expect(responseSchema.type).toEqual(["string", "null"]);
    });

    it("should pass through OpenAPI 3.1 unchanged", async () => {
      const openapi31 = {
        openapi: "3.1.0",
        info: { title: "Test API", version: "1.0.0" },
        paths: {},
      };

      const result = await convertToOpenAPI31(openapi31);

      expect(result).toBe(openapi31); // Should be the same object
    });

    it("should throw error for unsupported versions", async () => {
      const unsupported = {
        openapi: "4.0.0",
        info: { title: "Test API", version: "1.0.0" },
      };

      await expect(convertToOpenAPI31(unsupported)).rejects.toThrow(
        "Unsupported OpenAPI version: 4.0.0"
      );
    });
  });
});
