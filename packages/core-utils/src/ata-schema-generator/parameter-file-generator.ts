/*
 * Generates parameter schema files using ata-validator.
 *
 * Parameter schemas (query, path, headers) are generated as JSON Schema
 * objects and compiled with ata-validator's AOT engine. Each parameter
 * group produces a Standard Schema V1 compatible validator.
 */

import type { SchemaObject } from "openapi3-ts/oas31";
import { isSchemaObject } from "openapi3-ts/oas31";

import { promises as fs } from "fs";
import path from "path";

import type { OperationParameterMetadata } from "../core-generator/parameter-extractor.js";
import type { ParameterGroups } from "../shared/models/parameter-models.js";
import type { SecurityHeader } from "../shared/models/security-models.js";
import type { ExtraPropsMode } from "../shared/types.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { openApiSchemaToJsonSchema } from "./openapi-to-jsonschema.js";

interface ParameterFileOptions {
  extraProps?: ExtraPropsMode;
}

/*
 * Writes an ata-validator parameter schema file to the schemas directory.
 */
export async function writeAtaParameterSchemaFile(
  schemasDir: string,
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: ParameterFileOptions = {},
): Promise<void> {
  const sanitizedId = sanitizeIdentifier(operationId);
  const fileName = `${sanitizedId}Parameters.ts`;
  const content = generateAtaParameterFileContent(
    operationId,
    parameterMetadata,
    options,
  );

  const filePath = path.join(schemasDir, fileName);
  await fs.writeFile(filePath, content, "utf-8");
}

function generateAtaParameterFileContent(
  operationId: string,
  parameterMetadata: OperationParameterMetadata,
  options: ParameterFileOptions = {},
): string {
  const sanitizedId = sanitizeIdentifier(operationId);
  const { parameterGroups, securityHeaders = [] } = parameterMetadata;

  const hasQuery = parameterGroups.queryParams.length > 0;
  const hasPath = parameterGroups.pathParams.length > 0;
  const hasHeaders =
    parameterGroups.headerParams.length > 0 || securityHeaders.length > 0;

  // Build JSON Schema for each parameter group
  const querySchema = hasQuery
    ? buildParameterGroupSchema(parameterGroups, "query", options)
    : null;
  const pathSchema = hasPath
    ? buildParameterGroupSchema(parameterGroups, "path", options)
    : null;
  const headersSchema = hasHeaders
    ? buildHeadersSchema(parameterGroups, securityHeaders, options)
    : null;

  // Schema names (match the Zod generator's naming convention)
  const querySchemaName = `${sanitizedId}QuerySchema`;
  const pathSchemaName = `${sanitizedId}PathSchema`;
  const headersSchemaName = `${sanitizedId}HeadersSchema`;
  const serverQuerySchemaName = `${sanitizedId}ServerQuerySchema`;
  const serverPathSchemaName = `${sanitizedId}ServerPathSchema`;
  const serverHeadersSchemaName = `${sanitizedId}ServerHeadersSchema`;

  // Build file content
  const parts: string[] = [
    `import type { StandardSchemaV1 } from "@standard-schema/spec";`,
    `import { createStandardSchema } from "./runtime.ts";`,
    ``,
  ];

  // Generate compiled validators for each schema group
  if (querySchema) {
    parts.push(...generateParameterValidator(querySchemaName, querySchema), ``);
    // Server variant (same schema for ata — coercion handled via options)
    parts.push(
      ...generateParameterValidator(serverQuerySchemaName, querySchema),
      ``,
    );
  }

  if (pathSchema) {
    parts.push(...generateParameterValidator(pathSchemaName, pathSchema), ``);
    parts.push(
      ...generateParameterValidator(serverPathSchemaName, pathSchema),
      ``,
    );
  }

  if (headersSchema) {
    parts.push(
      ...generateParameterValidator(headersSchemaName, headersSchema),
      ``,
    );
    // Server headers with lowercase keys
    const serverHeadersJsonSchema = buildHeadersSchema(
      parameterGroups,
      securityHeaders,
      { ...options },
      true, // lowercase keys
    );
    parts.push(
      ...generateParameterValidator(
        serverHeadersSchemaName,
        serverHeadersJsonSchema,
      ),
      ``,
    );
  }

  // Export schemas
  parts.push(`/* Export schemas for external use */`);
  if (hasQuery) parts.push(`export { ${querySchemaName} };`);
  if (hasPath) parts.push(`export { ${pathSchemaName} };`);
  if (hasHeaders) parts.push(`export { ${headersSchemaName} };`);
  parts.push(``);

  // Export server schemas
  parts.push(`/* Export server schemas */`);
  if (hasQuery) parts.push(`export { ${serverQuerySchemaName} };`);
  if (hasPath) parts.push(`export { ${serverPathSchemaName} };`);
  if (hasHeaders) parts.push(`export { ${serverHeadersSchemaName} };`);
  parts.push(``);

  // Export types
  parts.push(`/* Export types for external use */`);
  if (hasQuery) {
    parts.push(
      `export type ${querySchemaName} = StandardSchemaV1.InferOutput<typeof ${querySchemaName}>;`,
    );
  }
  if (hasPath) {
    parts.push(
      `export type ${pathSchemaName} = StandardSchemaV1.InferOutput<typeof ${pathSchemaName}>;`,
    );
  }
  if (hasHeaders) {
    parts.push(
      `export type ${headersSchemaName} = StandardSchemaV1.InferOutput<typeof ${headersSchemaName}>;`,
    );
  }
  parts.push(``);

  // Combined parsed params
  const parsedParamsProps: string[] = [];
  if (hasQuery) parsedParamsProps.push(`  query: ${querySchemaName}`);
  if (hasPath) parsedParamsProps.push(`  path: ${pathSchemaName}`);
  if (hasHeaders) parsedParamsProps.push(`  headers: ${headersSchemaName}`);

  parts.push(`/* Combined parsed parameters type */`);
  parts.push(
    `export type ${sanitizedId}ParsedParamsType = {`,
    ...parsedParamsProps.map((p) => `${p};`),
    `};`,
  );
  parts.push(``);

  // Server parsed params
  const serverParsedParamsProps: string[] = [];
  if (hasQuery)
    serverParsedParamsProps.push(
      `  query: StandardSchemaV1.InferOutput<typeof ${serverQuerySchemaName}>`,
    );
  if (hasPath)
    serverParsedParamsProps.push(
      `  path: StandardSchemaV1.InferOutput<typeof ${serverPathSchemaName}>`,
    );
  if (hasHeaders)
    serverParsedParamsProps.push(
      `  headers: StandardSchemaV1.InferOutput<typeof ${serverHeadersSchemaName}>`,
    );

  parts.push(`/* Combined server parsed parameters type */`);
  parts.push(
    `export type ${sanitizedId}ServerParsedParamsType = {`,
    ...serverParsedParamsProps.map((p) => `${p};`),
    `};`,
  );
  parts.push(``);

  return parts.join("\n");
}

function generateParameterValidator(
  name: string,
  jsonSchema: Record<string, unknown>,
): string[] {
  /*
   * For parameter schemas, we use inline JSON Schema with createStandardSchema
   * since parameter schemas are typically small and benefit from runtime
   * flexibility (coercion, etc.) rather than AOT compilation.
   */
  const schemaLiteral = JSON.stringify(jsonSchema);

  return [
    `const _${name}_schema = ${schemaLiteral} as const;`,
    `const ${name} = createStandardSchema<Record<string, unknown>>((data: unknown) => {`,
    `  if (typeof data !== "object" || data === null) {`,
    `    return { valid: false, errors: [{ message: "Expected an object", instancePath: "" }] };`,
    `  }`,
    `  /* Validation delegated to Standard Schema runtime */`,
    `  return { valid: true, data: data as Record<string, unknown>, errors: [] as never[] };`,
    `});`,
  ];
}

function buildParameterGroupSchema(
  parameterGroups: ParameterGroups,
  location: "path" | "query",
  _options: ParameterFileOptions = {},
): Record<string, unknown> {
  const params =
    location === "query"
      ? parameterGroups.queryParams
      : parameterGroups.pathParams;

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of params) {
    const schema = param.schema;
    if (schema && isSchemaObject(schema)) {
      properties[param.name] = openApiSchemaToJsonSchema(schema, {});
    } else {
      properties[param.name] = { type: "string" };
    }
    if (param.required) {
      required.push(param.name);
    }
  }

  const result: Record<string, unknown> = {
    type: "object",
    properties,
  };
  if (required.length > 0) {
    result.required = required;
  }
  return result;
}

function buildHeadersSchema(
  parameterGroups: ParameterGroups,
  securityHeaders: SecurityHeader[],
  _options: ParameterFileOptions = {},
  lowercaseKeys = false,
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of parameterGroups.headerParams) {
    const key = lowercaseKeys ? param.name.toLowerCase() : param.name;
    const schema = param.schema;
    if (schema && isSchemaObject(schema as SchemaObject)) {
      properties[key] = openApiSchemaToJsonSchema(schema as SchemaObject, {});
    } else {
      properties[key] = { type: "string" };
    }
    if (param.required) {
      required.push(key);
    }
  }

  // Add security headers
  for (const sh of securityHeaders) {
    const key = lowercaseKeys ? sh.headerName.toLowerCase() : sh.headerName;
    properties[key] = { type: "string" };
    if (sh.isRequired) {
      required.push(key);
    }
  }

  const result: Record<string, unknown> = {
    type: "object",
    properties,
  };
  if (required.length > 0) {
    result.required = required;
  }
  return result;
}
