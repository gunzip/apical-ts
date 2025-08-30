import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testMultiContentTypesWrapper,
  testMultiContentTypesHandler,
} from "../generated/server/testMultiContentTypes.js";
import { setupTestRoute, mockData } from "./test-helpers.js";

describe("testMultiContentTypes operation integration tests", () => {
  it("should handle JSON content type request and response", async () => {
    // Arrange: Handler that accepts JSON and returns JSON
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("success" in params && params.success) {
        expect(params.value.body).toBeDefined();
        expect(params.value.body).toMatchObject({
          id: "test-123",
          name: "Test Object",
        });

        return {
          status: 200,
          contentType: "application/json",
          data: mockData.newModel(),
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Act: Send JSON request
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send({
        id: "test-123",
        name: "Test Object",
      })
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      id: "model-123",
      name: "Test Model",
    });
  });

  it("should handle custom JSON content type response", async () => {
    // Arrange: Handler that returns custom vnd JSON
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("success" in params && params.success) {
        return {
          status: 200,
          contentType: "application/vnd.custom+json",
          data: {
            id: "custom-123",
            name: "Custom Response",
          },
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Act: Send request expecting custom content type
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send({
        id: "test-456",
        name: "Test Object",
      })
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.custom+json",
    );
    expect(response.body).toMatchObject({
      id: "custom-123",
      name: "Custom Response",
    });
  });

  it("should handle form-urlencoded content type", async () => {
    // Arrange: Handler that accepts form data
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("success" in params && params.success) {
        expect(params.value.body).toBeDefined();
        // Form-encoded data might be parsed differently

        return {
          status: 200,
          contentType: "application/json", // Change to JSON for easier testing
          data: {
            id: "form-123",
            name: "Form Response",
          },
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Act: Send form-encoded request
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send("id=form-456&name=Test+Object")
      .set("Content-Type", "application/x-www-form-urlencoded");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      id: "form-123",
      name: "Form Response",
    });
  });

  it("should handle body validation errors", async () => {
    // Arrange: Handler that expects validation error
    let validationErrorReceived = false;

    const handler: testMultiContentTypesHandler = async (params) => {
      if (
        "success" in params &&
        !params.success &&
        params.kind === "body_error"
      ) {
        validationErrorReceived = true;
        expect(params.error.issues).toBeDefined();

        return {
          status: 200,
          contentType: "application/json",
          data: {
            id: "error-123",
            name: "Error Response",
          },
        };
      }

      return {
        status: 200,
        contentType: "application/json",
        data: mockData.newModel(),
      };
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
      (result, res) => {
        if (validationErrorReceived) {
          res.status(400).json({ error: "Body validation failed" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: Send invalid request body
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send({
        // Missing required fields or invalid structure
        invalidField: "invalid",
      })
      .set("Content-Type", "application/json");

    // Assert
    expect(validationErrorReceived).toBe(true);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Body validation failed");
  });

  it("should handle unknown content types gracefully", async () => {
    // Arrange: Handler that accepts any content type
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("success" in params && params.success) {
        // Should still receive the body even with unknown content type
        // Body might be undefined for unknown content types, which is acceptable

        return {
          status: 200,
          contentType: "application/json",
          data: {
            id: "unknown-123",
            name: "Unknown Content Type",
          },
        };
      } else if (
        "success" in params &&
        !params.success &&
        params.kind === "body_error"
      ) {
        // If there's a body validation error with unknown content type, that's also acceptable
        return {
          status: 200,
          contentType: "application/json",
          data: {
            id: "unknown-error-123",
            name: "Unknown Content Error Handled",
          },
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-multi-content-types",
      "post",
      testMultiContentTypesWrapper,
      handler,
    );

    // Act: Send request with unknown content type
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send(JSON.stringify({ id: "unknown-456", name: "Unknown Test" }))
      .set("Content-Type", "text/plain");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      id: "unknown-123",
      name: "Unknown Content Type",
    });
  });
});
