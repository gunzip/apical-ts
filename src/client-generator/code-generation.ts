import type { ContentTypeMaps } from "./responses.js";

import {
  generateHeaderParamHandling,
  generateQueryParamHandling,
  type ParameterGroups,
} from "./parameters.js";
import {
  generateSecurityHeaderHandling,
  type SecurityHeader,
} from "./security.js";
import { renderDynamicBodyHandling } from "./templates/request-body-templates.js";
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

  // Generate content type determination logic
  let contentTypeLogic = "";
  let bodyContentCode = "";
  let acceptHeaderLogic = "";
  const contentTypeHeaderCode = "";

  if (shouldGenerateRequestMap) {
    const defaultReq =
      contentTypeMaps.defaultRequestContentType || "application/json";
    contentTypeLogic += `  const finalRequestContentType = contentType?.request || "${defaultReq}";\n`;

    if (hasBody) {
      bodyContentCode = generateDynamicBodyContentCode(
        requestContentTypes || [],
      );
    }
  }

  if (shouldGenerateResponseMap) {
    const defaultRespValue =
      contentTypeMaps.defaultResponseContentType || "application/json";
    acceptHeaderLogic = `    "Accept": contentType?.response || "${defaultRespValue}",`;
    contentTypeLogic += `  const finalResponseContentType = contentType?.response || "${defaultRespValue}";\n`;
  } else {
    contentTypeLogic += `  const finalResponseContentType = "";\n`;
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

  const finalHeaders: Record<string, string> = {
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

/*
 * Generates dynamic body content handling code for multiple content types
 * Uses the centralized template system for consistency
 */
function generateDynamicBodyContentCode(requestContentTypes: string[]): string {
  return renderDynamicBodyHandling(requestContentTypes);
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
