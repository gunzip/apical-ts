/* Shared response union generation logic */

import type { OperationObject } from "openapi3-ts/oas31";

import { extractResponseContentTypes } from "../client-generator/operation-extractor.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import {
  resolveSchemaTypeName,
  resolveStrictSchemaTypeName,
} from "./schema-type-resolver.js";

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
export interface ResponseUnionOptions {
  /* Whether to use strict schemas (for server generation) */
  useStrictSchemas?: boolean;
}

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
  options: ResponseUnionOptions = {},
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
    const responseContentTypes = extractResponseContentTypes(operation);
    const statusCodesWithContent = new Set(
      responseContentTypes.map((r) => r.statusCode),
    );

    /* Process all status codes */
    for (const statusCode of allStatusCodes) {
      if (statusCodesWithContent.has(statusCode)) {
        /* Status code has content/schema - add typed responses */
        const responseGroup = responseContentTypes.find(
          (r) => r.statusCode === statusCode,
        );
        if (responseGroup) {
          for (const mapping of responseGroup.contentTypes) {
            const dataType = options.useStrictSchemas
              ? resolveStrictSchemaTypeName(
                  mapping.schema,
                  operationId,
                  `${statusCode}Response`,
                  typeImports,
                )
              : resolveSchemaTypeName(
                  mapping.schema,
                  operationId,
                  `${statusCode}Response`,
                  typeImports,
                );
            unionMembers.push({
              contentType: mapping.contentType,
              dataType,
              statusCode,
            });
          }
        }
      } else {
        /* Status code has no content/schema - add void response */
        unionMembers.push({
          statusCode,
        });
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
  defaultType = "ApiResponse<number, unknown>",
): string {
  return unionTypes.length > 0 ? unionTypes.join(" | ") : defaultType;
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
      `  | { status: ${member.statusCode}; ${member.contentType ? `contentType: "${member.contentType}";` : ""} ${member.dataType ? `data: ${member.dataType};` : ""} }`,
  );

  return `export type ${typeName} =
${memberStrings.join("\n")};`;
}
