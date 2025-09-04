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
  const statusCodeKey =
    statusCode === "default" ? `"${statusCode}"` : statusCode;

  /* For default responses, use the actual runtime status code; for specific responses, use the literal */
  const returnStatusCode =
    statusCode === "default" ? "response.status" : statusCodeKey;
  /* For default responses, don't use 'as const' since it's a runtime value */
  const statusConstModifier = statusCode === "default" ? "" : " as const";

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
          const forcedResult = { isValid: true as const, status: ${returnStatusCode}${statusConstModifier}, data, response, parsed: parseResult.parsed } satisfies ApiResponseWithForcedParse<${statusCode === "default" ? "number" : statusCodeKey}, typeof ${responseMapName}>;
          // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
          return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<${statusCode === "default" ? "number" : statusCodeKey}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCode === "default" ? "number" : statusCodeKey}, typeof ${responseMapName}>);
        }
        if (parseResult.kind) {
          const errorResult = {
            ...parseResult,
            isValid: false as const,
            result: { data, status: ${returnStatusCode}, response },
          } satisfies ApiResponseError;
          return errorResult;
        }
        throw new Error("Invalid parse result");
      } else {
        /* Manual validation: provide parse method */
        const manualResult = {
          isValid: true as const,
          status: ${returnStatusCode}${statusConstModifier},
          data,
          response,
          parse: () => parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializers ?? {})
        } satisfies ApiResponseWithParse<${statusCode === "default" ? "number" : statusCodeKey}, typeof ${responseMapName}>;
        return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<${statusCode === "default" ? "number" : statusCodeKey}, typeof ${responseMapName}> : ApiResponseWithParse<${statusCode === "default" ? "number" : statusCodeKey}, typeof ${responseMapName}>);
      }
    }`;
    } else {
      /* No schema or response map: return simple response */
      return `    case ${statusCodeKey}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
  return { isValid: true as const, status: ${returnStatusCode}${statusConstModifier}, data, response };
    }`;
    }
  }

  return `    case ${statusCodeKey}:
  return { isValid: true as const, status: ${returnStatusCode}${statusConstModifier}, data: undefined, response };`;
}

/*
 * Renders the complete response handlers array as switch-case statements
 */
export function renderResponseHandlers(
  responses: ResponseInfo[],
  responseMapName?: string,
): { caseHandlers: string[]; defaultHandler?: string } {
  const caseHandlers: string[] = [];
  let defaultHandler: string | undefined;

  for (const responseInfo of responses) {
    if (responseInfo.statusCode === "default") {
      /* Store default response handler separately - it will be used in the switch's default case */
      defaultHandler = renderDefaultResponseHandler(
        responseInfo,
        responseMapName,
      );
    } else {
      /* Generate normal case handlers for numeric status codes */
      const handler = renderResponseHandler(responseInfo, responseMapName);
      caseHandlers.push(handler);
    }
  }

  return { caseHandlers, defaultHandler };
}

/*
 * Renders a handler for default responses (used in switch default case)
 */
function renderDefaultResponseHandler(
  responseInfo: ResponseInfo,
  responseMapName?: string,
): string {
  const { contentType, typeName } = responseInfo;

  if (typeName || contentType) {
    /* Use string-literal indexing for numeric HTTP status codes to preserve literal key types */
    if (responseInfo.hasSchema && responseMapName) {
      /* Always generate dynamic validation logic (forceValidation flag removed) */
      return `      if (config.forceValidation) {
        /* Force validation: automatically parse and return result */
        const parseResult = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["default"], config.deserializers ?? {});
        if ("parsed" in parseResult) {
          const forcedResult = { isValid: true as const, status: response.status, data, response, parsed: parseResult.parsed } satisfies ApiResponseWithForcedParse<number, typeof ${responseMapName}>;
          // Need a bridge assertion to the conditional return type because generic TForceValidation isn't narrowed by runtime branch
          return forcedResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<number, typeof ${responseMapName}> : ApiResponseWithParse<number, typeof ${responseMapName}>);
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
          status: response.status,
          data,
          response,
          parse: () => parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["default"], config.deserializers ?? {})
        } satisfies ApiResponseWithParse<number, typeof ${responseMapName}>;
        return manualResult as unknown as (TForceValidation extends true ? ApiResponseWithForcedParse<number, typeof ${responseMapName}> : ApiResponseWithParse<number, typeof ${responseMapName}>);
      }`;
    } else {
      /* No schema or response map: return simple response */
      return `      return { isValid: true as const, status: response.status, data, response };`;
    }
  }

  return `      return { isValid: true as const, status: response.status, data: undefined, response };`;
}
