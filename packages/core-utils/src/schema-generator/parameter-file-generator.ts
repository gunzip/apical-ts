import { promises as fs } from "fs";
import path from "path";

import type { ReferenceObject, SchemaObject } from "openapi3-ts/oas31";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";

import {
  findStringFormatOverrideByReferenceName,
  renderStringFormatOverrideImports,
} from "./format-overrides.js";
import { buildGeneratedSchemaHelpersImport } from "./helpers-content.js";
import { tryRenderInlineTypeAlias } from "./inline-type-renderer.js";
import { generateParameterSchemas } from "../shared/parameter-schemas.js";
import { sanitizeIdentifier } from "./utils.js";

/**
 * Result of parameter schema file generation
 */
interface ParameterSchemaFileResult {
  content: string;
  fileName: string;
}

/**
 * Generates Zod schema files for operation parameters.
 * Creates separate files for each operation's query, path, and headers schemas.
 */
async function generateParameterSchemaFile(
  schemasDir: string,
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: {
    /* Use client defaults for parameter schema generation */
    coercePrimitives?: boolean;
    formatOverrides?: StringFormatOverrideRegistry;
    lowercaseHeaderKeys?: boolean;
    totalGeneratedSchemaCount?: number;
  } = {},
): Promise<ParameterSchemaFileResult> {
  /* Extract security headers from metadata */
  const sanitizedId = sanitizeIdentifier(operationId);
  const fileName = `${sanitizedId}Parameters.ts`;
  const { securityHeaders = [] } = parameterMetadata;

  /* Generate parameter schemas using shared logic */
  const result = generateParameterSchemas(
    operationId,
    parameterMetadata.parameterGroups,
    {
      ...options,
      parameterSchemaKind: "client",
      securityHeaders,
    },
  );

  /* Generate server-specific schemas with coercion and lowercase headers */
  const serverResult = generateParameterSchemas(
    operationId,
    parameterMetadata.parameterGroups,
    {
      coercePrimitives: true,
      formatOverrides: options.formatOverrides,
      lowercaseHeaderKeys: true,
      parameterSchemaKind: "server",
      securityHeaders,
    },
  );

  const serverSchemaPrefix = "Server";
  const serverSchemaNames = {
    headersSchema: `${sanitizedId}${serverSchemaPrefix}HeadersSchema`,
    pathSchema: `${sanitizedId}${serverSchemaPrefix}PathSchema`,
    querySchema: `${sanitizedId}${serverSchemaPrefix}QuerySchema`,
  };

  /* Track which parameter types actually exist */
  const { hasHeaders, hasPath, hasQuery } = result.hasParameters;

  /* Calculate optionality for parameters */
  const queryParams = parameterMetadata.parameterGroups.queryParams || [];
  const headerParams = parameterMetadata.parameterGroups.headerParams || [];
  const isQueryOptional = queryParams.every(
    (p: { required?: boolean }) => p.required !== true,
  );
  /*
   * Client headers optional only if:
   * - All explicit header params are optional
   * - AND no required security override headers
   *
   * Notes:
   * - Security override (operation.security): go in params.headers (required if present)
   * - Global security: stays available through config.headers and is also exposed
   *   as optional params.headers fields for per-operation overrides
   * - security: [] → empty array, no required headers (disables global security)
   * - security: [{ apiKey: [] }] → requires apiKey header in params.headers
   */
  const securityOverrideHeaders = securityHeaders.filter((sh) => sh.isOverride);
  const hasRequiredClientSecurityHeader = securityOverrideHeaders.some(
    (sh) => sh.isRequired,
  );
  const isClientHeadersOptional =
    headerParams.every((p: { required?: boolean }) => p.required !== true) &&
    !hasRequiredClientSecurityHeader;
  const isServerHeadersOptional =
    headerParams.every((p: { required?: boolean }) => p.required !== true) &&
    securityHeaders.length === 0;
  const clientTypeSchemas = buildParameterTypeSchemas(parameterMetadata, {
    lowercaseHeaderKeys: false,
    parameterSchemaKind: "client",
  });
  const clientParsedParamsTypeSchema = buildInlineParsedParamsTypeSchema(
    clientTypeSchemas,
    { hasHeaders, hasPath, hasQuery },
    { isHeadersOptional: isClientHeadersOptional, isQueryOptional },
  );
  const serverParsedParamsTypeSchema = buildParsedParamsTypeSchema(
    serverSchemaNames,
    { hasHeaders, hasPath, hasQuery },
    { isHeadersOptional: isServerHeadersOptional, isQueryOptional },
  );

  /* Build client parsed params */
  const clientParsedParams = buildParsedParamsSchema(
    sanitizedId,
    result.schemaNames,
    { hasHeaders, hasPath, hasQuery },
    { isHeadersOptional: isClientHeadersOptional, isQueryOptional },
    clientParsedParamsTypeSchema,
    {
      formatOverrides: options.formatOverrides,
      totalGeneratedSchemaCount: options.totalGeneratedSchemaCount,
    },
  );

  /* Build server parsed params */
  const serverParsedParams = buildParsedParamsSchema(
    sanitizedId,
    serverSchemaNames,
    { hasHeaders, hasPath, hasQuery },
    { isHeadersOptional: isServerHeadersOptional, isQueryOptional },
    serverParsedParamsTypeSchema,
    {
      formatOverrides: options.formatOverrides,
      totalGeneratedSchemaCount: 0,
    },
    serverSchemaPrefix,
  );

  /* Rename server schema definitions to use Server prefix */
  const serverSchemaCode = serverResult.schemaCode
    .replace(
      new RegExp(`const ${result.schemaNames.querySchema} =`, "g"),
      `const ${serverSchemaNames.querySchema} =`,
    )
    .replace(
      new RegExp(`const ${result.schemaNames.pathSchema} =`, "g"),
      `const ${serverSchemaNames.pathSchema} =`,
    )
    .replace(
      new RegExp(`const ${result.schemaNames.headersSchema} =`, "g"),
      `const ${serverSchemaNames.headersSchema} =`,
    );

  /* Build the file imports */
  const imports = [`import * as z from "zod";`];
  const helpersImport = buildGeneratedSchemaHelpersImport(
    new Set([...result.helpers, ...serverResult.helpers]),
  ).trimEnd();
  if (helpersImport) {
    imports.push(helpersImport);
  }

  /* Add other type imports */
  if (result.typeImports.size > 0) {
    const typeImportsList = Array.from(result.typeImports)
      .filter(
        (typeImport) =>
          typeImport !== "z" &&
          !findStringFormatOverrideByReferenceName(
            typeImport,
            options.formatOverrides,
          ),
      )
      .sort();
    for (const typeImport of typeImportsList) {
      imports.push(`import { ${typeImport} } from "./${typeImport}.js";`);
    }
  }

  const filePath = path.join(schemasDir, fileName);
  const externalImportLines = renderStringFormatOverrideImports(
    new Set([...result.typeImports, ...serverResult.typeImports]),
    options.formatOverrides,
    filePath,
  );
  if (externalImportLines.length > 0) {
    imports.push(...externalImportLines);
  }

  /* Build exports dynamically based on which schemas exist */
  const clientSchemaExports = buildSchemaExports(result.schemaNames, {
    hasHeaders,
    hasPath,
    hasQuery,
  });
  const serverSchemaExports = buildSchemaExports(serverSchemaNames, {
    hasHeaders,
    hasPath,
    hasQuery,
  });
  const clientTypeExports = buildTypeExports(
    result.schemaNames,
    {
      hasHeaders,
      hasPath,
      hasQuery,
    },
    clientTypeSchemas,
    {
      formatOverrides: options.formatOverrides,
      totalGeneratedSchemaCount: options.totalGeneratedSchemaCount,
    },
  );

  const contentParts: string[] = [
    ...imports,
    "",
    "/* Parameter schemas for type-safe inputs */",
    result.schemaCode,
  ];

  if (serverResult.schemaCode) {
    contentParts.push(
      "",
      "/* Server parameter schemas with coercion and lowercase headers */",
      serverSchemaCode,
    );
  }

  if (clientSchemaExports.length > 0) {
    contentParts.push("", "/* Export schemas for external use */");
    contentParts.push(...clientSchemaExports);
  }

  if (serverSchemaExports.length > 0) {
    contentParts.push("", "/* Export server schemas */");
    contentParts.push(...serverSchemaExports);
  }

  if (clientTypeExports.length > 0) {
    contentParts.push("", "/* Export types for external use */");
    contentParts.push(...clientTypeExports);
  }

  contentParts.push(
    "",
    "/* Combined parsed parameters object */",
    clientParsedParams.objectCode,
    "",
    "/* Combined parsed parameters type */",
    clientParsedParams.typeCode,
    "",
    "/* Combined server parsed parameters object */",
    serverParsedParams.objectCode,
    "",
    "/* Combined server parsed parameters type */",
    serverParsedParams.typeCode,
    "",
  );

  return {
    content: contentParts.join("\n"),
    fileName,
  };
}

/**
 * Writes parameter schema file to the schemas directory
 */
export async function writeParameterSchemaFile(
  schemasDir: string,
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: {
    coercePrimitives?: boolean;
    formatOverrides?: StringFormatOverrideRegistry;
    lowercaseHeaderKeys?: boolean;
    totalGeneratedSchemaCount?: number;
  } = {},
): Promise<void> {
  const result = await generateParameterSchemaFile(
    schemasDir,
    operationId,
    parameterMetadata,
    options,
  );

  const filePath = path.join(schemasDir, result.fileName);
  await fs.writeFile(filePath, result.content, "utf-8");
}

/**
 * Builds parsed params schema object with dynamic properties
 */
function buildParsedParamsSchema(
  sanitizedId: string,
  schemaNames: {
    headersSchema: string;
    pathSchema: string;
    querySchema: string;
  },
  hasParameters: { hasHeaders: boolean; hasPath: boolean; hasQuery: boolean },
  optionality: { isHeadersOptional: boolean; isQueryOptional: boolean },
  typeSchema: SchemaObject,
  typeOptions: {
    formatOverrides?: StringFormatOverrideRegistry;
    totalGeneratedSchemaCount?: number;
  },
  prefix = "",
): { objectCode: string; typeCode: string } {
  const name = `${sanitizedId}${prefix}ParsedParams`;
  const queryOptionalCode = optionality.isQueryOptional ? ".optional()" : "";
  const headersOptionalCode = optionality.isHeadersOptional
    ? ".optional()"
    : "";

  const props: string[] = [];
  if (hasParameters.hasQuery) {
    props.push(`  query: ${schemaNames.querySchema}${queryOptionalCode}`);
  }
  if (hasParameters.hasPath) {
    props.push(`  path: ${schemaNames.pathSchema}`);
  }
  if (hasParameters.hasHeaders) {
    props.push(`  headers: ${schemaNames.headersSchema}${headersOptionalCode}`);
  }

  const objectCode =
    props.length > 0
      ? `export const ${name} = z.object({\n${props.join(",\n")}\n});`
      : `export const ${name} = z.object({});`;

  const typeCode =
    tryRenderInlineTypeAlias(`${name}Type`, typeSchema, {
      formatOverrides: typeOptions.formatOverrides,
      totalGeneratedSchemaCount: typeOptions.totalGeneratedSchemaCount,
    }) ?? `export type ${name}Type = z.infer<typeof ${name}>;`;

  return { objectCode, typeCode };
}

/**
 * Builds conditional schema exports
 */
function buildSchemaExports(
  schemaNames: {
    headersSchema: string;
    pathSchema: string;
    querySchema: string;
  },
  hasParameters: { hasHeaders: boolean; hasPath: boolean; hasQuery: boolean },
): string[] {
  const exports: string[] = [];

  if (hasParameters.hasQuery) {
    exports.push(`export { ${schemaNames.querySchema} };`);
  }
  if (hasParameters.hasPath) {
    exports.push(`export { ${schemaNames.pathSchema} };`);
  }
  if (hasParameters.hasHeaders) {
    exports.push(`export { ${schemaNames.headersSchema} };`);
  }

  return exports;
}

/**
 * Builds conditional type exports
 */
function buildTypeExports(
  schemaNames: {
    headersSchema: string;
    pathSchema: string;
    querySchema: string;
  },
  hasParameters: { hasHeaders: boolean; hasPath: boolean; hasQuery: boolean },
  typeSchemas: {
    headersSchema?: SchemaObject;
    pathSchema?: SchemaObject;
    querySchema?: SchemaObject;
  },
  typeOptions: {
    formatOverrides?: StringFormatOverrideRegistry;
    totalGeneratedSchemaCount?: number;
  },
): string[] {
  const exports: string[] = [];

  if (hasParameters.hasQuery) {
    exports.push(
      tryRenderInlineTypeAlias(
        schemaNames.querySchema,
        typeSchemas.querySchema ?? { type: "object" },
        {
          formatOverrides: typeOptions.formatOverrides,
          totalGeneratedSchemaCount: typeOptions.totalGeneratedSchemaCount,
        },
      ) ??
        `export type ${schemaNames.querySchema} = z.infer<typeof ${schemaNames.querySchema}>;`,
    );
  }
  if (hasParameters.hasPath) {
    exports.push(
      tryRenderInlineTypeAlias(
        schemaNames.pathSchema,
        typeSchemas.pathSchema ?? { type: "object" },
        {
          formatOverrides: typeOptions.formatOverrides,
          totalGeneratedSchemaCount: typeOptions.totalGeneratedSchemaCount,
        },
      ) ??
        `export type ${schemaNames.pathSchema} = z.infer<typeof ${schemaNames.pathSchema}>;`,
    );
  }
  if (hasParameters.hasHeaders) {
    exports.push(
      tryRenderInlineTypeAlias(
        schemaNames.headersSchema,
        typeSchemas.headersSchema ?? { type: "object" },
        {
          formatOverrides: typeOptions.formatOverrides,
          totalGeneratedSchemaCount: typeOptions.totalGeneratedSchemaCount,
        },
      ) ??
        `export type ${schemaNames.headersSchema} = z.infer<typeof ${schemaNames.headersSchema}>;`,
    );
  }

  return exports;
}

function buildParameterTypeSchemas(
  parameterMetadata: OperationParameterMetadata,
  options: {
    lowercaseHeaderKeys: boolean;
    parameterSchemaKind: "client" | "server";
  },
): {
  headersSchema?: SchemaObject;
  pathSchema?: SchemaObject;
  querySchema?: SchemaObject;
} {
  const { parameterGroups, securityHeaders = [] } = parameterMetadata;
  const querySchema = buildParameterObjectSchema(parameterGroups.queryParams);
  const pathSchema = buildParameterObjectSchema(parameterGroups.pathParams);
  const headersSchema = buildHeadersSchema(
    parameterGroups.headerParams,
    securityHeaders,
    options,
  );

  return {
    headersSchema,
    pathSchema,
    querySchema,
  };
}

function buildParameterObjectSchema(
  parameters: readonly {
    name: string;
    required?: boolean;
    schema?: ReferenceObject | SchemaObject;
  }[],
): SchemaObject | undefined {
  if (parameters.length === 0) {
    return undefined;
  }

  const properties: NonNullable<SchemaObject["properties"]> = {};
  const required = parameters
    .filter((parameter) => parameter.required === true)
    .map((parameter) => parameter.name);

  for (const parameter of parameters) {
    properties[parameter.name] = parameter.schema ?? { type: "string" };
  }

  return {
    properties,
    required,
    type: "object",
  };
}

function buildHeadersSchema(
  headerParams: readonly {
    name: string;
    required?: boolean;
    schema?: ReferenceObject | SchemaObject;
  }[],
  securityHeaders: readonly {
    headerName: string;
    isRequired: boolean;
  }[],
  options: {
    lowercaseHeaderKeys: boolean;
    parameterSchemaKind: "client" | "server";
  },
): SchemaObject | undefined {
  if (headerParams.length === 0 && securityHeaders.length === 0) {
    return undefined;
  }

  const properties: NonNullable<SchemaObject["properties"]> = {};
  const required = new Set<string>();
  const normalizeHeaderName = (name: string): string =>
    options.lowercaseHeaderKeys ? name.toLowerCase() : name;

  for (const headerParam of headerParams) {
    const normalizedName = normalizeHeaderName(headerParam.name);
    properties[normalizedName] = headerParam.schema ?? { type: "string" };
    if (headerParam.required === true) {
      required.add(normalizedName);
    }
  }

  for (const securityHeader of securityHeaders) {
    const normalizedName = normalizeHeaderName(securityHeader.headerName);
    if (!Object.hasOwn(properties, normalizedName)) {
      properties[normalizedName] = { type: "string" };
    }
    if (
      options.parameterSchemaKind === "server" ||
      securityHeader.isRequired === true
    ) {
      required.add(normalizedName);
    }
  }

  return {
    properties,
    required: Array.from(required),
    type: "object",
  };
}

function buildParsedParamsTypeSchema(
  schemaNames: {
    headersSchema: string;
    pathSchema: string;
    querySchema: string;
  },
  hasParameters: { hasHeaders: boolean; hasPath: boolean; hasQuery: boolean },
  optionality: { isHeadersOptional: boolean; isQueryOptional: boolean },
): SchemaObject {
  const properties: NonNullable<SchemaObject["properties"]> = {};
  const required: string[] = [];

  if (hasParameters.hasQuery) {
    properties.query = { $ref: `#/${schemaNames.querySchema}` };
    if (!optionality.isQueryOptional) {
      required.push("query");
    }
  }

  if (hasParameters.hasPath) {
    properties.path = { $ref: `#/${schemaNames.pathSchema}` };
    required.push("path");
  }

  if (hasParameters.hasHeaders) {
    properties.headers = { $ref: `#/${schemaNames.headersSchema}` };
    if (!optionality.isHeadersOptional) {
      required.push("headers");
    }
  }

  return {
    properties,
    required,
    type: "object",
  };
}

function buildInlineParsedParamsTypeSchema(
  typeSchemas: {
    headersSchema?: SchemaObject;
    pathSchema?: SchemaObject;
    querySchema?: SchemaObject;
  },
  hasParameters: { hasHeaders: boolean; hasPath: boolean; hasQuery: boolean },
  optionality: { isHeadersOptional: boolean; isQueryOptional: boolean },
): SchemaObject {
  const properties: NonNullable<SchemaObject["properties"]> = {};
  const required: string[] = [];

  if (hasParameters.hasQuery && typeSchemas.querySchema) {
    properties.query = typeSchemas.querySchema;
    if (!optionality.isQueryOptional) {
      required.push("query");
    }
  }

  if (hasParameters.hasPath && typeSchemas.pathSchema) {
    properties.path = typeSchemas.pathSchema;
    required.push("path");
  }

  if (hasParameters.hasHeaders && typeSchemas.headersSchema) {
    properties.headers = typeSchemas.headersSchema;
    if (!optionality.isHeadersOptional) {
      required.push("headers");
    }
  }

  return {
    properties,
    required,
    type: "object",
  };
}
