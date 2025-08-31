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
): string {
  const { contentType, statusCode, typeName } = responseInfo;

  if (typeName || contentType) {
    /* Use string-literal indexing for numeric HTTP status codes to preserve literal key types */
    if (responseInfo.hasSchema && responseMapName) {
      /* Always generate dynamic validation logic (forceValidation flag removed) */
      return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      if (config.forceValidation) {
        /* Force validation: automatically parse and return result */
        const parseResult = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializerMap ?? {});
        if ("parsed" in parseResult) {
          const forcedResult = { success: true as const, status: ${statusCode} as const, data, response, parsed: parseResult } satisfies ApiResponseWithForcedParse<${statusCode}, typeof ${responseMapName}>;
          // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
          return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<${statusCode}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCode}, typeof ${responseMapName}>);
        }
        if (parseResult.kind) {
          const errorResult = {
            ...parseResult,
            success: false as const,
            result: { data, status: ${statusCode}, response },
          } satisfies ApiResponseError;
          return errorResult;
        }
        throw new Error("Invalid parse result");
      } else {
        /* Manual validation: provide parse method */
        const manualResult = {
          success: true as const,
          status: ${statusCode} as const,
          data,
          response,
          parse: () => parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializerMap ?? {})
        } satisfies ApiResponseWithParse<${statusCode}, typeof ${responseMapName}>;
        return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<${statusCode}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCode}, typeof ${responseMapName}>);
      }
    }`;
    } else {
      /* No schema or response map: return simple response */
      return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
  return { success: true as const, status: ${statusCode} as const, data, response };
    }`;
    }
  }

  return `    case ${statusCode}:
  return { success: true as const, status: ${statusCode} as const, data: undefined, response };`;
}

/*
 * Renders the complete response handlers array as switch-case statements
 */
export function renderResponseHandlers(
  responses: ResponseInfo[],
  responseMapName?: string,
): string[] {
  const handlers: string[] = [];

  for (const responseInfo of responses) {
    const handler = renderResponseHandler(responseInfo, responseMapName);
    handlers.push(handler);
  }

  return handlers;
}
