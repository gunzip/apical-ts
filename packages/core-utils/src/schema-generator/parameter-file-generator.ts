import { promises as fs } from "fs";
import path from "path";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";
import type { StringFormatOverrideRegistry } from "./format-overrides.js";

import {
  findStringFormatOverrideByReferenceName,
  renderStringFormatOverrideImports,
} from "./format-overrides.js";
import { PARAMETER_SCHEMA_BUNDLE_FILE_NAME } from "../shared/parameter-schema-bundle.js";
import { generateParameterSchemas } from "../shared/parameter-schemas.js";
import { sanitizeIdentifier } from "./utils.js";

/**
 * Supported options for generated parameter schema content
 */
interface ParameterSchemaFileOptions {
  /* Use client defaults for parameter schema generation */
  coercePrimitives?: boolean;
  formatOverrides?: StringFormatOverrideRegistry;
  lowercaseHeaderKeys?: boolean;
}

interface ParameterSchemaSectionResult {
  content: string;
  typeImports: Set<string>;
}

/**
 * Generates Zod schema content for a single operation.
 */
function generateParameterSchemaSection(
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: ParameterSchemaFileOptions = {},
): ParameterSchemaSectionResult {
  /* Extract security headers from metadata */
  const sanitizedId = sanitizeIdentifier(operationId);
  const { securityHeaders = [] } = parameterMetadata;

  /* Generate parameter schemas using shared logic */
  const result = generateParameterSchemas(
    operationId,
    parameterMetadata.parameterGroups,
    {
      ...options,
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
   * Headers optional only if:
   * - All explicit header params are optional
   * - AND no required security override headers
   *
   * Notes:
   * - Security override (operation.security): go in params.headers (required if present)
   * - Global security: go in config.headers (always optional, not in params)
   * - security: [] → empty array, no required headers (disables global security)
   * - security: [{ apiKey: [] }] → requires apiKey header in params.headers
   */
  const securityOverrideHeaders = securityHeaders.filter((sh) => sh.isOverride);
  const hasRequiredSecurityOverride = securityOverrideHeaders.some(
    (sh) => sh.isRequired,
  );
  const isHeadersOptional =
    headerParams.every((p: { required?: boolean }) => p.required !== true) &&
    !hasRequiredSecurityOverride;

  /* Build client parsed params */
  const clientParsedParams = buildParsedParamsSchema(
    sanitizedId,
    result.schemaNames,
    { hasHeaders, hasPath, hasQuery },
    { isHeadersOptional, isQueryOptional },
  );

  /* Build server parsed params */
  const serverParsedParams = buildParsedParamsSchema(
    sanitizedId,
    serverSchemaNames,
    { hasHeaders, hasPath, hasQuery },
    { isHeadersOptional, isQueryOptional },
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
  const clientTypeExports = buildTypeExports(result.schemaNames, {
    hasHeaders,
    hasPath,
    hasQuery,
  });

  const contentParts: string[] = [`/* Parameter schemas for ${sanitizedId} */`];

  if (result.schemaCode) {
    contentParts.push("", "/* Parameter schemas for type-safe inputs */");
    contentParts.push(result.schemaCode);
  }

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
    typeImports: new Set([...result.typeImports, ...serverResult.typeImports]),
  };
}

/**
 * Generates bundled parameter schema file content for all operations.
 */
function generateParameterSchemaBundleContent(
  schemasDir: string,
  operationParameters: readonly OperationParameterMetadata[],
  options: ParameterSchemaFileOptions = {},
): string {
  const sections: string[] = [];
  const typeImports = new Set<string>();

  for (const parameterMetadata of operationParameters) {
    const section = generateParameterSchemaSection(
      parameterMetadata.operationId,
      parameterMetadata,
      options,
    );
    sections.push(section.content);

    for (const typeImport of section.typeImports) {
      typeImports.add(typeImport);
    }
  }

  if (sections.length === 0) {
    return "export {};\n";
  }

  const imports = buildParameterSchemaImports(
    path.join(schemasDir, PARAMETER_SCHEMA_BUNDLE_FILE_NAME),
    typeImports,
    options.formatOverrides,
  );

  return [...imports, "", sections.join("\n\n")].join("\n");
}

/**
 * Writes the bundled parameter schema file to the schemas directory.
 */
export async function writeParameterSchemaBundleFile(
  schemasDir: string,
  operationParameters: readonly OperationParameterMetadata[],
  options: ParameterSchemaFileOptions = {},
): Promise<void> {
  const filePath = path.join(schemasDir, PARAMETER_SCHEMA_BUNDLE_FILE_NAME);
  const content = generateParameterSchemaBundleContent(
    schemasDir,
    operationParameters,
    options,
  );
  await fs.writeFile(filePath, content, "utf-8");
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

  const typeCode = `export type ${name}Type = z.infer<typeof ${name}>;`;

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

function buildParameterSchemaImports(
  filePath: string,
  typeImports: ReadonlySet<string>,
  formatOverrides?: StringFormatOverrideRegistry,
): string[] {
  const imports = [`import * as z from "zod";`];
  const typeImportsList = Array.from(typeImports)
    .filter(
      (typeImport) =>
        typeImport !== "z" &&
        !findStringFormatOverrideByReferenceName(typeImport, formatOverrides),
    )
    .sort();

  for (const typeImport of typeImportsList) {
    imports.push(`import { ${typeImport} } from "./${typeImport}.js";`);
  }

  const externalImportLines = renderStringFormatOverrideImports(
    new Set(typeImports),
    formatOverrides,
    filePath,
  );
  if (externalImportLines.length > 0) {
    imports.push(...externalImportLines);
  }

  return imports;
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
): string[] {
  const exports: string[] = [];

  if (hasParameters.hasQuery) {
    exports.push(
      `export type ${schemaNames.querySchema} = z.infer<typeof ${schemaNames.querySchema}>;`,
    );
  }
  if (hasParameters.hasPath) {
    exports.push(
      `export type ${schemaNames.pathSchema} = z.infer<typeof ${schemaNames.pathSchema}>;`,
    );
  }
  if (hasParameters.hasHeaders) {
    exports.push(
      `export type ${schemaNames.headersSchema} = z.infer<typeof ${schemaNames.headersSchema}>;`,
    );
  }

  return exports;
}
