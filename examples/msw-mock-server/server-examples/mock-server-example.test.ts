/* Example of using MSW handlers in tests */

import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mock-server-example.js";

/* Setup MSW server for tests */
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("MSW Mock Server", () => {
  it("should mock GET /pets with valid response", async () => {
    /* Note: status parameter expects array in OpenAPI spec */
    const response = await fetch(
      "http://0.0.0.0:3001/pets?status=available&status=pending",
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should mock GET /pets/{petId} with valid response", async () => {
    const response = await fetch("http://0.0.0.0:3001/pets/123");

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name");
  });

  it("should mock POST /pets with valid request", async () => {
    const newPet = {
      id: 1,
      name: "Fluffy",
      status: "available",
    };

    const response = await fetch("http://0.0.0.0:3001/pets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newPet),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("name");
  });

  it("should return 400 for invalid request", async () => {
    const invalidPet = {
      /* Missing required 'id' field */
      name: "Invalid",
    };

    const response = await fetch("http://0.0.0.0:3001/pets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invalidPet),
    });

    /* Should get validation error */
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data).toHaveProperty("message");
  });
});
