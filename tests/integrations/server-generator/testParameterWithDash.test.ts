import { describe, it, expect } from "vitest";
import supertest from "supertest";
import {
  testParameterWithDashWrapper,
  testParameterWithDashHandler,
} from "../generated/server-operations/testParameterWithDash.js";
import { setupTestRoute } from "./test-helpers.js";

// express treat hypens literally and does not support
// kebab case parameter in routes so we skip this suite

describe.skip("testParameterWithDash operation integration tests", () => {
  it("should return 200 with all parameters correctly validated and passed", async () => {
    // Arrange: Setup handler to validate all parameter types
    const handler: testParameterWithDashHandler = async (params) => {
      if (params.type === "ok") {
        // Validate path parameters
        expect(params.value.path.pathParam).toBe("test-path-param");

        // Validate query parameters
        expect(params.value.query.fooBar).toBe("test-query-value");
        expect(params.value.query.requestId).toBe("request-id-123");

        // Validate header parameters
        expect(params.value.headers.headerInlineParam).toBe(
          "inline-header-value",
        );
        expect(params.value.headers["x-header-param"]).toBe("x-header-value");

        return {
          status: 200,
          contentType: "application/json",
          data: { message: "All parameters validated successfully" },
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-parameter-with-dash/:pathParam",
      "get",
      testParameterWithDashWrapper,
      handler,
    );

    // Act
    const response = await supertest(app)
      .get("/test-parameter-with-dash/test-path-param")
      .query({
        "foo-bar": "test-query-value",
        "request-id": "request-id-123",
      })
      .set("headerInlineParam", "inline-header-value")
      .set("x-header-param", "x-header-value");

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.body.message).toBe("All parameters validated successfully");
  });

  it("should return validation error when path parameter is too short", async () => {
    // Arrange
    let pathValidationFailed = false;

    const handler: testParameterWithDashHandler = async (params) => {
      if (params.type === "path_error") {
        pathValidationFailed = true;
        // Check that path validation failed for minimum length
        const pathError = params.error.issues.find((issue) =>
          issue.path.includes("pathParam"),
        );
        expect(pathError).toBeDefined();
        expect(pathError?.code).toBe("too_small");

        return {
          status: 200,
          contentType: "application/json",
          data: { error: "Path validation failed" },
        };
      }

      return {
        status: 200,
        contentType: "application/json",
        data: { message: "Unexpected success" },
      };
    };

    const app = setupTestRoute(
      "/test-parameter-with-dash/:pathParam",
      "get",
      testParameterWithDashWrapper,
      handler,
      (result, res) => {
        if (pathValidationFailed) {
          res.status(400).json({ error: "Path parameter too short" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: Path parameter "test" is only 4 characters, minimum is 5
    const response = await supertest(app)
      .get("/test-parameter-with-dash/test")
      .query({
        "foo-bar": "test-query-value",
        "request-id": "request-id-123",
      })
      .set("headerInlineParam", "inline-header-value")
      .set("x-header-param", "x-header-value");

    // Assert
    expect(pathValidationFailed).toBe(true);
    expect(response.status).toBe(400);
  });

  it("should return validation error when request-id is too short", async () => {
    // Arrange
    let queryValidationFailed = false;

    const handler: testParameterWithDashHandler = async (params) => {
      if (params.type === "query_error") {
        queryValidationFailed = true;
        // Check that request-id validation failed for minimum length
        const requestIdError = params.error.issues.find((issue) =>
          issue.path.includes("requestId"),
        );
        expect(requestIdError).toBeDefined();
        expect(requestIdError?.code).toBe("too_small");

        return {
          status: 200,
          contentType: "application/json",
          data: { error: "Query validation failed" },
        };
      }

      return {
        status: 200,
        contentType: "application/json",
        data: { message: "Unexpected success" },
      };
    };

    const app = setupTestRoute(
      "/test-parameter-with-dash/:pathParam",
      "get",
      testParameterWithDashWrapper,
      handler,
      (result, res) => {
        if (queryValidationFailed) {
          res.status(400).json({ error: "Request ID too short" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: request-id "short" is only 5 characters, minimum is 10
    const response = await supertest(app)
      .get("/test-parameter-with-dash/valid-path")
      .query({
        "foo-bar": "test-query-value",
        "request-id": "short",
      })
      .set("headerInlineParam", "inline-header-value")
      .set("x-header-param", "x-header-value");

    // Assert
    expect(queryValidationFailed).toBe(true);
    expect(response.status).toBe(400);
  });

  it("should return validation error when required headers are missing", async () => {
    // Arrange
    let headerValidationFailed = false;

    const handler: testParameterWithDashHandler = async (params) => {
      if (params.type === "headers_error") {
        headerValidationFailed = true;
        // Check that header validation failed
        expect(params.error.issues.length).toBeGreaterThan(0);

        return {
          status: 200,
          contentType: "application/json",
          data: { error: "Header validation failed" },
        };
      }

      return {
        status: 200,
        contentType: "application/json",
        data: { message: "Unexpected success" },
      };
    };

    const app = setupTestRoute(
      "/test-parameter-with-dash/:path-param",
      "get",
      testParameterWithDashWrapper,
      handler,
      (result, res) => {
        if (headerValidationFailed) {
          res.status(400).json({ error: "Required headers missing" });
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      },
    );

    // Act: Missing required headers
    const response = await supertest(app)
      .get("/test-parameter-with-dash/valid-path")
      .query({
        "foo-bar": "test-query-value",
        "request-id": "valid-request-id",
      });
    // Not setting required headers: headerInlineParam and x-header-param

    // Assert
    expect(headerValidationFailed).toBe(true);
    expect(response.status).toBe(400);
  });

  it.skip("should handle parameter name transformation correctly", async () => {
    // Arrange: Test that parameter names are correctly transformed
    // (foo-bar -> fooBar, path-param -> pathParam, etc.)
    const handler: testParameterWithDashHandler = async (params) => {
      console.log(params);
      if (params.type === "ok") {
        // The generated wrapper should transform kebab-case to camelCase
        expect(params.value.query).toHaveProperty("fooBar");
        expect(params.value.query).toHaveProperty("requestId");
        expect(params.value.path).toHaveProperty("pathParam");
        expect(params.value.headers).toHaveProperty("headerInlineParam");
        expect(params.value.headers).toHaveProperty("x-header-param"); // Special headers preserve original name

        return {
          status: 200,
          contentType: "application/json",
          data: {
            transformedParams: {
              query: params.value.query,
              path: params.value.path,
              headers: params.value.headers,
            },
          },
        };
      }

      throw new Error("Unexpected validation error");
    };

    const app = setupTestRoute(
      "/test-parameter-with-dash/:pathParam",
      "get",
      testParameterWithDashWrapper,
      handler,
    );

    // Act
    const response = await supertest(app)
      .get("/test-parameter-with-dash/transformed-param")
      .query({
        "foo-bar": "query-value",
        "request-id": "request-id-value",
      })
      .set("headerInlineParam", "header-value")
      .set("x-header-param", "x-header-value");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.transformedParams.query.fooBar).toBe("query-value");
    expect(response.body.transformedParams.query.requestId).toBe(
      "request-id-value",
    );
    expect(response.body.transformedParams.path.pathParam).toBe(
      "transformed-param",
    );
    expect(response.body.transformedParams.headers.headerInlineParam).toBe(
      "header-value",
    );
    expect(response.body.transformedParams.headers["x-header-param"]).toBe(
      "x-header-value",
    );
  });
});
