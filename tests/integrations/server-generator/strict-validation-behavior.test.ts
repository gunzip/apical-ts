import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testMultiContentTypesWrapper,
  testMultiContentTypesHandler,
} from "../generated/server/testMultiContentTypes.js";
import { setupTestRoute, mockData } from "./test-helpers.js";

describe("Strict validation behavior", () => {
  it("should reject request body with extra properties due to strict validation", async () => {
    let validationErrorReceived = false;
    let actualError: any = null;

    const handler: testMultiContentTypesHandler = async (params) => {
      if ("success" in params && params.success) {
        return {
          status: 200,
          contentType: "application/json",
          data: mockData.newModel(),
        };
      } else if (
        "success" in params &&
        !params.success &&
        params.kind === "body_error"
      ) {
        validationErrorReceived = true;
        actualError = params.error;
        return {
          status: 400,
          contentType: "application/json",
          data: { error: "Body validation failed" },
        };
      }

      throw new Error(
        `Unexpected validation error: ${"success" in params && !params.success ? params.kind : "unknown"}`,
      );
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Send request with extra properties that should be rejected by strict validation
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send({
        id: "test-123",
        name: "Test Object",
        extraProperty: "this should be rejected", // This extra property should cause validation failure
        anotherExtra: 42,
      })
      .set("Content-Type", "application/json");

    // Assert that validation error was received and handled
    expect(validationErrorReceived).toBe(true);
    expect(response.status).toBe(400);
    expect(actualError).toBeDefined();
    expect(actualError.issues).toBeDefined();
    expect(actualError.issues[0].code).toBe("unrecognized_keys");
    expect(actualError.issues[0].keys).toContain("extraProperty");
    expect(actualError.issues[0].keys).toContain("anotherExtra");
  });

  it("should accept request body without extra properties", async () => {
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("success" in params && params.success) {
        expect(params.value.body).toEqual({
          id: "test-123",
          name: "Test Object",
        });
        return {
          status: 200,
          contentType: "application/json",
          data: mockData.newModel(),
        };
      }

      throw new Error(
        `Unexpected validation error: ${"success" in params && !params.success ? params.kind : "unknown"}`,
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
