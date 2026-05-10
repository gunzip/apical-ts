import { access, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { generateHonoServer } from "../scripts/hono-generator/generate-hono-server.js";

const currentDirectoryPath = path.dirname(fileURLToPath(import.meta.url));
const exampleRootPath = path.resolve(currentDirectoryPath, "..");
const generatedFixturePath = path.join(exampleRootPath, "generated");
const tempDirectoryPaths: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirectoryPaths.splice(0).map((tempDirectoryPath) => {
      return rm(tempDirectoryPath, { force: true, recursive: true });
    }),
  );
});

async function createTempGeneratedFixture() {
  const tempRootPath = await mkdtemp(path.join(os.tmpdir(), "apical-hono-"));
  const tempGeneratedPath = path.join(tempRootPath, "generated");

  tempDirectoryPaths.push(tempRootPath);
  await cp(generatedFixturePath, tempGeneratedPath, { recursive: true });

  return {
    tempGeneratedPath,
    tempRootPath,
  };
}

describe("generateHonoServer", () => {
  it("creates one userland handler stub per route and keeps it on regeneration", async () => {
    const { tempGeneratedPath, tempRootPath } =
      await createTempGeneratedFixture();
    const customHonoOutputPath = path.join(
      tempRootPath,
      "custom-output",
      "hono",
    );
    const customHandlersPath = path.join(tempRootPath, "handlers");

    await generateHonoServer({
      generatedHonoDirPath: customHonoOutputPath,
      generatedRoutesDirPath: path.join(tempGeneratedPath, "routes"),
      handlersDirPath: customHandlersPath,
      projectRoot: exampleRootPath,
    });

    const [
      operationModule,
      registerModule,
      handlerModule,
      generatedPackageJsonContent,
    ] = await Promise.all([
      readFile(path.join(customHonoOutputPath, "operations/addPet.ts"), "utf8"),
      readFile(path.join(customHonoOutputPath, "register-routes.ts"), "utf8"),
      readFile(path.join(customHandlersPath, "addPet.ts"), "utf8"),
      readFile(path.join(tempGeneratedPath, "package.json"), "utf8"),
    ]);
    const generatedPackageJson = JSON.parse(generatedPackageJsonContent);

    expect(operationModule).toContain(
      'import { addPetHandler } from "../../../handlers/addPet.js";',
    );
    expect(operationModule).toContain("type addPetRouteResponse");
    expect(operationModule).toContain("await addPetHandler(input, context);");
    expect(operationModule).toContain(
      "runtime.GeneratedOperationHandler<typeof addPetRoute, AddPetHandlerResult>",
    );
    expect(registerModule).not.toContain("GeneratedRouteHandlers");
    expect(registerModule).toContain("registerAddPetRoute(app);");
    expect(handlerModule).toContain(
      "export const addPetHandler: AddPetHandler = async (_input, _context) => {",
    );
    expect(handlerModule).toContain(
      'throw new Error("Implement addPetHandler for addPet.");',
    );
    expect(generatedPackageJson.dependencies).toMatchObject({
      "@hono/zod-validator": expect.any(String),
      hono: expect.any(String),
      zod: expect.any(String),
    });
    expect(generatedPackageJson.dependencies.zocker).toBeUndefined();
    await expect(
      access(path.join(customHonoOutputPath, "mock-runtime.ts")),
    ).rejects.toThrow();

    const preservedHandlerContent = "export const preserved = true;\n";

    await writeFile(
      path.join(customHandlersPath, "addPet.ts"),
      preservedHandlerContent,
    );

    await generateHonoServer({
      generatedHonoDirPath: customHonoOutputPath,
      generatedRoutesDirPath: path.join(tempGeneratedPath, "routes"),
      handlersDirPath: customHandlersPath,
      projectRoot: exampleRootPath,
    });

    await expect(
      readFile(path.join(customHandlersPath, "addPet.ts"), "utf8"),
    ).resolves.toBe(preservedHandlerContent);
  });

  it("emits mock handler files only when explicitly requested", async () => {
    const { tempGeneratedPath } = await createTempGeneratedFixture();
    const tempHonoOutputPath = path.join(tempGeneratedPath, "hono");

    await generateHonoServer({
      generatedHonoDirPath: tempHonoOutputPath,
      generatedRoutesDirPath: path.join(tempGeneratedPath, "routes"),
      includeMocks: true,
      projectRoot: exampleRootPath,
    });

    const [
      operationModule,
      mockHandlerModule,
      mockRuntimeModule,
      generatedPackageJsonContent,
    ] = await Promise.all([
      readFile(path.join(tempHonoOutputPath, "operations/addPet.ts"), "utf8"),
      readFile(path.join(tempHonoOutputPath, "handlers/addPet.ts"), "utf8"),
      readFile(path.join(tempHonoOutputPath, "mock-runtime.ts"), "utf8"),
      readFile(path.join(tempGeneratedPath, "package.json"), "utf8"),
    ]);
    const generatedPackageJson = JSON.parse(generatedPackageJsonContent);

    expect(operationModule).toContain(
      'import { addPetHandler } from "../handlers/addPet.js";',
    );
    expect(mockHandlerModule).toContain(
      "export const addPetHandler = createMockOperationHandler(addPetRoute);",
    );
    expect(mockRuntimeModule).toContain('import { zocker } from "zocker";');
    expect(generatedPackageJson.dependencies).toMatchObject({
      zocker: expect.any(String),
    });
  });
});
