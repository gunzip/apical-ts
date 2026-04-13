/* Shared response union generation logic */

import type {
  OpenAPIObject,
  OperationObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { extractResponseContentTypes } from "./operation-utils.js";
import { resolveSchemaTypeName } from "./schema-type-resolver.js";

/**
 * Response union member for type generation
 */
export interface ResponseUnionMember {
  contentType?: string | undefined;
  dataType?: string | undefined;
  statusCode: string;
}

/**
 * Options for response union generation
 */
/**
 * Result of response union generation
 */
export interface ResponseUnionResult {
  typeImports: Set<string>;
  unionMembers: ResponseUnionMember[];
  unionTypeDefinition: string;
}

/**
 * Generates a complete response union type that includes ALL status codes from the operation,
 * even those without schemas (they get void/unknown data types).
 * This ensures consistency between client and server generators.
 */
export function generateResponseUnion(
  operation: OperationObject,
  operationId: string,
  typeImports: Set<string>,
  doc?: OpenAPIObject,
  resolvedSchemas?: Record<string, SchemaObject>,
): ResponseUnionResult {
  const unionMembers: ResponseUnionMember[] = [];
  const responseTypeName = `${sanitizeIdentifier(operationId)}Response`;

  if (!operation.responses) {
    /* Fallback for operations without responses */
    const fallbackMember: ResponseUnionMember = {
      statusCode: "200",
    };
    unionMembers.push(fallbackMember);
  } else {
    /* Get all status codes, including those without content */
    const allStatusCodes = Object.keys(operation.responses).filter(
      (code) => code !== "default",
    );
    allStatusCodes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    /* Extract responses that have content/schema */
    const responseContentTypes = extractResponseContentTypes(operation, doc);
    const statusCodesWithContent = new Set(
      responseContentTypes.map((r) => r.statusCode),
    );

    /* Collect all explicitly defined status codes (including wildcards) to exclude them from expansion */
    const explicitStatusCodes = new Set(allStatusCodes);

    /* Process all status codes, expanding wildcards */
    for (const statusCode of allStatusCodes) {
      /* Expand wildcard patterns and filter out explicitly defined codes */
      const expandedCodes = expandWildcardStatusCode(statusCode).filter(
        (code) =>
          /* Keep the code if it's not explicitly defined, or if it IS the current wildcard being expanded */
          code === statusCode || !explicitStatusCodes.has(code),
      );

      for (const expandedCode of expandedCodes) {
        if (statusCodesWithContent.has(statusCode)) {
          /* Status code has content/schema - add typed responses */
          const responseGroup = responseContentTypes.find(
            (r) => r.statusCode === statusCode,
          );
          if (responseGroup) {
            for (const mapping of responseGroup.contentTypes) {
              const dataType = resolveSchemaTypeName(
                mapping.schema,
                operationId,
                `${statusCode}Response`,
                typeImports,
                "response",
                resolvedSchemas,
              );
              unionMembers.push({
                contentType: mapping.contentType,
                dataType,
                statusCode: expandedCode,
              });
            }
          }
        } else {
          /* Status code has no content/schema - add void response */
          unionMembers.push({
            statusCode: expandedCode,
          });
        }
      }
    }
  }

  /* Generate the union type definition */
  const unionTypeDefinition = generateUnionTypeDefinition(
    responseTypeName,
    unionMembers,
  );

  return {
    typeImports,
    unionMembers,
    unionTypeDefinition,
  };
}

/**
 * Renders a TypeScript union type string from union type components
 * (kept for backward compatibility with existing templates)
 */
export function renderUnionType(
  unionTypes: string[],
  defaultType = "ApiResponse<string, unknown>",
): string {
  return unionTypes.length > 0 ? unionTypes.join(" | ") : defaultType;
}

/**
 * Expands wildcard status codes (e.g., "4XX", "4xx", "5XX", "5xx") into arrays of concrete status codes.
 * Returns the original code if it's not a wildcard pattern.
 *
 * @param statusCode - Status code which may be a wildcard pattern ("4XX", "4xx", "5XX", "5xx") or concrete code
 * @returns Array of concrete status codes
 */
function expandWildcardStatusCode(statusCode: string): string[] {
  const normalizedStatusCode = statusCode.toUpperCase();

  if (normalizedStatusCode === "4XX") {
    // Expand to all 4xx codes (400-451 covers all IANA-registered client error codes)
    return Array.from({ length: 52 }, (_, i) => String(400 + i));
  }
  if (normalizedStatusCode === "5XX") {
    // Expand to all 5xx codes (500-511 covers all IANA-registered server error codes)
    return Array.from({ length: 12 }, (_, i) => String(500 + i));
  }
  // Not a wildcard, return as-is
  return [statusCode];
}

/**
 * Generates the TypeScript union type definition from response members
 */
function generateUnionTypeDefinition(
  typeName: string,
  members: ResponseUnionMember[],
): string {
  if (members.length === 0) {
    return `export type ${typeName} = never;`;
  }

  const memberStrings = members.map(
    (member) =>
      `  | { status: "${member.statusCode}"; ${member.contentType ? `contentType: "${member.contentType}";` : ""} ${member.dataType ? `data: ${member.dataType};` : ""} }`,
  );

  return `export type ${typeName} =
${memberStrings.join("\n")};`;
}
