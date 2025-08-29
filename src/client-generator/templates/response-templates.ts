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
    /* Add parse method if we have a schema and response map */
    /* If we have a response map, derive the per-operation deserializer map type name.
     * Convention: <OperationName>ResponseMap => <OperationName>DeserializerMap
     */
    const deserializerMapTypeName = responseMapName
      ? responseMapName.replace(/Map$/u, "DeserializerMap")
      : undefined;

    /* Use string-literal indexing for numeric HTTP status codes to preserve literal key types */
    if (forceValidation && responseInfo.hasSchema && responseMapName) {
      /* Force validation mode: automatically call parseApiResponseUnknownData */
      return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      const parsed = parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"]);
      return { status: ${statusCode} as const, data, response, parsed };
    }`;
    } else {
      /* Default mode: provide parse method for manual validation */
      const parseMethod =
        responseInfo.hasSchema && responseMapName
          ? `,
        parse: (deserializerMap?: ${deserializerMapTypeName}) =>
          parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], deserializerMap as import("./config.js").DeserializerMap),`
          : "";

      return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      return { status: ${statusCode} as const, data, response${parseMethod} };
    }`;
    }
  }

  return `    case ${statusCode}:
      return { status: ${statusCode} as const, data: undefined, response };`;
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
    const handler = renderResponseHandler(responseInfo, responseMapName, forceValidation);
    handlers.push(handler);
  }

  return handlers;
}
