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
import type { ContentTypeMaps } from "./responses.js";

/**
 * Generates the function body for an operation with support for dynamic content types
 *
 * NOTE: This function now supports multiple content types per request/response.
 * The content types can be dynamically selected at runtime through the contentType parameter.
 */
export function generateFunctionBody(
  pathKey: string,
  method: string,
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  responseHandlers: string[],
  requestContentType: string | undefined,
  operationSecurityHeaders: SecurityHeader[] | undefined,
  overridesSecurity: boolean | undefined,
  authHeaders: string[] | undefined,
  contentTypeMaps: ContentTypeMaps,
  shouldGenerateRequestMap: boolean,
  shouldGenerateResponseMap: boolean,
): string {
  const { headerParams, pathParams, queryParams } = parameterGroups;

  const finalPath = generatePathInterpolation(pathKey, pathParams);
  const queryParamLines = generateQueryParamHandling(queryParams);
  const headerParamLines = generateHeaderParamHandling(headerParams);
  const securityHeaderLines =
    operationSecurityHeaders && operationSecurityHeaders.length > 0
      ? generateSecurityHeaderHandling(operationSecurityHeaders)
      : "";

  // Determine if we need dynamic content type handling
  const hasMultipleRequestTypes = shouldGenerateRequestMap && contentTypeMaps.requestContentTypeCount > 1;
  const hasMultipleResponseTypes = shouldGenerateResponseMap && contentTypeMaps.responseContentTypeCount > 1;

  // Generate content type determination logic
  let contentTypeLogic = "";
  let bodyContentCode = "";
  let acceptHeaderLogic = "";
  let contentTypeHeaderCode = "";

  if (shouldGenerateRequestMap) {
    const defaultReq = contentTypeMaps.defaultRequestContentType || "application/json";
    contentTypeLogic += `  const finalRequestContentType = contentType?.request || "${defaultReq}";\n`;
    
    if (hasBody) {
      // Generate switch statement for different body content types
      bodyContentCode = `  let bodyContent = "";
  let contentTypeHeader = {};
  
  switch (finalRequestContentType) {
    case "application/json":
      bodyContent = body ? JSON.stringify(body) : undefined;
      contentTypeHeader = { "Content-Type": "application/json" };
      break;
    case "application/x-www-form-urlencoded":
      bodyContent = body ? new URLSearchParams(body as Record<string, string>).toString() : undefined;
      contentTypeHeader = { "Content-Type": "application/x-www-form-urlencoded" };
      break;
    case "multipart/form-data":
      if (body) {
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value);
          }
        });
        bodyContent = formData;
      }
      contentTypeHeader = {}; // Don't set Content-Type for multipart/form-data
      break;
    case "text/plain":
      bodyContent = typeof body === 'string' ? body : String(body);
      contentTypeHeader = { "Content-Type": "text/plain" };
      break;
    case "application/xml":
      bodyContent = typeof body === 'string' ? body : String(body);
      contentTypeHeader = { "Content-Type": "application/xml" };
      break;
    case "application/octet-stream":
      bodyContent = body;
      contentTypeHeader = { "Content-Type": "application/octet-stream" };
      break;
    default:
      bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
      contentTypeHeader = { "Content-Type": finalRequestContentType };
  }`;
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
    const defaultResp = contentTypeMaps.defaultResponseContentType || "application/json";
    acceptHeaderLogic = `    "Accept": contentType?.response || "${defaultResp}",`;
  }

  // Build the headers object
  let headersContent = "";
  if (shouldGenerateRequestMap) {
    headersContent = `    ${
      overridesSecurity && authHeaders && authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${shouldGenerateResponseMap ? `
${acceptHeaderLogic}` : ""}
    ...contentTypeHeader,`;
  } else {
    headersContent = `    ${
      overridesSecurity && authHeaders && authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${shouldGenerateResponseMap ? `
${acceptHeaderLogic}` : ""}${contentTypeHeaderCode}`;
  }

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
