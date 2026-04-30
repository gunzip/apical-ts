import { describe, expect, it } from "vitest";

import { app } from "./mock-server-example.js";

describe("Hono Mock Server", () => {
  it("returns mocked responses for valid operations", async () => {
    const response = await app.request("/pet/findByStatus?status=available");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("returns validation errors for invalid requests", async () => {
    const response = await app.request("/pet", {
      body: JSON.stringify({ name: "Invalid pet" }),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("message");
  });
});
