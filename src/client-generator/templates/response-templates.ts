/* Response-related template functions for TypeScript code generation */

import type { ResponseInfo } from "../models/response-models.js";

/* Import shared response union utilities */
export { renderUnionType } from "../../shared/response-union-generator.js";

/*
 * Renders a single response handler case for a switch statement
 */
export function renderResponseHandler(
  responseInfo: ResponseInfo,
  responseMapName?: string,
  forceValidation = false,
): string {
  const { contentType, statusCode, typeName } = responseInfo;

  if (typeName || contentType) {
    /* Use string-literal indexing for numeric HTTP status codes to preserve literal key types */
    if (forceValidation && responseInfo.hasSchema && responseMapName) {
      /* Force validation mode: automatically call parseApiResponseUnknownData with error handling */
      return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      const parseResult = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializerMap ?? {});
      if ("parsed" in parseResult) {
        return { success: true, status: ${statusCode} as const, data, response, parsed: parseResult };
      }
      /* Return error for parse failures in force validation mode */
      if ("parseError" in parseResult) {
        return {
          kind: "parse-error",
          success: false,
          result: {
            data,
            status: ${statusCode},
            response,
          },
          error: parseResult.parseError,
        } as const;
      }
      if ("deserializationError" in parseResult) {
        return {
          kind: "deserialization-error",
          success: false,
          result: {
            data,
            status: ${statusCode},
            response,
          },
          error: parseResult.deserializationError,
        } as const;
      }
      if ("missingSchema" in parseResult) {
        return {
          kind: "missing-schema",
          success: false,
          result: {
            data,
            status: ${statusCode},
            response,
          },
          error: \`No schema found for content-type: \${parseResult.contentType}\`,
        } as const;
      }
      /* This should never be reached due to TypeScript type checking */
      throw new Error("Invalid parse result");
    }`;
    } else {
      /* Default mode: provide parse method for manual validation with error handling */
      const parseMethod =
        responseInfo.hasSchema && responseMapName
          ? `,
        parse: () =>
          parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializerMap ?? {})`
          : "";

      return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      return { success: true, status: ${statusCode} as const, data, response${parseMethod} };
    }`;
    }
  }

  return `    case ${statusCode}:
      return { success: true, status: ${statusCode} as const, data: undefined, response };`;
}

/*
 * Renders the complete response handlers array as switch-case statements
 */
export function renderResponseHandlers(
  responses: ResponseInfo[],
  responseMapName?: string,
  forceValidation = false,
): string[] {
  const handlers: string[] = [];

  for (const responseInfo of responses) {
    const handler = renderResponseHandler(
      responseInfo,
      responseMapName,
      forceValidation,
    );
    handlers.push(handler);
  }

  return handlers;
}
