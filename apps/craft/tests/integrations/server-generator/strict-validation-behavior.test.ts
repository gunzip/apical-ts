import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testMultiContentTypesWrapper,
  testMultiContentTypesHandler,
} from "../generated/server/testMultiContentTypes.js";
import { setupTestRoute, mockData } from "./test-helpers.js";

describe("Additional Properties behavior", () => {
  it("should accept request body with extra properties (default behavior)", async () => {
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        // Extra properties should be allowed since NewModel doesn't have additionalProperties: false
        expect(params.value.body).toMatchObject({
          id: "test-123",
          name: "Test Object",
          // Extra properties are allowed but may not be preserved in the parsed result
        });
        return {
          status: "200",
          contentType: "application/json",
          data: mockData.newModel(),
        };
      }

      throw new Error(
        `Unexpected validation error: ${"isValid" in params && !params.isValid ? params.kind : "unknown"}`,
      );
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Send request with extra properties that should be accepted (default behavior)
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send({
        id: "test-123",
        name: "Test Object",
        extraProperty: "this should be accepted", // This extra property should be accepted
        anotherExtra: 42,
      })
      .set("Content-Type", "application/json");

    // Assert that request succeeded
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: "model-123",
      name: "Test Model",
    });
  });

  it("should accept request body without extra properties", async () => {
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        expect(params.value.body).toEqual({
          id: "test-123",
          name: "Test Object",
        });
        return {
          status: "200",
          contentType: "application/json",
          data: mockData.newModel(),
        };
      }

      throw new Error(
        `Unexpected validation error: ${"isValid" in params && !params.isValid ? params.kind : "unknown"}`,
      );
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Send request with only expected properties
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send({
        id: "test-123",
        name: "Test Object",
      })
      .set("Content-Type", "application/json");

    // Assert that request succeeded
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: "model-123",
      name: "Test Model",
    });
  });
});
