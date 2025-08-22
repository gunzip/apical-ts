import { describe, expect, it } from "vitest";

import { ApiError } from "../../src/core-generator/error.js";

describe("ApiError", () => {
  it("should create an API error with status code, response body, and headers", () => {
    const statusCode = 404;
    const responseBody = { error: "Not found" };
    const headers = new Headers({ "Content-Type": "application/json" });

    const error = new ApiError(statusCode, responseBody, headers);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("API Error: 404");
    expect(error.name).toBe("ApiError");
    expect(error.statusCode).toBe(404);
    expect(error.responseBody).toEqual(responseBody);
    expect(error.headers).toBe(headers);
  });

  it("should handle different status codes", () => {
    const error500 = new ApiError(500, "Internal server error", new Headers());
    expect(error500.message).toBe("API Error: 500");
    expect(error500.statusCode).toBe(500);

    const error401 = new ApiError(401, "Unauthorized", new Headers());
    expect(error401.message).toBe("API Error: 401");
    expect(error401.statusCode).toBe(401);
  });

  it("should handle null response body", () => {
    const error = new ApiError(204, null, new Headers());

    expect(error.responseBody).toBeNull();
    expect(error.statusCode).toBe(204);
  });

  it("should handle empty headers", () => {
    const headers = new Headers();
    const error = new ApiError(400, "Bad request", headers);

    expect(error.headers).toBe(headers);
    expect(error.headers.get("Content-Type")).toBeNull();
  });

  it("should handle complex response body objects", () => {
    const complexBody = {
      details: [
        { field: "email", message: "Invalid format" },
        { field: "password", message: "Too short" },
      ],
      error: "Validation failed",
    };

    const error = new ApiError(422, complexBody, new Headers());

    expect(error.responseBody).toEqual(complexBody);
  });

  it("should have proper stack trace", () => {
    const error = new ApiError(500, "Server error", new Headers());

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("ApiError");
  });
});
