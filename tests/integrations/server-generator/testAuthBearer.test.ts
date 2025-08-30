import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import supertest from "supertest";
import {
  testAuthBearerWrapper,
  testAuthBearerHandler,
} from "../generated/server/testAuthBearer.js";
import { setupTestRoute, mockData } from "./test-helpers.js";

describe("testAuthBearer operation integration tests", () => {
  it("should return 200 with valid Person when all required parameters are provided", async () => {
    // Arrange: Setup the Express route with the generated wrapper
    const handler: testAuthBearerHandler = async (params) => {
      if (params.kind === "ok") {
        // Validate that required query parameters are present
        expect(params.value.query.qr).toBeDefined();
        expect(params.value.query.qr).toBe("test-required");

        return {
          status: 200,
          contentType: "application/json",
          data: mockData.person(),
        };
      }

      // For validation errors, the wrapper should never reach this point
      // if validation fails, but we return a valid response for type safety
      throw new Error("Unexpected validation error in handler");
    };

    const app = setupTestRoute(
      "/test-auth-bearer",
      "get",
      testAuthBearerWrapper,
      handler,
    );

    // Act: Make the HTTP request
    const response = await supertest(app)
      .get("/test-auth-bearer")
      .query({
        qr: "test-required",
        qo: "optional-param",
        cursor: "cursor-123",
      })
      .set("Authorization", "Bearer test-token");

    // Assert: Verify the response
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body).toMatchObject({
      name: "John Doe",
      age: 30,
      email: "john.doe@example.com",
      fiscal_code: "SPNDNL80R13C555X",
    });
  });

  it("should handle validation errors and call handler with error details", async () => {
    // Arrange: In this test we focus on testing the validation error handling
    let validationErrorReceived = false;

    const handler: testAuthBearerHandler = async (params) => {
      if (params.kind === "query_error") {
        validationErrorReceived = true;
        // Verify the validation error structure
        expect(params.error.issues).toBeDefined();
        expect(params.error.issues.length).toBeGreaterThan(0);
        expect(params.error.issues[0].path).toEqual(["qr"]);

        // Return a valid response (wrapper type constraint)
        return {
          status: 200,
          contentType: "application/json",
          data: mockData.person(),
        };
      }

      return {
        status: 200,
        contentType: "application/json",
        data: mockData.person(),
      };
    };

    const app = setupTestRoute(
      "/test-auth-bearer",
      "get",
      testAuthBearerWrapper,
      handler,
      (result, res) => {
        // In a real app, you would check the handler result type and
        // respond with appropriate status codes
        if (validationErrorReceived) {
          res.status(400).json({ error: "Validation failed" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: Request without required 'qr' parameter
    const response = await supertest(app)
      .get("/test-auth-bearer")
      .query({ qo: "optional-param" })
      .set("Authorization", "Bearer test-token");

    // Assert: Verify that validation error was caught
    expect(validationErrorReceived).toBe(true);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });

  it("should validate cursor parameter minimum length", async () => {
    // Arrange
    let cursorValidationFailed = false;

    const handler: testAuthBearerHandler = async (params) => {
      if (params.kind === "query_error") {
        cursorValidationFailed = true;
        // Check that cursor validation failed
        const cursorError = params.error.issues.find((issue) =>
          issue.path.includes("cursor"),
        );
        expect(cursorError).toBeDefined();

        return {
          status: 200,
          contentType: "application/json",
          data: mockData.person(),
        };
      }

      return {
        status: 200,
        contentType: "application/json",
        data: mockData.person(),
      };
    };

    const app = setupTestRoute(
      "/test-auth-bearer",
      "get",
      testAuthBearerWrapper,
      handler,
      (result, res) => {
        if (cursorValidationFailed) {
          res.status(400).json({ error: "Cursor validation failed" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: Request with cursor that's too short (minimum length is 1)
    const response = await supertest(app)
      .get("/test-auth-bearer")
      .query({
        qr: "test-required",
        cursor: "", // Empty string violates minLength: 1
      })
      .set("Authorization", "Bearer test-token");

    // Assert
    expect(cursorValidationFailed).toBe(true);
    expect(response.status).toBe(400);
  });

  it("should work with minimal required parameters (optional parameters are truly optional)", async () => {
    // Arrange
    // Note: After fixing the bug, optional parameters are now properly optional
    const handler: testAuthBearerHandler = async (params) => {
      if (params.kind === "ok") {
        // Only qr should be required according to OpenAPI spec
        expect(params.value.query.qr).toBe("required-only");
        // Optional parameters should be undefined when not provided
        expect(params.value.query.qo).toBeUndefined();
        expect(params.value.query.cursor).toBeUndefined();

        return {
          status: 200,
          contentType: "application/json",
          data: mockData.person(),
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-auth-bearer",
      "get",
      testAuthBearerWrapper,
      handler,
    );

    // Act: Request with only the required parameter
    // Optional parameters can be omitted entirely
    const response = await supertest(app)
      .get("/test-auth-bearer")
      .query({
        qr: "required-only",
        // qo and cursor are optional and can be omitted
      })
      .set("Authorization", "Bearer test-token");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.name).toBe("John Doe");
  });
});
