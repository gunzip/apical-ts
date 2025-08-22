import type { ContentTypeMaps } from "./responses.js";

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
 * Options accepted by generateFunctionBody (collapsed from the previous long positional argument list).
 */
export type GenerateFunctionBodyOptions = {
  authHeaders?: string[];
  contentTypeMaps: ContentTypeMaps;
  hasBody: boolean;
  method: string;
  operationSecurityHeaders?: SecurityHeader[];
  overridesSecurity?: boolean;
  parameterGroups: ParameterGroups;
  pathKey: string;
  requestContentType?: string;
  requestContentTypes?: string[];
  responseHandlers: string[];
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
};

/**
 * Generates the function body for an operation with support for dynamic content types.
 *
 * NOTE: Supports multiple content types per request/response. The content types can be
 * dynamically selected at runtime through the contentType parameter.
 */
export function generateFunctionBody({
  authHeaders,
  contentTypeMaps,
  hasBody,
  method,
  operationSecurityHeaders,
  overridesSecurity,
  parameterGroups,
  pathKey,
  requestContentType,
  requestContentTypes,
  responseHandlers,
  shouldGenerateRequestMap,
  shouldGenerateResponseMap,
}: GenerateFunctionBodyOptions): string {
  const { headerParams, pathParams, queryParams } = parameterGroups;

  const finalPath = generatePathInterpolation(pathKey, pathParams);
  const queryParamLines = generateQueryParamHandling(queryParams);
  const headerParamLines = generateHeaderParamHandling(headerParams);
  const securityHeaderLines =
    operationSecurityHeaders && operationSecurityHeaders.length > 0
      ? generateSecurityHeaderHandling(operationSecurityHeaders)
      : "";

  // These variables are no longer needed as we always generate type maps

  // Generate content type determination logic
  let contentTypeLogic = "";
  let bodyContentCode = "";
  let acceptHeaderLogic = "";
  let contentTypeHeaderCode = "";

  if (shouldGenerateRequestMap) {
    const defaultReq =
      contentTypeMaps.defaultRequestContentType || "application/json";
    contentTypeLogic += `  const finalRequestContentType = contentType?.request || "${defaultReq}";\n`;

    if (hasBody) {
      bodyContentCode = generateDynamicBodyContentCode(
        requestContentTypes || [],
      );
    }
  } else {
    // Use static content type handling (backward compatibility)
    if (hasBody) {
      const { bodyContent, contentTypeHeader } = generateRequestBodyHandling(
        hasBody,
        requestContentType,
      );
      bodyContentCode = `  // Static body content
  const bodyContent = ${bodyContent || "undefined"};`;
      if (contentTypeHeader) {
        contentTypeHeaderCode = contentTypeHeader;
      }
    }
  }

  if (shouldGenerateResponseMap) {
    const defaultResp =
      contentTypeMaps.defaultResponseContentType || "application/json";
    acceptHeaderLogic = `    "Accept": contentType?.response || "${defaultResp}",`;
  }

  // Build the headers object
  const headersContent = generateHeadersContent(
    shouldGenerateRequestMap,
    overridesSecurity,
    authHeaders,
    shouldGenerateResponseMap,
    acceptHeaderLogic,
    contentTypeHeaderCode,
  );

  return `${contentTypeLogic}${bodyContentCode}

  const finalHeaders = {
${headersContent}
  };
  ${headerParamLines ? `  ${headerParamLines}` : ""}${securityHeaderLines ? `  ${securityHeaderLines}` : ""}

  const url = new URL(\`${finalPath}\`, config.baseURL);
  ${queryParamLines ? `  ${queryParamLines}` : ""}

  const response = await config.fetch(url.toString(), {
    method: "${method.toUpperCase()}",
    headers: finalHeaders,${
      hasBody
        ? `
    body: bodyContent,`
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

/**
 * Generates dynamic body content handling code for multiple content types
 */
/**
 * Generates dynamic body content handling code for multiple content types
 */
function generateDynamicBodyContentCode(requestContentTypes: string[]): string {
  // Map of content type to handler function
  const contentTypeHandlers: Record<string, string> = {
    "application/json": `      bodyContent = body ? JSON.stringify(body) : undefined;
      contentTypeHeader = { "Content-Type": "application/json" };`,
    "application/octet-stream": `      bodyContent = body;
      contentTypeHeader = { "Content-Type": "application/octet-stream" };`,
    "application/x-www-form-urlencoded": `      bodyContent = body ? new URLSearchParams(body as Record<string, string>).toString() : undefined;
      contentTypeHeader = { "Content-Type": "application/x-www-form-urlencoded" };`,
    "application/xml": `      bodyContent = typeof body === 'string' ? body : String(body);
      contentTypeHeader = { "Content-Type": "application/xml" };`,
    "multipart/form-data": `      if (body) {
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value);
          }
        });
        bodyContent = formData;
      }
      contentTypeHeader = {}; // Don't set Content-Type for multipart/form-data`,
    "text/plain": `      bodyContent = typeof body === 'string' ? body : String(body);
      contentTypeHeader = { "Content-Type": "text/plain" };`,
  };

  // Generate switch cases only for the defined content types
  const switchCases = requestContentTypes
    .map((contentType) => {
      const handler = contentTypeHandlers[contentType];
      if (handler) {
        return `    case "${contentType}":
${handler}
      break;`;
      } else {
        // For content types we don't have specific handlers for, use generic approach
        return `    case "${contentType}":
      bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
      contentTypeHeader = { "Content-Type": "${contentType}" };
      break;`;
      }
    })
    .join("\n");

  // Add default case for any content type not explicitly handled
  const defaultCase = `    default:
      bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
      contentTypeHeader = { "Content-Type": finalRequestContentType };`;

  return `  let bodyContent: string | FormData | undefined = "";
  let contentTypeHeader = {};
  
  switch (finalRequestContentType) {
${switchCases}
${defaultCase}
  }`;
}

/**
 * Generates the headers content for the request
 */
function generateHeadersContent(
  shouldGenerateRequestMap: boolean,
  overridesSecurity: boolean | undefined,
  authHeaders: string[] | undefined,
  shouldGenerateResponseMap: boolean,
  acceptHeaderLogic: string,
  contentTypeHeaderCode: string,
): string {
  if (shouldGenerateRequestMap) {
    return `    ${
      overridesSecurity && authHeaders && authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${
      shouldGenerateResponseMap
        ? `
${acceptHeaderLogic}`
        : ""
    }
    ...contentTypeHeader,`;
  } else {
    return `    ${
      overridesSecurity && authHeaders && authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${
      shouldGenerateResponseMap
        ? `
${acceptHeaderLogic}`
        : ""
    }${contentTypeHeaderCode}`;
  }
}
