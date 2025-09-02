import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testAuthBearerHttpWrapper,
  testAuthBearerHttpHandler,
} from "../generated/server/testAuthBearerHttp.js";
import { setupTestRoute, mockData } from "./test-helpers.js";

describe("testAuthBearerHttp operation integration tests", () => {
  it("should return 503 with TestAuthBearerHttp503Response", async () => {
    // Arrange: Setup handler to return 503 status
    const handler: testAuthBearerHttpHandler = async (params) => {
      if ("success" in params && params.success) {
        expect(params.value.query.qr).toBe("test-503");

        return {
          status: 503,
          contentType: "application/json",
          data: {
            prop1: { id: "test-id" },
            prop2: "Service temporarily unavailable",
          },
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-auth-bearer-http",
      "get",
      testAuthBearerHttpWrapper,
      handler,
    );

    // Act
    const response = await supertest(app).get("/test-auth-bearer-http").query({
      qr: "test-503",
      qo: "",
      cursor: "x",
    });

    // Assert
    expect(response.status).toBe(503);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      prop1: { id: "test-id" },
      prop2: "Service temporarily unavailable",
    });
  });

  it("should return 504 with ProblemDetails (application/problem+json)", async () => {
    // Arrange: Setup handler to return 504 status with ProblemDetails
    const handler: testAuthBearerHttpHandler = async (params) => {
      if ("success" in params && params.success) {
        expect(params.value.query.qr).toBe("test-504");

        return {
          status: 504,
          contentType: "application/problem+json",
          data: mockData.problemDetails(),
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-auth-bearer-http",
      "get",
      testAuthBearerHttpWrapper,
      handler,
    );

    // Act
    const response = await supertest(app).get("/test-auth-bearer-http").query({
      qr: "test-504",
      qo: "",
      cursor: "x",
    });

    // Assert
    expect(response.status).toBe(504);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.body).toMatchObject({
      type: "https://example.com/probs/gateway-timeout",
      title: "Gateway Timeout",
      status: 504,
      detail:
        "The upstream service failed to respond within the allotted time.",
    });
  });

  it("should handle query validation errors", async () => {
    // Arrange: Handler that expects validation error for missing required param
    let validationErrorReceived = false;

    const handler: testAuthBearerHttpHandler = async (params) => {
      if (
        "success" in params &&
        !params.success &&
        params.kind === "query-error"
      ) {
        validationErrorReceived = true;
        expect(params.error.issues).toBeDefined();

        // Return a valid response type (503 in this case)
        return {
          status: 503,
          contentType: "application/json",
          data: {
            prop1: { id: "error-id" },
            prop2: "Validation error occurred",
          },
        };
      }

      // Should not reach here in this test
      return {
        status: 503,
        contentType: "application/json",
        data: {
          prop1: { id: "unexpected" },
          prop2: "Unexpected path",
        },
      };
    };

    const app = setupTestRoute(
      "/test-auth-bearer-http",
      "get",
      testAuthBearerHttpWrapper,
      handler,
      (result, res) => {
        if (validationErrorReceived) {
          res.status(400).json({ error: "Query validation failed" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: Request without required 'qr' parameter
    const response = await supertest(app)
      .get("/test-auth-bearer-http")
      .query({ qo: "optional" });

    // Assert
    expect(validationErrorReceived).toBe(true);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Query validation failed");
  });

  it("should validate different content types properly", async () => {
    // Arrange: Test both content types work
    const handler: testAuthBearerHttpHandler = async (params) => {
      if ("success" in params && params.success) {
        const contentType = params.value.query.qr;

        if (contentType === "json") {
          return {
            status: 503,
            contentType: "application/json",
            data: {
              prop1: { id: "json-test" },
              prop2: "JSON response",
            },
          };
        } else if (contentType === "problem") {
          return {
            status: 504,
            contentType: "application/problem+json",
            data: {
              type: "https://example.com/test",
              title: "Test Problem",
              status: 504,
              detail: "This is a test problem response.",
            },
          };
        }
      }

      throw new Error("Unexpected path");
    };

    const app = setupTestRoute(
      "/test-auth-bearer-http",
      "get",
      testAuthBearerHttpWrapper,
      handler,
    );

    // Act & Assert: Test JSON content type
    const jsonResponse = await supertest(app)
      .get("/test-auth-bearer-http")
      .query({
        qr: "json",
        qo: "",
        cursor: "x",
      });

    expect(jsonResponse.status).toBe(503);
    expect(jsonResponse.headers["content-type"]).toContain("application/json");
    expect(jsonResponse.body.prop1.id).toBe("json-test");

    // Act & Assert: Test Problem+JSON content type
    const problemResponse = await supertest(app)
      .get("/test-auth-bearer-http")
      .query({
        qr: "problem",
        qo: "",
        cursor: "x",
      });

    expect(problemResponse.status).toBe(504);
    expect(problemResponse.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(problemResponse.body.title).toBe("Test Problem");
  });
});
