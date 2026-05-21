import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { ImportManager } from "@apical-ts/core-utils";
import {
  extractOperationGenerationMetadata,
  generateResponseUnion,
  type ResponseHeaderMapResult,
  type OperationGenerationMetadata,
} from "@apical-ts/core-utils/shared";

import {
  extractRouteOperationMetadataFromMetadata,
  type RouteOperationMetadata as LightweightRouteMetadata,
} from "./route-operation-extractor.js";
import { renderRouteMetadata } from "./templates/route-metadata-templates.js";

/* Result of generating a route metadata module with imports */
export interface GeneratedRouteMetadata {
  importManager: ImportManager;
  routeCode: string;
}

/* Extended route operation metadata for template generation */
export interface RouteOperationMetadata {
  bodyInfo: {
    contentTypeMaps: LightweightRouteMetadata["bodyInfo"]["contentTypeMaps"];
    hasBody: boolean;
    requestBodyMap: OperationGenerationMetadata["bodyInfo"]["requestBodyMap"];
    requestMapTypeName: string;
    responseHeaderMap: OperationGenerationMetadata["bodyInfo"]["responseHeaderMap"];
    responseHeadersMapTypeName: string;
    responseMap: OperationGenerationMetadata["bodyInfo"]["responseMap"];
    responseMapTypeName: string;
    shouldGenerateResponseHeadersMap: boolean;
    shouldGenerateRequestMap: boolean;
    shouldGenerateResponseMap: boolean;
  };
  functionName: string;
  operation: OperationObject;
  operationId: string;
  parameterInfo: LightweightRouteMetadata["parameterInfo"];
}

/**
 * Builds request map for operations with request bodies
 */
export function buildRequestMap(
  metadata: RouteOperationMetadata,
  importManager: ImportManager,
): string {
  const mapName = metadata.bodyInfo.requestMapTypeName;

  if (!metadata.bodyInfo.shouldGenerateRequestMap) {
    /* Still export an empty map for operations without request bodies */
    return `export const ${mapName} = {} as const;
export type ${mapName} = typeof ${mapName};`;
  }

  for (const typeImport of metadata.bodyInfo.requestBodyMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  /* Convert the type-shape map into an object-literal friendly map */
  const fixedMapType =
    metadata.bodyInfo.requestBodyMap.requestMapType.replaceAll(";", ",");

  return `export const ${mapName} = ${fixedMapType} as const;
export type ${mapName} = typeof ${mapName};`;
}

/**
 * Builds response map for operations
 */
export function buildResponseMap(
  metadata: RouteOperationMetadata,
  importManager: ImportManager,
  doc: OpenAPIObject,
): string {
  const responseTypeImports = new Set<string>();
  const routeResponseTypeName = `${metadata.functionName}RouteResponse`;
  const responseHeadersMapName = metadata.bodyInfo.responseHeadersMapTypeName;
  const unionResult = generateResponseUnion(
    metadata.operation,
    metadata.operationId,
    responseTypeImports,
    doc,
    undefined,
    routeResponseTypeName,
    metadata.bodyInfo.shouldGenerateResponseHeadersMap
      ? responseHeadersMapName
      : undefined,
  );

  const responseHeadersMapCode = metadata.bodyInfo
    .shouldGenerateResponseHeadersMap
    ? buildResponseHeadersMap(
        responseHeadersMapName,
        metadata.bodyInfo.responseHeaderMap,
        importManager,
      )
    : `export const ${responseHeadersMapName} = {} as const;
export type ${responseHeadersMapName} = typeof ${responseHeadersMapName};`;

  for (const typeImport of metadata.bodyInfo.responseHeaderMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }
  for (const typeImport of metadata.bodyInfo.responseMap.typeImports) {
    importManager.addSchemaImport(typeImport);
  }
  for (const typeImport of unionResult.typeImports) {
    importManager.addSchemaImport(typeImport);
  }

  const responseMapName = metadata.bodyInfo.responseMapTypeName;
  const responseMapCode = metadata.bodyInfo.shouldGenerateResponseMap
    ? `export const ${responseMapName} = ${metadata.bodyInfo.responseMap.responseMapType} as const;
export type ${responseMapName} = typeof ${responseMapName};`
    : `export const ${responseMapName} = {} as const;
export type ${responseMapName} = typeof ${responseMapName};`;

  return `${responseHeadersMapCode}\n\n${responseMapCode}\n\n${unionResult.unionTypeDefinition}`;
}

/**
 * Generates route metadata module for an operation
 */
export function generateRouteMetadata(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[] = [],
  doc: OpenAPIObject,
): GeneratedRouteMetadata {
  const metadata = extractOperationGenerationMetadata({
    doc,
    method,
    operation,
    pathKey,
    pathLevelParameters,
  });

  return generateRouteMetadataFromMetadata(metadata, doc);
}

export function generateRouteMetadataFromMetadata(
  metadata: OperationGenerationMetadata,
  doc: OpenAPIObject,
): GeneratedRouteMetadata {
  const routeMetadata = extractCompleteRouteMetadata(metadata);
  const importManager = new ImportManager();

  const requestMapCode = buildRequestMap(routeMetadata, importManager);
  const responseMapCode = buildResponseMap(routeMetadata, importManager, doc);
  const isServerHeadersOptional =
    metadata.parameterGroups.headerParams.every(
      (parameter) => parameter.required !== true,
    ) && metadata.operationSecurityHeaders.length === 0;
  const routeCode = renderRouteMetadata({
    clientIsHeadersOptional: routeMetadata.parameterInfo.isHeadersOptional,
    hasHeaders: routeMetadata.parameterInfo.hasHeaders,
    hasPath: routeMetadata.parameterInfo.hasPath,
    hasQuery: routeMetadata.parameterInfo.hasQuery,
    isQueryOptional: routeMetadata.parameterInfo.isQueryOptional,
    method: metadata.method.toLowerCase(),
    operationId: routeMetadata.operationId,
    pathKey: metadata.pathKey,
    requestMapCode,
    requestMapTypeName: routeMetadata.bodyInfo.requestMapTypeName,
    responseMapCode,
    responseHeadersMapTypeName:
      routeMetadata.bodyInfo.responseHeadersMapTypeName,
    responseMapTypeName: routeMetadata.bodyInfo.responseMapTypeName,
    serverIsHeadersOptional: isServerHeadersOptional,
  });

  return {
    importManager,
    routeCode,
  };
}

/* Extracts metadata needed for route generation */
function extractCompleteRouteMetadata(
  metadata: OperationGenerationMetadata,
): RouteOperationMetadata {
  const lightweightMeta = extractRouteOperationMetadataFromMetadata(metadata);

  return {
    bodyInfo: {
      contentTypeMaps: lightweightMeta.bodyInfo.contentTypeMaps,
      hasBody: lightweightMeta.bodyInfo.hasBody,
      requestBodyMap: metadata.bodyInfo.requestBodyMap,
      requestMapTypeName: lightweightMeta.bodyInfo.requestMapTypeName,
      responseHeaderMap: metadata.bodyInfo.responseHeaderMap,
      responseHeadersMapTypeName:
        lightweightMeta.bodyInfo.responseHeadersMapTypeName,
      responseMap: metadata.bodyInfo.responseMap,
      responseMapTypeName: lightweightMeta.bodyInfo.responseMapTypeName,
      shouldGenerateResponseHeadersMap:
        lightweightMeta.bodyInfo.shouldGenerateResponseHeadersMap,
      shouldGenerateRequestMap:
        lightweightMeta.bodyInfo.shouldGenerateRequestMap,
      shouldGenerateResponseMap:
        lightweightMeta.bodyInfo.shouldGenerateResponseMap,
    },
    functionName: metadata.functionName,
    operation: metadata.operation,
    operationId: metadata.operationId,
    parameterInfo: lightweightMeta.parameterInfo,
  };
}

function buildResponseHeadersMap(
  responseHeadersMapName: string,
  responseHeaderMap: ResponseHeaderMapResult,
  importManager: ImportManager,
): string {
  const schemaDefinitions: string[] = [];
  const sharedSchemaDefinitions = new Map<string, string>();

  const splitHeaderValuesHelper = `const splitHeaderValues = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};`;

  for (const status of responseHeaderMap.statuses) {
    for (const header of status.headers) {
      if (!header.componentSchemaName) {
        continue;
      }

      if (!sharedSchemaDefinitions.has(header.componentSchemaName)) {
        sharedSchemaDefinitions.set(
          header.componentSchemaName,
          `const ${header.componentSchemaName} = ${header.schemaCode};`,
        );
      }
    }
  }

  if (
    responseHeaderMap.statuses.some((status) =>
      status.headers.some((header) =>
        header.schemaCode.includes("splitHeaderValues"),
      ),
    )
  ) {
    schemaDefinitions.push(splitHeaderValuesHelper);
  }

  schemaDefinitions.push(...sharedSchemaDefinitions.values());

  for (const status of responseHeaderMap.statuses) {
    const schemaName = `${responseHeadersMapName}${status.statusCode === "default" ? "Default" : status.statusCode}Schema`;
    const headerProps = status.headers
      .map((header) => {
        const schemaCode = header.componentSchemaName
          ? header.componentSchemaName
          : header.schemaCode;
        return `${JSON.stringify(header.normalizedName)}: ${
          header.required ? schemaCode : `${schemaCode}.optional()`
        }`;
      })
      .join(", ");

    schemaDefinitions.push(
      `const ${schemaName} = z.object({ ${headerProps} });`,
    );
  }

  const mapEntries = responseHeaderMap.statuses
    .map((status) => {
      const schemaName = `${responseHeadersMapName}${status.statusCode === "default" ? "Default" : status.statusCode}Schema`;
      return `  "${status.statusCode}": ${schemaName},`;
    })
    .join("\n");

  const imports = [
    `import type { StandardSchemaV1 } from "@standard-schema/spec";`,
    `import * as z from "zod";`,
  ];

  if (schemaDefinitions.some((definition) => definition.includes("z.infer"))) {
    importManager.addZodImport();
  }

  return `${imports.join("\n")}

${schemaDefinitions.join("\n\n")}

export const ${responseHeadersMapName} = {
${mapEntries}
} as const;
export type ${responseHeadersMapName} = typeof ${responseHeadersMapName};`;
}
