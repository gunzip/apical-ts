import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { app } from "./mock-server-example.js";

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));

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

  it("accepts declared XML request bodies", async () => {
    const response = await app.request("/store/order", {
      body: "<order><id>1</id></order>",
      headers: {
        "content-type": "application/xml",
      },
      method: "POST",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("generates one mock handler file per route for the demo flow", async () => {
    const [operationModule, mockHandlerModule, generatedPackageJsonContent] =
      await Promise.all([
        readFile(
          path.join(
            currentDirectoryPath,
            "../generated/hono/operations/addPet.ts",
          ),
          "utf8",
        ),
        readFile(
          path.join(
            currentDirectoryPath,
            "../generated/hono/handlers/addPet.ts",
          ),
          "utf8",
        ),
        readFile(
          path.join(currentDirectoryPath, "../generated/package.json"),
          "utf8",
        ),
      ]);
    const generatedPackageJson = JSON.parse(generatedPackageJsonContent);

    expect(operationModule).toContain(
      'import { zValidator } from "@hono/zod-validator";',
    );
    expect(operationModule).toContain(
      'import { addPetHandler } from "../handlers/addPet.js";',
    );
    expect(operationModule).toContain("type addPetRouteResponse");
    expect(operationModule).toContain("await addPetHandler(input, context);");
    expect(mockHandlerModule).toContain(
      "export const addPetHandler = createMockOperationHandler(addPetRoute);",
    );
    expect(generatedPackageJson.dependencies).toMatchObject({
      "@hono/zod-validator": expect.any(String),
      hono: expect.any(String),
      zocker: expect.any(String),
      zod: expect.any(String),
    });
    await expect(
      access(
        path.join(currentDirectoryPath, "../generated/hono/mock-handlers.ts"),
      ),
    ).rejects.toThrow();
    await expect(
      access(
        path.join(currentDirectoryPath, "../generated/hono/usecases/addPet.ts"),
      ),
    ).rejects.toThrow();
  });
});
