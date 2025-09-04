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
  const statusCodeKey = statusCode === "default" ? `"${statusCode}"` : statusCode;

  if (typeName || contentType) {
    /* Use string-literal indexing for numeric HTTP status codes to preserve literal key types */
    if (responseInfo.hasSchema && responseMapName) {
      /* Always generate dynamic validation logic (forceValidation flag removed) */
      return `    case ${statusCodeKey}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      if (config.forceValidation) {
        /* Force validation: automatically parse and return result */
        const parseResult = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {});
        if ("parsed" in parseResult) {
          const forcedResult = { isValid: true as const, status: ${statusCodeKey} as const, data, response, parsed: parseResult.parsed } satisfies ApiResponseWithForcedParse<${statusCodeKey}, typeof ${responseMapName}>;
          // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
          return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<${statusCodeKey}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCodeKey}, typeof ${responseMapName}>);
        }
        if (parseResult.kind) {
          const errorResult = {
            ...parseResult,
            isValid: false as const,
            result: { data, status: ${statusCodeKey}, response },
          } satisfies ApiResponseError;
          return errorResult;
        }
        throw new Error("Invalid parse result");
      } else {
        /* Manual validation: provide parse method */
        const manualResult = {
          isValid: true as const,
          status: ${statusCodeKey} as const,
          data,
          response,
          parse: () => parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {})
        } satisfies ApiResponseWithParse<${statusCodeKey}, typeof ${responseMapName}>;
        return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<${statusCodeKey}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCodeKey}, typeof ${responseMapName}>);
      }
    }`;
    } else {
      /* No schema or response map: return simple response */
      return `    case ${statusCodeKey}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
  return { isValid: true as const, status: ${statusCodeKey} as const, data, response };
    }`;
    }
  }

  return `    case ${statusCodeKey}:
  return { isValid: true as const, status: ${statusCodeKey} as const, data: undefined, response };`;
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
