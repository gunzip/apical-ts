/* Shared parameter schema generation logic */

import type {
  ParameterObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import type { ParameterGroups } from "../client-generator/models/parameter-models.js";

import { zodSchemaToCode } from "../schema-generator/index.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";

/**
 * Options for parameter schema generation
 */
export interface ParameterSchemaGenerationOptions {
  strictValidation?: boolean;
}

/**
 * Result of parameter schema generation
 */
export interface ParameterSchemaResult {
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
 * Generates a single parameter schema for a specific parameter type
 */
export function generateParameterSchema(
  operationId: string,
  parameterType: "headers" | "path" | "query",
  parameters: ParameterObject[],
  options: ParameterSchemaGenerationOptions = {},
): {
  schemaCode: string;
  schemaName: string;
  typeImports: Set<string>;
  typeName: string;
} {
  const { strictValidation = false } = options;
  const sanitizedId = sanitizeIdentifier(operationId);
  const typeImports = new Set<string>();

  const paramTypeMap = {
    headers: "Headers",
    path: "Path",
    query: "Query",
  };

  const suffix = paramTypeMap[parameterType];
  const schemaName = `${sanitizedId}${suffix}Schema`;
  const typeName = `${sanitizedId}${suffix}`;

  /* Helper to build property entry using zodSchemaToCode; fallback to z.string() */
  const buildProp = (name: string, param: ParameterObject): string => {
    const schema = param.schema as ReferenceObject | SchemaObject | undefined;
    const isRequired = param.required === true;

    let zodCode: string;
    if (schema) {
      const result = zodSchemaToCode(schema, {
        imports: typeImports,
        strictValidation,
      });
      zodCode = result.code;
    } else {
      zodCode = "z.string()";
    }

    /* Make parameter optional if not explicitly required */
    if (!isRequired) {
      zodCode = `${zodCode}.optional()`;
    }

    return `"${name}": ${zodCode}`;
  };

  let schemaCode: string;
  if (parameters.length > 0) {
    const props = parameters.map((p) => buildProp(p.name, p)).join(", ");
    schemaCode = `const ${schemaName} = z.object({ ${props} });\ntype ${typeName} = z.infer<typeof ${schemaName}>;`;
  } else {
    schemaCode = `const ${schemaName} = z.object({});\ntype ${typeName} = z.infer<typeof ${schemaName}>;`;
  }

  return {
    schemaCode,
    schemaName,
    typeImports,
    typeName,
  };
}

/**
 * Generates Zod schemas for all parameter types (query, path, headers)
 */
export function generateParameterSchemas(
  operationId: string,
  parameterGroups: ParameterGroups,
  options: ParameterSchemaGenerationOptions = {},
): ParameterSchemaResult {
  const { strictValidation = false } = options;
  const sanitizedId = sanitizeIdentifier(operationId);
  const typeImports = new Set<string>();
  const schemas: string[] = [];

  /* Helper to build property entry using zodSchemaToCode; fallback to z.string() */
  const buildProp = (name: string, param: ParameterObject): string => {
    const schema = param.schema as ReferenceObject | SchemaObject | undefined;
    const isRequired = param.required === true;

    let zodCode: string;
    if (schema) {
      const result = zodSchemaToCode(schema, {
        imports: typeImports,
        strictValidation,
      });
      zodCode = result.code;
    } else {
      zodCode = "z.string()";
    }

    /* Make parameter optional if not explicitly required */
    if (!isRequired) {
      zodCode = `${zodCode}.optional()`;
    }

    return `"${name}": ${zodCode}`;
  };

  /* Query schema */
  const querySchemaName = `${sanitizedId}QuerySchema`;
  const queryTypeName = `${sanitizedId}Query`;

  if (parameterGroups.queryParams.length > 0) {
    const queryProps = parameterGroups.queryParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    schemas.push(`const ${querySchemaName} = z.object({ ${queryProps} });`);
  } else {
    schemas.push(`const ${querySchemaName} = z.object({});`);
  }
  schemas.push(`type ${queryTypeName} = z.infer<typeof ${querySchemaName}>;`);

  /* Path schema */
  const pathSchemaName = `${sanitizedId}PathSchema`;
  const pathTypeName = `${sanitizedId}Path`;

  if (parameterGroups.pathParams.length > 0) {
    const pathProps = parameterGroups.pathParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    schemas.push(`const ${pathSchemaName} = z.object({ ${pathProps} });`);
  } else {
    schemas.push(`const ${pathSchemaName} = z.object({});`);
  }
  schemas.push(`type ${pathTypeName} = z.infer<typeof ${pathSchemaName}>;`);

  /* Headers schema */
  const headersSchemaName = `${sanitizedId}HeadersSchema`;
  const headersTypeName = `${sanitizedId}Headers`;

  if (parameterGroups.headerParams.length > 0) {
    const headerProps = parameterGroups.headerParams
      .map((p) => buildProp(p.name, p))
      .join(", ");
    schemas.push(`const ${headersSchemaName} = z.object({ ${headerProps} });`);
  } else {
    schemas.push(`const ${headersSchemaName} = z.object({});`);
  }
  schemas.push(
    `type ${headersTypeName} = z.infer<typeof ${headersSchemaName}>;`,
  );

  return {
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
