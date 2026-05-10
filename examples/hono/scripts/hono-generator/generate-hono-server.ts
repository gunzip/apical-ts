import { rm } from "node:fs/promises";
import path from "node:path";

import { buildHandlerModule } from "./build-handler-module.js";
import { buildMockHandlerModule } from "./build-mock-handler-module.js";
import { buildMockRuntimeModule } from "./build-mock-runtime-module.js";
import { buildOperationModule } from "./build-operation-module.js";
import { buildRegisterRoutesModule } from "./build-register-routes-module.js";
import { buildRuntimeModule } from "./build-runtime-module.js";
import { syncGeneratedPackageJson } from "./sync-generated-package-json.js";
import { writeFileIfAbsent, writeFileIfChanged } from "./file-system.js";
import { loadOperations } from "./load-operations.js";
import type { GenerateHonoServerOptions } from "./types.js";

function toImportDirectoryPath(
  fromDirectoryPath: string,
  targetDirectoryPath: string,
) {
  const relativePath = path.relative(fromDirectoryPath, targetDirectoryPath);
  const normalizedPath = relativePath.split(path.sep).join("/");

  if (normalizedPath === "") {
    return ".";
  }

  return normalizedPath.startsWith(".")
    ? normalizedPath
    : `./${normalizedPath}`;
}

export async function generateHonoServer(options: GenerateHonoServerOptions) {
  const {
    generatedHonoDirPath,
    generatedRoutesDirPath,
    handlersDirPath,
    includeMocks = false,
    projectRoot,
  } = options;
  const generatedDirPath = path.dirname(generatedRoutesDirPath);
  const generatedOperationsDirPath = path.join(
    generatedHonoDirPath,
    "operations",
  );
  const generatedHandlersDirPath = includeMocks
    ? path.join(generatedHonoDirPath, "handlers")
    : (handlersDirPath ?? path.join(projectRoot, "handlers"));
  const generatedRegisterRoutesFilePath = path.join(
    generatedHonoDirPath,
    "register-routes.ts",
  );
  const generatedRuntimeFilePath = path.join(
    generatedHonoDirPath,
    "runtime.ts",
  );
  const generatedMockRuntimeFilePath = path.join(
    generatedHonoDirPath,
    "mock-runtime.ts",
  );
  const routesImportDirectoryFromOperationsDir = toImportDirectoryPath(
    generatedOperationsDirPath,
    generatedRoutesDirPath,
  );
  const handlersImportDirectoryFromOperationsDir = toImportDirectoryPath(
    generatedOperationsDirPath,
    generatedHandlersDirPath,
  );
  const operationsImportDirectoryFromHandlersDir = toImportDirectoryPath(
    generatedHandlersDirPath,
    generatedOperationsDirPath,
  );
  const routesImportDirectoryFromHandlersDir = toImportDirectoryPath(
    generatedHandlersDirPath,
    generatedRoutesDirPath,
  );

  const operations = await loadOperations(generatedRoutesDirPath);

  await rm(generatedHonoDirPath, { force: true, recursive: true });

  const writeOperations = operations.map((operation) => {
    return writeFileIfChanged(
      path.join(generatedOperationsDirPath, `${operation.moduleBasename}.ts`),
      buildOperationModule(operation, {
        handlersImportDirectory: handlersImportDirectoryFromOperationsDir,
        routesImportDirectory: routesImportDirectoryFromOperationsDir,
      }),
    );
  });

  const writeHandlers = operations.map((operation) => {
    const handlerFilePath = path.join(
      generatedHandlersDirPath,
      `${operation.moduleBasename}.ts`,
    );

    if (includeMocks) {
      return writeFileIfChanged(
        handlerFilePath,
        buildMockHandlerModule(operation, {
          mockRuntimeImportDirectory: "../mock-runtime.js",
          operationsImportDirectory: operationsImportDirectoryFromHandlersDir,
          routesImportDirectory: routesImportDirectoryFromHandlersDir,
        }),
      );
    }

    return writeFileIfAbsent(
      handlerFilePath,
      buildHandlerModule(operation, {
        operationsImportDirectory: operationsImportDirectoryFromHandlersDir,
      }),
    );
  });

  const writes = [
    syncGeneratedPackageJson({
      generatedDirPath,
      includeMocks,
      projectRoot,
    }),
    writeFileIfChanged(generatedRuntimeFilePath, buildRuntimeModule()),
    writeFileIfChanged(
      generatedRegisterRoutesFilePath,
      buildRegisterRoutesModule(operations),
    ),
    ...writeOperations,
    ...writeHandlers,
  ];

  if (includeMocks) {
    writes.push(
      writeFileIfChanged(
        generatedMockRuntimeFilePath,
        buildMockRuntimeModule(),
      ),
    );
  }

  await Promise.all(writes);
}
