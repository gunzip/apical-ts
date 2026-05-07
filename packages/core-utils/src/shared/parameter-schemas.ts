/* Shared parameter schema generation logic */

import type {
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { ParameterGroups } from "./models/parameter-models.js";
import type { SecurityHeader } from "./models/security-models.js";
import type { StringFormatOverrideRegistry } from "../schema-generator/format-overrides.js";

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
  formatOverrides?: StringFormatOverrideRegistry;
  lowercaseHeaderKeys?: boolean;
  /**
   * Controls how auth headers are materialized in generated parameter schemas.
   * - client: inherited auth headers are emitted as optional fields, while
   *   operation-level overrides remain required.
   * - server: all security headers are emitted as required because incoming
   *   requests must carry those headers explicitly.
   */
  parameterSchemaKind?: "client" | "server";
  /* Security headers to include in the headers schema */
  securityHeaders?: SecurityHeader[];
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
  /* Dependency identifiers needed by generated parameter schemas */
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
    formatOverrides,
    lowercaseHeaderKeys = false,
    parameterSchemaKind = "client",
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

  const normalizeParameterName = (
    originalName: string,
    parameterLocation: ParameterObject["in"],
  ): string =>
    lowercaseHeaderKeys && parameterLocation === "header"
      ? originalName.toLowerCase()
      : originalName;

  /* Helper to build property entry using zodSchemaToCode; fallback to z.string()
     For servers, applies parameter-specific transformations:
       - Preserve original OpenAPI key verbatim (quoted)
       - Lowercase header parameter keys (Express normalizes)
       - Coerce primitive number/integer/boolean to accept strings */
  const buildProp = (originalName: string, param: ParameterObject): string => {
    const schema = param.schema as ReferenceObject | SchemaObject | undefined;
    const isRequired = param.required === true;
    const name = normalizeParameterName(originalName, param.in);

    let zodCode: string;
    if (schema) {
      const result = zodSchemaToCode(schema, {
        formatOverrides,
        imports: typeImports,
      });
      zodCode = result.code;
      if (coercePrimitives && !isReferenceObject(schema)) {
        const schemaObj = schema as SchemaObject;
        const hasEnum = Array.isArray(schemaObj.enum);
        if (!hasEnum) {
          if (schemaObj.type === "number" || schemaObj.type === "integer") {
            // int64 already uses z.coerce.bigint() which handles coercion natively
            if (
              !(schemaObj.type === "integer" && schemaObj.format === "int64")
            ) {
              zodCode = zodCode.replace(/^z\.number\(\)/, "z.coerce.number()");
            }
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

  if (hasHeaders) {
    const headerProps = new Map<string, string>();

    for (const headerParam of parameterGroups.headerParams) {
      const normalizedName = normalizeParameterName(headerParam.name, "header");
      headerProps.set(normalizedName, buildProp(headerParam.name, headerParam));
    }

    /*
     * Client schemas expose inherited auth headers as optional params so callers
     * can pass them per-operation even when a global config already exists.
     */
    for (const securityHeader of securityHeaders) {
      const normalizedName = normalizeParameterName(
        securityHeader.headerName,
        "header",
      );
      if (headerProps.has(normalizedName)) {
        continue;
      }

      headerProps.set(
        normalizedName,
        `${JSON.stringify(normalizedName)}: ${
          parameterSchemaKind === "server" || securityHeader.isRequired
            ? "z.string()"
            : "z.string().optional()"
        }`,
      );
    }

    const allHeaderProps = [...headerProps.values()].join(", ");

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
