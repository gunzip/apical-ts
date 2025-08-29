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
    const parseMethod =
      responseInfo.hasSchema && responseMapName
        ? `,
        parse: () =>
          parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], config.deserializerMap),`
        : "";

    return `    case ${statusCode}: {
${!responseInfo.hasSchema ? "      const data = undefined;" : ""}
      return { status: ${statusCode} as const, data, response${parseMethod} };
    }`;
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
): string[] {
  const handlers: string[] = [];

  for (const responseInfo of responses) {
    const handler = renderResponseHandler(responseInfo, responseMapName);
    handlers.push(handler);
  }

  return handlers;
}
