/* Shared parameter schema generation logic */

import type {
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { ParameterGroups } from "./models/parameter-models.js";

import { zodSchemaToCode } from "../schema-generator/index.js";
import {
  addDescription,
  sanitizeIdentifier,
} from "../schema-generator/utils.js";

/**
 * Options for parameter schema generation, controlling transformations
 * applied during Zod schema creation for OpenAPI parameters.
 */
export interface ParameterSchemaOptions {
  /* Apply coercion transformations for primitive types */
  coercePrimitives?: boolean;
  lowercaseHeaderKeys?: boolean;
  /* Security headers to include in the headers schema */
  securityHeaders?: {
    headerName: string;
    isOverride: boolean;
    isRequired: boolean;
    schemeName: string;
  }[];
}

/**
 * Result of parameter schema generation
 */
export interface ParameterSchemaResult {
  /* Flags indicating which parameter types have actual parameters */
  hasParameters: {
    hasHeaders: boolean;
    hasPath: boolean;
    hasQuery: boolean;
  };
  /* Generated Zod schemas and TypeScript types */
  schemaCode: string;
  /* Schema names for external reference */
  schemaNames: {
    headersSchema: string;
    pathSchema: string;
    querySchema: string;
  };
  /* Type imports needed */
  typeImports: Set<string>;
  /* Type names for external reference */
  typeNames: {
    headersType: string;
    pathType: string;
    queryType: string;
  };
}

/**
 * Generates Zod schemas for all parameter types (query, path, headers)
 */
export function generateParameterSchemas(
  operationId: string,
  parameterGroups: ParameterGroups,
  options: ParameterSchemaOptions = {},
): ParameterSchemaResult {
  const {
    coercePrimitives = false,
    lowercaseHeaderKeys = false,
    securityHeaders = [],
  } = options;
  const sanitizedId = sanitizeIdentifier(operationId);
  const typeImports = new Set<string>();
  const schemas: string[] = [];

  /* Track whether each parameter type has actual parameters */
  const hasQuery = parameterGroups.queryParams.length > 0;
  const hasPath = parameterGroups.pathParams.length > 0;
  const hasHeaders =
    parameterGroups.headerParams.length > 0 || securityHeaders.length > 0;

  /* Helper to build property entry using zodSchemaToCode; fallback to z.string()
     For servers, applies parameter-specific transformations:
       - Preserve original OpenAPI key verbatim (quoted)
       - Lowercase header parameter keys (Express normalizes)
       - Coerce primitive number/integer/boolean to accept strings */
  const buildProp = (originalName: string, param: ParameterObject): string => {
    const schema = param.schema as ReferenceObject | SchemaObject | undefined;
    const isRequired = param.required === true;
    const name =
      lowercaseHeaderKeys && param.in === "header"
        ? originalName.toLowerCase()
        : originalName;

    let zodCode: string;
    if (schema) {
      const result = zodSchemaToCode(schema, {
        imports: typeImports,
      });
      zodCode = result.code;
      if (coercePrimitives && !isReferenceObject(schema)) {
        const schemaObj = schema as SchemaObject;
        const hasEnum = Array.isArray(schemaObj.enum);
        if (!hasEnum) {
          if (schemaObj.type === "number" || schemaObj.type === "integer") {
            zodCode = zodCode.replace(/^z\.number\(\)/, "z.coerce.number()");
          } else if (schemaObj.type === "boolean") {
            zodCode = zodCode.replace(/^z\.boolean\(\)/, "z.stringbool()");
          }
        }
      }
    } else {
      zodCode = "z.string()";
    }

    if (!isRequired) {
      zodCode = `${zodCode}.optional()`;
    }

    /* Add parameter description if present (overrides schema description if any) */
    zodCode = addDescription(zodCode, param.description);

    return `${JSON.stringify(name)}: ${zodCode}`;
  };

  /* Use z.object for all parameter types as OpenAPI parameters don't have additionalProperties */
  const objectMethod = "z.object";
  /* Headers should always use z.object due to standard HTTP headers */
  const headerObjectMethod = "z.object";

  /* Query schema */
  const querySchemaName = `${sanitizedId}QuerySchema`;
  const queryTypeName = `${sanitizedId}QuerySchema`;

  if (hasQuery) {
    const queryProps = parameterGroups.queryParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    schemas.push(
      `const ${querySchemaName} = ${objectMethod}({ ${queryProps} });`,
    );
  }

  /* Path schema */
  const pathSchemaName = `${sanitizedId}PathSchema`;
  const pathTypeName = `${sanitizedId}PathSchema`;

  if (hasPath) {
    const pathProps = parameterGroups.pathParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    schemas.push(
      `const ${pathSchemaName} = ${objectMethod}({ ${pathProps} });`,
    );
  }

  /* Headers schema */
  const headersSchemaName = `${sanitizedId}HeadersSchema`;
  const headersTypeName = `${sanitizedId}HeadersSchema`;

  // Only security overrides go into the headers schema, not global security headers
  const securityOverrideHeaders = securityHeaders.filter((sh) => sh.isOverride);
  const hasSecurityOverrides = securityOverrideHeaders.length > 0;
  const hasCombinedHeaders = hasHeaders || hasSecurityOverrides;

  if (hasCombinedHeaders) {
    const headerProps = parameterGroups.headerParams
      .map((p) => buildProp(p.name, p))
      .join(", ");

    /* Add security override headers to the schema (always required) */
    const securityHeaderProps = securityOverrideHeaders
      .map((sh) => {
        const name = lowercaseHeaderKeys
          ? sh.headerName.toLowerCase()
          : sh.headerName;
        // Security override headers are always required
        const zodCode = "z.string()";
        return `${JSON.stringify(name)}: ${zodCode}`;
      })
      .join(", ");

    const allHeaderProps = [headerProps, securityHeaderProps]
      .filter(Boolean)
      .join(", ");

    schemas.push(
      `const ${headersSchemaName} = ${headerObjectMethod}({ ${allHeaderProps} });`,
    );
  }

  return {
    hasParameters: {
      hasHeaders,
      hasPath,
      hasQuery,
    },
    schemaCode: schemas.join("\n"),
    schemaNames: {
      headersSchema: headersSchemaName,
      pathSchema: pathSchemaName,
      querySchema: querySchemaName,
    },
    typeImports,
    typeNames: {
      headersType: headersTypeName,
      pathType: pathTypeName,
      queryType: queryTypeName,
    },
  };
}
