/* Response-related template functions for TypeScript code generation */

import type { ResponseInfo } from "../models/response-models.js";

/* Import shared response union utilities */
export { renderUnionType } from "../../shared/response-union-generator.js";

/*
 * Renders a default response handler that handles OpenAPI default responses
 */
export function renderDefaultResponseHandler(
  defaultResponseInfo: ResponseInfo,
  responseMapName?: string,
): string {
  const { contentType, typeName } = defaultResponseInfo;

  if (typeName || contentType) {
    /* Use string-literal indexing for the default response */
    if (defaultResponseInfo.hasSchema && responseMapName) {
      /* Generate dynamic validation logic for default response */
      return `      if (${responseMapName}["default"]) {
        /* Handle OpenAPI default response with schema validation */
        if (config.forceValidation) {
          /* Force validation: automatically parse and return result */
          const parseResult = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["default"], config.deserializers ?? {});
          if ("parsed" in parseResult) {
            const forcedResult = createForcedParseResponse("default", data, response, parseResult);
            // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
            return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"default", typeof ${responseMapName}> : ApiResponseWithParse<"default", typeof ${responseMapName}>);
          }
          if (parseResult.kind) {
            const errorResult = {
              ...parseResult,
              isValid: false as const,
              result: { data, status: response.status, response },
            } satisfies ApiResponseError;
            return errorResult;
          }
          throw new Error("Invalid parse result");
        } else {
          /* Manual validation: provide parse method */
          const manualResult = {
            isValid: true as const,
            status: "default" as const,
            data,
            response,
            parse: () => parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["default"], config.deserializers ?? {})
          } satisfies ApiResponseWithParse<"default", typeof ${responseMapName}>;
          return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"default", typeof ${responseMapName}> : ApiResponseWithParse<"default", typeof ${responseMapName}>);
        }
      } else {
        /* Return error for unexpected status codes when no default response mapping exists */
        return {
          kind: "unexpected-response",
          isValid: false,
          result: {
            data,
            status: response.status,
            response,
          },
          error: \`Unexpected response status: \${response.status}\`,
        } as const;
      }`;
    } else {
      /* No schema or response map: return simple response for default */
      return `      /* Handle OpenAPI default response without schema */
      return { isValid: true as const, status: "default" as const, data, response };`;
    }
  }

  return `      /* Handle OpenAPI default response without content */
      return { isValid: true as const, status: "default" as const, data: undefined, response };`;
}

/*
 * Renders a single response handler condition for if-else logic
 */
export function renderResponseHandler(
  responseInfo: ResponseInfo,
  responseMapName?: string,
): string {
  const { contentType, statusCode, typeName } = responseInfo;

  // OpenAPI default responses are handled with a special case that excludes expected status codes
  // We'll generate them in a special way later in the function body template
  if (statusCode === "default") {
    return ""; // Default responses are handled separately
  }

  const condition = generateStatusMatchCondition(statusCode);

  if (typeName || contentType) {
    /* Use string-literal indexing for HTTP status codes to preserve literal key types */
    if (responseInfo.hasSchema && responseMapName) {
      /* Always generate dynamic validation logic (forceValidation flag removed) */
      return `    if (${condition}) {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      if (config.forceValidation) {
        /* Force validation: automatically parse and return result */
        const parseResult = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {});
        if ("parsed" in parseResult) {
          const forcedResult = createForcedParseResponse("${statusCode}", data, response, parseResult);
          // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
          return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"${statusCode}", typeof ${responseMapName}> : ApiResponseWithParse<"${statusCode}", typeof ${responseMapName}>);
        }
        if (parseResult.kind) {
          const errorResult = {
            ...parseResult,
            isValid: false as const,
            result: { data, status: "${statusCode}", response },
          } satisfies ApiResponseError;
          return errorResult;
        }
        throw new Error("Invalid parse result");
      } else {
        /* Manual validation: provide parse method */
        const manualResult = {
          isValid: true as const,
          status: "${statusCode}" as const,
          data,
          response,
          parse: () => parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {})
        } satisfies ApiResponseWithParse<"${statusCode}", typeof ${responseMapName}>;
        return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"${statusCode}", typeof ${responseMapName}> : ApiResponseWithParse<"${statusCode}", typeof ${responseMapName}>);
      }
    }`;
    } else {
      /* No schema or response map: return simple response */
      return `    if (${condition}) {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      return { isValid: true as const, status: "${statusCode}" as const, data, response };
    }`;
    }
  }

  return `    if (${condition}) {
      return { isValid: true as const, status: "${statusCode}" as const, data: undefined, response };
    }`;
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

/*
 * Helper function to generate status code matching logic
 */
function generateStatusMatchCondition(statusCode: string): string {
  if (statusCode === "default") {
    return "true"; // Default case is handled separately
  }

  // Check if it's a wildcard pattern (e.g., "4XX", "5XX")
  if (statusCode.includes("XX")) {
    const prefix = statusCode.substring(0, statusCode.indexOf("XX"));
    return `response.status >= ${prefix}00 && response.status < ${parseInt(prefix, 10) + 1}00`;
  }

  // Exact status code match
  return `response.status === ${statusCode}`;
}
