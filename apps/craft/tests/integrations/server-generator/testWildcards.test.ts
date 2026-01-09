import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testWildcardsWrapper,
  testWildcardsHandler,
} from "../generated/server/testWildcards.js";
import { setupTestRoute } from "./test-helpers.js";

describe("testWildcards operation integration tests", () => {
  it("should return 200 with wildcard object (additionalProperties: true)", async () => {
    // Arrange: Setup the Express route with the generated wrapper
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "200",
          contentType: "application/json",
          data: {
            predefinedField: "value",
            dynamicField1: "dynamic value 1",
            dynamicField2: 123,
            nestedObject: {
              nested: "data",
            },
          },
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response
    if (response.status === 500)
      console.log("500 Error Body:", JSON.stringify(response.body, null, 2));
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      predefinedField: "value",
      dynamicField1: "dynamic value 1",
      dynamicField2: 123,
      nestedObject: {
        nested: "data",
      },
    });
  });

  it("should return 200 with empty wildcard object", async () => {
    // Arrange: Test that empty objects are valid for wildcard schemas
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "200",
          contentType: "application/json",
          data: {},
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toEqual({});
  });

  it("should return 200 with various data types in wildcard object", async () => {
    // Arrange: Test that wildcard objects can contain various data types
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "200",
          contentType: "application/json",
          data: {
            stringField: "text",
            numberField: 42,
            booleanField: true,
            arrayField: [1, 2, 3],
            objectField: { nested: "value" },
            nullField: null,
          },
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      stringField: "text",
      numberField: 42,
      booleanField: true,
      arrayField: [1, 2, 3],
      objectField: { nested: "value" },
      nullField: null,
    });
  });

  it("should return 404 without content", async () => {
    // Arrange: Test 404 response (no content type specified in spec)
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "404",
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response
    expect(response.status).toBe(404);
  });

  it("should return 4XX wildcard status code (400)", async () => {
    // Arrange: Test 4XX wildcard pattern with 400 status
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "4XX",
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
      (result, res) => {
        // Custom handler to map 4XX wildcard to 400
        if (result.status === "4XX") {
          res.status(400).send();
        } else if (result.contentType && result.data !== undefined) {
          res
            .status(Number(result.status))
            .type(result.contentType)
            .send(result.data);
        } else if (result.contentType) {
          res.status(Number(result.status)).type(result.contentType).send();
        } else {
          res.status(Number(result.status)).send();
        }
      },
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response - 4XX wildcard maps to 400 in our handler
    expect(response.status).toBe(400);
  });

  it("should return 4XX wildcard status code (403)", async () => {
    // Arrange: Test that 4XX pattern can handle other 4xx status codes
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "4XX",
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
      (result, res) => {
        // Custom handler to map 4XX wildcard to 403 for this test
        if (result.status === "4XX") {
          res.status(403).send();
        } else if (result.contentType && result.data !== undefined) {
          res
            .status(Number(result.status))
            .type(result.contentType)
            .send(result.data);
        } else if (result.contentType) {
          res.status(Number(result.status)).type(result.contentType).send();
        } else {
          res.status(Number(result.status)).send();
        }
      },
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response - 4XX wildcard maps to 403 in our handler
    expect(response.status).toBe(403);
  });

  it("should handle deeply nested wildcard object structures", async () => {
    // Arrange: Test that wildcard objects support deep nesting
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "200",
          contentType: "application/json",
          data: {
            level1: {
              level2: {
                level3: {
                  level4: {
                    deepValue: "nested",
                  },
                },
              },
            },
          },
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response
    expect(response.status).toBe(200);
    expect(response.body.level1.level2.level3.level4.deepValue).toBe("nested");
  });

  it("should handle wildcard object with array of objects", async () => {
    // Arrange: Test that wildcard objects can contain complex array structures
    const handler: testWildcardsHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        return {
          status: "200",
          contentType: "application/json",
          data: {
            items: [
              { id: 1, name: "Item 1" },
              { id: 2, name: "Item 2" },
              { id: 3, name: "Item 3", metadata: { tags: ["a", "b"] } },
            ],
          },
        };
      }

      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/wildcards",
      "get",
      testWildcardsWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app).get("/wildcards");

    // Assert: Verify the response
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[2].metadata.tags).toEqual(["a", "b"]);
  });
});
