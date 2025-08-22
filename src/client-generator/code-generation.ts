import type { ParameterObject } from "openapi3-ts/oas31";

import {
  generateHeaderParamHandling,
  generateQueryParamHandling,
  type ParameterGroups,
} from "./parameters.js";
import { generateRequestBodyHandling } from "./request-body.js";
import {
  generateSecurityHeaderHandling,
  type SecurityHeader,
} from "./security.js";
import { generatePathInterpolation } from "./utils.js";

/**
 * Generates the function body for an operation with explicit exhaustive handling
 *
 * NOTE: This function currently supports only a single content type per request.
 * Multiple content types in the same request body are not supported. The content
 * type is determined by the getRequestBodyContentType function which selects
 * one content type based on priority order.
 */
export function generateFunctionBody(
  pathKey: string,
  method: string,
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  responseHandlers: string[],
  requestContentType?: string,
  operationSecurityHeaders?: SecurityHeader[],
  overridesSecurity?: boolean,
  authHeaders?: string[],
): string {
  const { headerParams, pathParams, queryParams } = parameterGroups;

  const finalPath = generatePathInterpolation(pathKey, pathParams);
  const queryParamLines = generateQueryParamHandling(queryParams);
  const headerParamLines = generateHeaderParamHandling(headerParams);
  const securityHeaderLines =
    operationSecurityHeaders && operationSecurityHeaders.length > 0
      ? generateSecurityHeaderHandling(operationSecurityHeaders)
      : "";

  const { bodyContent, contentTypeHeader } = generateRequestBodyHandling(
    hasBody,
    requestContentType,
  );

  return `  const finalHeaders = {
    ${
      overridesSecurity && authHeaders && authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${contentTypeHeader}
  };
  ${headerParamLines ? `  ${headerParamLines}` : ""}${securityHeaderLines ? `  ${securityHeaderLines}` : ""}

  const url = new URL(\`${finalPath}\`, config.baseURL);
  ${queryParamLines ? `  ${queryParamLines}` : ""}

  const response = await config.fetch(url.toString(), {
    method: "${method.toUpperCase()}",
    headers: finalHeaders,${
      bodyContent
        ? `
${bodyContent}`
        : ""
    }
  });

  switch (response.status) {
${responseHandlers.join("\n")}
    default: {
      // Throw UnexpectedResponseError for undefined status codes
      const data = await parseResponseBody(response);
      throw new UnexpectedResponseError(response.status, data, response);
    }
  }`;
}
