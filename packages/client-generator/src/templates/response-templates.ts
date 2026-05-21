/* Response-related template functions for TypeScript code generation */

import type { ResponseInfo } from "../models/response-models.js";

/* Import shared response union utilities */
export { renderUnionType } from "@apical-ts/core-utils/shared";

/*
 * Renders a default response handler that handles OpenAPI default responses
 */
export function renderDefaultResponseHandler(
  defaultResponseInfo: ResponseInfo,
  responseMapName?: string,
  responseHeadersMapName?: string,
): string {
  const { contentType, typeName } = defaultResponseInfo;
  const headersCode = renderHeadersHandling("default", responseHeadersMapName);
  const parseTypeHeaders = responseHeadersMapName
    ? `, typeof ${responseHeadersMapName}`
    : "";

  if (typeName || contentType) {
    /* Use string-literal indexing for the default response */
    if (defaultResponseInfo.hasSchema && responseMapName) {
      /* Generate dynamic validation logic for default response */
      return `      if (${responseMapName}["default"]) {
        /* Handle OpenAPI default response with schema validation */
        ${headersCode}
        if (config.forceValidation) {
          /* Force validation: automatically parse and return result */
          const parseResult = await parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["default"], config.deserializers ?? {});
          if ("parsed" in parseResult) {
            const forcedResult = createForcedParseResponse("default", data, response, headers, parseResult);
            // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
            return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"default", typeof ${responseMapName}${parseTypeHeaders}> : ApiResponseWithParse<"default", typeof ${responseMapName}${parseTypeHeaders}>);
          }
          if (parseResult.kind) {
            const errorResult = {
              ...parseResult,
              isValid: false as const,
              status: undefined,
              result: { data, status: response.status.toString(), response },
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
            headers,
            parse: async () => await parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["default"], config.deserializers ?? {})
          } satisfies ApiResponseWithParse<"default", typeof ${responseMapName}${parseTypeHeaders}>;
          return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"default", typeof ${responseMapName}${parseTypeHeaders}> : ApiResponseWithParse<"default", typeof ${responseMapName}${parseTypeHeaders}>);
        }
      } else {
        /* Return error for unexpected status codes when no default response mapping exists */
        return {
          kind: "unexpected-response",
          isValid: false,
          status: undefined,
          result: {
            data,
            status: response.status.toString(),
            response,
          },
          error: \`Unexpected response status: \${response.status}\`,
        } as const;
      }`;
    } else {
      /* No schema or response map: return simple response for default */
      return `      /* Handle OpenAPI default response without schema */
      ${headersCode}
      return { isValid: true as const, status: "default" as const, data, response, headers };`;
    }
  }

  return `      /* Handle OpenAPI default response without content */
      ${headersCode}
      return { isValid: true as const, status: "default" as const, data: undefined, response, headers };`;
}

/*
 * Renders a single response handler condition for if-else logic
 */
export function renderResponseHandler(
  responseInfo: ResponseInfo,
  responseMapName?: string,
  responseHeadersMapName?: string,
): string {
  const { contentType, statusCode, typeName } = responseInfo;

  // OpenAPI default responses are handled with a special case that excludes expected status codes
  // We'll generate them in a special way later in the function body template
  if (statusCode === "default") {
    return ""; // Default responses are handled separately
  }

  const condition = generateStatusMatchCondition(statusCode);
  const headersCode = renderHeadersHandling(statusCode, responseHeadersMapName);
  const parseTypeHeaders = responseHeadersMapName
    ? `, typeof ${responseHeadersMapName}`
    : "";

  if (typeName || contentType) {
    /* Use string-literal indexing for HTTP status codes to preserve literal key types */
    if (responseInfo.hasSchema && responseMapName) {
      /* Always generate dynamic validation logic (forceValidation flag removed) */
      return `    if (${condition}) {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
${headersCode}
      if (config.forceValidation) {
        /* Force validation: automatically parse and return result */
        const parseResult = await parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {});
        if ("parsed" in parseResult) {
         const forcedResult = createForcedParseResponse("${statusCode}", data, response, headers, parseResult);
         // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
         return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"${statusCode}", typeof ${responseMapName}${parseTypeHeaders}> : ApiResponseWithParse<"${statusCode}", typeof ${responseMapName}${parseTypeHeaders}>);
        }
        if (parseResult.kind) {
          const errorResult = {
            ...parseResult,
            isValid: false as const,
            status: undefined,
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
         headers,
         parse: async () => await parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {})
       } satisfies ApiResponseWithParse<"${statusCode}", typeof ${responseMapName}${parseTypeHeaders}>;
       return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<"${statusCode}", typeof ${responseMapName}${parseTypeHeaders}> : ApiResponseWithParse<"${statusCode}", typeof ${responseMapName}${parseTypeHeaders}>);
      }
    }`;
    } else {
      /* No schema or response map: return simple response */
      return `    if (${condition}) {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
${headersCode}
      return { isValid: true as const, status: "${statusCode}" as const, data, response, headers };
    }`;
    }
  }

  return `    if (${condition}) {
${headersCode}
      return { isValid: true as const, status: "${statusCode}" as const, data: undefined, response, headers };
    }`;
}

/*
 * Renders the complete response handlers array as switch-case statements
 */
export function renderResponseHandlers(
  responses: ResponseInfo[],
  responseMapName?: string,
  responseHeadersMapName?: string,
): string[] {
  const handlers: string[] = [];

  for (const responseInfo of responses) {
    const handler = renderResponseHandler(
      responseInfo,
      responseMapName,
      responseHeadersMapName,
    );
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

  // Check if it's a wildcard pattern (e.g., "4XX", "4xx", "5XX", "5xx")
  if (/^\dXX$/iu.test(statusCode)) {
    const prefix = parseInt(statusCode[0], 10);
    return `response.status >= ${prefix}00 && response.status < ${prefix + 1}00`;
  }

  // Exact status code match
  return `response.status === ${statusCode}`;
}

function renderHeadersHandling(
  statusCode: string,
  responseHeadersMapName?: string,
): string {
  if (!responseHeadersMapName) {
    return "      const headers = undefined;";
  }

  return `      const headersResult = await parseApiResponseHeaders(
        response,
        getResponseHeaderSchema(${responseHeadersMapName}, "${statusCode}")
      );
      if (!headersResult.success) {
        return {
          kind: "parse-error",
          isValid: false,
          status: undefined,
          result: {
            data,
            status: response.status.toString(),
            response,
          },
          error: headersResult.error,
        } as const;
      }
      const headers = headersResult.value;`;
}
