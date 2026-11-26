import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testMultiContentTypesWrapper,
  testMultiContentTypesHandler,
} from "../generated/server/testMultiContentTypes.ts";
import { setupTestRoute, mockData } from "./test-helpers.js";

describe("testMultiContentTypes operation integration tests", () => {
  it("should handle JSON content type request and response", async () => {
    // Arrange: Handler that accepts JSON and returns JSON
    const handler: testMultiContentTypesHandler = async (params) => {
      if ("isValid" in params && params.isValid) {
        expect(params.value.body).toBeDefined();
        expect(params.value.body).toMatchObject({
          id: "test-123",
          name: "Test Object",
        });

        return {
          status: "200",
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
      if ("isValid" in params && params.isValid) {
        return {
          status: "200",
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
      if ("isValid" in params && params.isValid) {
        expect(params.value.body).toBeDefined();
        // Form-encoded data might be parsed differently

        return {
          status: "200",
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
        "isValid" in params &&
        !params.isValid &&
        params.kind === "body-error"
      ) {
        validationErrorReceived = true;
        expect(params.error.issues).toBeDefined();

        return {
          status: "200",
          contentType: "application/json",
          data: {
            id: "error-123",
            name: "Error Response",
          },
        };
      }

      return {
        status: "200",
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

  it("should reject requests with unsupported or unparsed content types when body is required", async () => {
    let bodyErrorReceived = false;
    const handler: testMultiContentTypesHandler = async (params) => {
      if (params.isValid) {
        return {
          status: "200",
          contentType: "application/json",
          data: {
            id: "unknown-123",
            name: "Unknown Content Type",
          },
        };
      }
      if (params.kind === "body-error") {
        bodyErrorReceived = true;
        return {
          status: "200",
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

    // Act: Send request with unknown content type (not parsed by express.json/urlencoded, so req.body is undefined)
    const response = await supertest(app)
      .post("/test-multi-content-types")
      .send(JSON.stringify({ id: "unknown-456", name: "Unknown Test" }))
      .set("Content-Type", "text/plain");

    // Assert
    expect(bodyErrorReceived).toBe(true);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      id: "unknown-error-123",
      name: "Unknown Content Error Handled",
    });
  });

  it("should return body-error when a required request body is missing", async () => {
    let errorMessage = "";
    const handler: testMultiContentTypesHandler = async (params) => {
      if (!params.isValid && params.kind === "body-error") {
        errorMessage = params.error.issues[0]?.message ?? "";
        return {
          status: "200",
          contentType: "application/json",
          data: {
            id: "missing-body",
            name: errorMessage,
          },
        };
      }

      throw new Error("Expected body-error for missing required body");
    };

    const result = await testMultiContentTypesWrapper(handler)({
      query: {},
      path: {},
      headers: {},
    });

    expect(errorMessage).toBe("Request body is required");
    expect(result.status).toBe("200");
  });

  it("should expose and narrow contentType with body in the validated handler params", async () => {
    let seenContentType: string | undefined;
    const handler: testMultiContentTypesHandler = async (params) => {
      if (!params.isValid) {
        throw new Error("Unexpected validation error");
      }

      if (params.value.contentType === "application/json") {
        seenContentType = params.value.contentType;
        return {
          status: "200",
          contentType: "application/json",
          data: {
            id: params.value.body.id ?? "fallback",
            name: params.value.body.name ?? "fallback",
          },
        };
      }

      seenContentType = params.value.contentType;
      return {
        status: "200",
        contentType: "application/json",
        data: {
          id: params.value.body.id,
          name: params.value.body.name,
        },
      };
    };

    const result = await testMultiContentTypesWrapper(handler)({
      query: {},
      path: {},
      headers: {},
      contentType: "application/json; charset=utf-8",
      body: { id: "json-1", name: "Typed Json" },
    });

    expect(seenContentType).toBe("application/json");
    expect(result).toMatchObject({
      status: "200",
      contentType: "application/json",
      data: { id: "json-1", name: "Typed Json" },
    });
  });
});
