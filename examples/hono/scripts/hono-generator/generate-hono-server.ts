import { rm } from "node:fs/promises";
import path from "node:path";

import { buildOperationModule } from "./build-operation-module.js";
import { buildRegisterRoutesModule } from "./build-register-routes-module.js";
import { buildRuntimeModule } from "./build-runtime-module.js";
import { buildUsecaseModule } from "./build-usecase-module.js";
import { syncGeneratedPackageJson } from "./sync-generated-package-json.js";
import { writeFileIfChanged } from "./file-system.js";
import { loadOperations } from "./load-operations.js";

export async function generateHonoServer(projectRoot: string) {
  const generatedDirPath = path.join(projectRoot, "generated");
  const generatedRoutesDirPath = path.join(generatedDirPath, "routes");
  const generatedHonoDirPath = path.join(generatedDirPath, "hono");
  const generatedOperationsDirPath = path.join(
    generatedHonoDirPath,
    "operations",
  );
  const generatedUsecasesDirPath = path.join(generatedHonoDirPath, "usecases");
  const generatedRegisterRoutesFilePath = path.join(
    generatedHonoDirPath,
    "register-routes.ts",
  );
  const generatedRuntimeFilePath = path.join(
    generatedHonoDirPath,
    "runtime.ts",
  );

  const operations = await loadOperations(generatedRoutesDirPath);

  await rm(generatedHonoDirPath, { force: true, recursive: true });

  await Promise.all([
    syncGeneratedPackageJson(projectRoot, generatedDirPath),
    writeFileIfChanged(generatedRuntimeFilePath, buildRuntimeModule()),
    writeFileIfChanged(
      generatedRegisterRoutesFilePath,
      buildRegisterRoutesModule(operations),
    ),
    ...operations.flatMap((operation) => {
      return [
        writeFileIfChanged(
          path.join(
            generatedOperationsDirPath,
            `${operation.moduleBasename}.ts`,
          ),
          buildOperationModule(operation),
        ),
        writeFileIfChanged(
          path.join(generatedUsecasesDirPath, `${operation.moduleBasename}.ts`),
          buildUsecaseModule(operation),
        ),
      ];
    }),
  ]);
}
