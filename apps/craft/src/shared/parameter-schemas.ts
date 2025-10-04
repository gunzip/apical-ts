/* Shared parameter schema generation logic */

import type {
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import { isReferenceObject } from "openapi3-ts/oas31";

import type { ParameterGroups } from "../client-generator/models/parameter-models.js";

import { zodSchemaToCode } from "../schema-generator/index.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Options for parameter schema generation, controlling transformations
 * applied during Zod schema creation for OpenAPI parameters.
 */
export interface ParameterSchemaOptions {
  /* Apply coercion transformations for primitive types */
  coercePrimitives?: boolean;
  lowercaseHeaderKeys?: boolean;
}

/**
 * Result of parameter schema generation
 */
export interface ParameterSchemaResult {
  /* Generated Zod schema code for each parameter type */
  schemaCode: {
    headers: string;
    path: string;
    query: string;
  };
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
  const { coercePrimitives = false, lowercaseHeaderKeys = false } = options;
  const sanitizedId = sanitizeIdentifier(operationId);
  const typeImports = new Set<string>();

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

    return `${JSON.stringify(name)}: ${zodCode}`;
  };

  /* Use z.object for all parameter types as OpenAPI parameters don't have additionalProperties */
  const objectMethod = "z.object";
  /* Headers should always use z.object due to standard HTTP headers */
  const headerObjectMethod = "z.object";

  /* Query schema */
  const querySchemaName = `${sanitizedId}QuerySchema`;
  const queryTypeName = `${sanitizedId}QuerySchema`;

  let querySchemaCode: string;
  if (parameterGroups.queryParams.length > 0) {
    const queryProps = parameterGroups.queryParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    querySchemaCode = `${objectMethod}({ ${queryProps} })`;
  } else {
    querySchemaCode = `${objectMethod}({})`;
  }

  /* Path schema */
  const pathSchemaName = `${sanitizedId}PathSchema`;
  const pathTypeName = `${sanitizedId}PathSchema`;

  let pathSchemaCode: string;
  if (parameterGroups.pathParams.length > 0) {
    const pathProps = parameterGroups.pathParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    pathSchemaCode = `${objectMethod}({ ${pathProps} })`;
  } else {
    pathSchemaCode = `${objectMethod}({})`;
  }

  /* Headers schema */
  const headersSchemaName = `${sanitizedId}HeadersSchema`;
  const headersTypeName = `${sanitizedId}HeadersSchema`;

  let headersSchemaCode: string;
  if (parameterGroups.headerParams.length > 0) {
    const headerProps = parameterGroups.headerParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    headersSchemaCode = `${headerObjectMethod}({ ${headerProps} })`;
  } else {
    headersSchemaCode = `${headerObjectMethod}({})`;
  }

  return {
    schemaCode: {
      headers: headersSchemaCode,
      path: pathSchemaCode,
      query: querySchemaCode,
    },
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
