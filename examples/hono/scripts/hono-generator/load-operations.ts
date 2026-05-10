import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { getBodyValidators } from "./request-body-utils.js";
import { createFallbackOperationId, toHonoPath } from "./route-utils.js";
import type { OperationDefinition, RouteDefinition } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRouteDefinition(value: unknown): value is RouteDefinition {
  return (
    isRecord(value) &&
    typeof value.method === "string" &&
    typeof value.path === "string" &&
    isRecord(value.requestMap) &&
    isRecord(value.responseMap)
  );
}

export async function loadOperations(generatedRoutesDirPath: string) {
  const routeFileNames = (await readdir(generatedRoutesDirPath))
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort();

  const operations: OperationDefinition[] = [];
  const seenOperationIds = new Set<string>();

  for (const routeFileName of routeFileNames) {
    const moduleBasename = routeFileName.slice(0, -3);
    const routeModuleFilePath = path.join(
      generatedRoutesDirPath,
      routeFileName,
    );
    const routeModuleUrl = pathToFileURL(routeModuleFilePath);
    routeModuleUrl.searchParams.set("generatedAt", `${Date.now()}`);

    const routeModule = await import(routeModuleUrl.href);
    const route = routeModule.serverRoute;

    if (!isRouteDefinition(route)) {
      throw new Error(
        `Route module ${routeFileName} does not export a supported serverRoute definition.`,
      );
    }

    const operationId =
      route.operationId ?? createFallbackOperationId(route.method, route.path);

    if (seenOperationIds.has(operationId)) {
      throw new Error(`Duplicate operationId detected: ${operationId}`);
    }

    seenOperationIds.add(operationId);

    const parameterShape = route.params?.shape ?? {};
    const { honoPath, paramNameMap } = toHonoPath(route.path);

    operations.push({
      bodyValidators: getBodyValidators(route.requestMap),
      hasBody: Object.keys(route.requestMap).length > 0,
      hasHeaders: "headers" in parameterShape,
      hasPath: "path" in parameterShape,
      hasQuery: "query" in parameterShape,
      honoPath,
      method: route.method,
      moduleBasename,
      operationId,
      paramNameMap,
    });
  }

  return operations;
}
