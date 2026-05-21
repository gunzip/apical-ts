import type {
  HeaderObject,
  OpenAPIObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import { normalizeHeaderName } from "./header-name-utils.js";
import { resolveSchemaTypeName } from "./schema-type-resolver.js";
import { resolveResponse } from "./operation-utils.js";
import { parseSchemaReference } from "../schema-generator/schema-references.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";

export interface ResponseHeaderDefinition {
  componentSchemaName?: string;
  normalizedName: string;
  originalName: string;
  required: boolean;
  schemaCode: string;
}

export interface ResponseHeadersByStatus {
  headers: ResponseHeaderDefinition[];
  statusCode: string;
}

export interface ResponseHeaderMapResult {
  statuses: ResponseHeadersByStatus[];
  typeImports: Set<string>;
}

export function generateResponseHeaderMap(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  doc?: OpenAPIObject,
  resolvedSchemas?: Record<string, ReferenceObject | SchemaObject>,
): ResponseHeaderMapResult {
  const statuses: ResponseHeadersByStatus[] = [];

  if (!operation.responses) {
    return {
      statuses,
      typeImports,
    };
  }

  const responseCodes = Object.keys(operation.responses);
  responseCodes.sort(compareResponseStatusCodes);

  for (const statusCode of responseCodes) {
    const responseOrRef = operation.responses[statusCode];
    const response = resolveResponse(responseOrRef, doc);
    if (!response?.headers) {
      continue;
    }

    const headers: ResponseHeaderDefinition[] = [];
    for (const [headerName, headerOrRef] of Object.entries(response.headers)) {
      const resolvedHeader = resolveResponseHeader(headerOrRef, doc);
      if (!resolvedHeader) {
        continue;
      }

      const normalizedName = normalizeHeaderName(headerName).toLowerCase();
      headers.push({
        componentSchemaName: isReferenceObject(headerOrRef)
          ? buildSharedHeaderSchemaName(headerOrRef.$ref)
          : undefined,
        normalizedName,
        originalName: headerName,
        required: resolvedHeader.required === true,
        schemaCode: renderHeaderSchemaCode(
          resolvedHeader.schema,
          operationId,
          statusCode,
          headerName,
          typeImports,
          resolvedSchemas,
        ),
      });
    }

    if (headers.length === 0) {
      continue;
    }

    headers.sort((left, right) =>
      left.normalizedName.localeCompare(right.normalizedName),
    );
    statuses.push({
      headers,
      statusCode,
    });
  }

  return {
    statuses,
    typeImports,
  };
}

function buildArraySchemaCode(
  schema: SchemaObject,
  operationId: string,
  statusCode: string,
  headerName: string,
  typeImports: Set<string>,
  resolvedSchemas?: Record<string, ReferenceObject | SchemaObject>,
): string {
  const itemSchema = schema.items;
  if (!itemSchema) {
    return `z.preprocess(splitHeaderValues, z.array(z.string()))`;
  }

  const itemCode = renderHeaderSchemaCode(
    itemSchema,
    operationId,
    statusCode,
    `${headerName}Item`,
    typeImports,
    resolvedSchemas,
  );

  return `z.preprocess(splitHeaderValues, z.array(${itemCode}))`;
}

function buildInlineHeaderSchemaCode(
  schema: SchemaObject,
  operationId: string,
  statusCode: string,
  headerName: string,
  typeImports: Set<string>,
  resolvedSchemas?: Record<string, ReferenceObject | SchemaObject>,
): string {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    if (schema.enum.every((value) => typeof value === "string")) {
      return `z.enum([${schema.enum.map((value) => JSON.stringify(value)).join(", ")}])`;
    }
  }

  switch (schema.type) {
    case "array":
      return buildArraySchemaCode(
        schema,
        operationId,
        statusCode,
        headerName,
        typeImports,
        resolvedSchemas,
      );
    case "boolean":
      return "z.stringbool()";
    case "integer":
      return schema.format === "int64"
        ? "z.coerce.bigint()"
        : "z.coerce.number().int()";
    case "number":
      return "z.coerce.number()";
    case "string":
      return "z.string()";
    default:
      return "z.string()";
  }
}

function buildSharedHeaderSchemaName(ref: string): string | undefined {
  const componentMatch = /^#\/components\/headers\/([^/]+)$/u.exec(ref);
  if (!componentMatch) {
    return undefined;
  }

  return `${sanitizeIdentifier(componentMatch[1])}ResponseHeaderSchema`;
}

function compareResponseStatusCodes(left: string, right: string): number {
  if (left === "default") {
    return 1;
  }
  if (right === "default") {
    return -1;
  }

  const isLeftWildcard = /^\dXX$/iu.test(left);
  const isRightWildcard = /^\dXX$/iu.test(right);
  if (isLeftWildcard !== isRightWildcard) {
    return isLeftWildcard ? 1 : -1;
  }

  return parseInt(left, 10) - parseInt(right, 10);
}

function renderHeaderSchemaCode(
  schema: HeaderObject["schema"] | undefined,
  operationId: string,
  statusCode: string,
  headerName: string,
  typeImports: Set<string>,
  resolvedSchemas?: Record<string, ReferenceObject | SchemaObject>,
): string {
  if (!schema) {
    return "z.string()";
  }

  if (isReferenceObject(schema)) {
    const suffix = `${statusCode}Response${sanitizeIdentifier(headerName)}Header`;
    const typeName = resolveSchemaTypeName(
      schema,
      operationId,
      suffix,
      typeImports,
      "response",
      resolvedSchemas,
    );

    const referencedSchema = resolveReferencedSchema(
      schema.$ref,
      resolvedSchemas,
    );
    if (!referencedSchema) {
      return typeName;
    }

    switch (referencedSchema.type) {
      case "array":
        return `z.preprocess(splitHeaderValues, ${typeName})`;
      case "boolean":
        return `z.stringbool().pipe(${typeName})`;
      case "integer":
        return referencedSchema.format === "int64"
          ? `z.coerce.bigint().pipe(${typeName})`
          : `z.coerce.number().int().pipe(${typeName})`;
      case "number":
        return `z.coerce.number().pipe(${typeName})`;
      default:
        return typeName;
    }
  }

  return buildInlineHeaderSchemaCode(
    schema,
    operationId,
    statusCode,
    headerName,
    typeImports,
    resolvedSchemas,
  );
}

function resolveReferencedSchema(
  ref: string,
  resolvedSchemas?: Record<string, ReferenceObject | SchemaObject>,
): SchemaObject | undefined {
  const parsedReference = parseSchemaReference(ref);
  if (!parsedReference || !resolvedSchemas) {
    return undefined;
  }

  const referencedSchema = resolvedSchemas[parsedReference.originalName];
  if (!referencedSchema || isReferenceObject(referencedSchema)) {
    return undefined;
  }

  return referencedSchema;
}

function resolveResponseHeader(
  headerOrRef: HeaderObject | ReferenceObject,
  doc?: OpenAPIObject,
): HeaderObject | undefined {
  if (!isReferenceObject(headerOrRef)) {
    return headerOrRef;
  }
  if (!doc) {
    return undefined;
  }

  const headerMatch = /^#\/components\/headers\/([^/]+)$/u.exec(
    headerOrRef.$ref,
  );
  if (!headerMatch) {
    return undefined;
  }

  const header = doc.components?.headers?.[headerMatch[1]];
  if (!header || isReferenceObject(header)) {
    return undefined;
  }

  return header;
}
