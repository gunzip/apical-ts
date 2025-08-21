import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";
import { getResponseContentType } from "./utils.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import type { ResponseHandlerResult } from "./types.js";

/**
 * Generates response handling code and determines return type using discriminated unions
 */
export function generateResponseHandlers(
  operation: OperationObject,
  typeImports: Set<string>
): ResponseHandlerResult {
  const responseHandlers: string[] = [];
  const unionTypes: string[] = [];

  if (operation.responses) {
    // Sort all response codes (both success and error)
    const responseCodes = Object.keys(operation.responses).filter(
      (code) => code !== "default"
    );
    responseCodes.sort((a, b) => parseInt(a) - parseInt(b));

    for (const code of responseCodes) {
      const response = operation.responses[code] as ResponseObject;
      const contentType = getResponseContentType(response);

      let typeName: string | null = null;
      let parseCode = "undefined";

      if (contentType && response.content?.[contentType]?.schema) {
        const schema = response.content[contentType].schema;

        if (schema["$ref"]) {
          // Use referenced schema
          const originalSchemaName = schema["$ref"].split("/").pop()!;
          typeName = sanitizeIdentifier(originalSchemaName);
          typeImports.add(typeName);

          if (contentType.includes("json")) {
            parseCode = `${typeName}.parse(await parseResponseBody(response))`;
          } else {
            parseCode = `await parseResponseBody(response) as ${typeName}`;
          }
        } else {
          // Use generated response schema for inline schemas
          const operationId = operation.operationId!;
          const sanitizedOperationId: string = sanitizeIdentifier(operationId);
          const responseTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${code}Response`;
          typeName = responseTypeName;
          typeImports.add(typeName);

          if (contentType.includes("json")) {
            parseCode = `${typeName}.parse(await parseResponseBody(response))`;
          } else {
            parseCode = `await parseResponseBody(response) as ${typeName}`;
          }
        }
      }

      // Build the discriminated union type
      const dataType = typeName || (contentType ? "unknown" : "void");
      unionTypes.push(`ApiResponse<${code}, ${dataType}>`);

      // Generate the response handler with status as const to help with discrimination
      if (typeName || contentType) {
        responseHandlers.push(`    case ${code}: {
      const data = ${parseCode};
      return { status: ${code} as const, data, response };
    }`);
      } else {
        responseHandlers.push(`    case ${code}:
      return { status: ${code} as const, data: undefined, response };`);
      }
    }
  }

  // Don't add a catch-all to the union type to ensure proper narrowing
  const returnType =
    unionTypes.length > 0
      ? unionTypes.join(" | ")
      : "ApiResponse<number, unknown>";

  return { returnType, responseHandlers };
}
