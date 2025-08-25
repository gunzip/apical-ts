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
import { generatePathInterpolation } from "./utils.js";
import { renderContentTypeSwitch } from "./templates/content-type-templates.js";
import {
  determineFunctionBodyStructure,
  determineHeaderConfiguration,
  renderHeadersObject,
  renderFunctionBody,
} from "./templates/function-body-templates.js";

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

  // Determine what components are needed for the function body
  const structure = determineFunctionBodyStructure(
    contentTypeMaps,
    hasBody,
    requestContentTypes,
    shouldGenerateRequestMap,
    shouldGenerateResponseMap,
  );

  // Generate body content code if needed
  let bodyContentCode = "";
  if (shouldGenerateRequestMap && hasBody) {
    bodyContentCode = renderContentTypeSwitch(requestContentTypes || []);
  }

  // Determine header configuration and render headers object
  const headerConfig = determineHeaderConfiguration(
    shouldGenerateRequestMap,
    overridesSecurity,
    authHeaders,
    shouldGenerateResponseMap,
    structure.acceptHeaderLogic,
    structure.contentTypeHeaderCode,
  );
  const headersContent = renderHeadersObject(headerConfig);

  // Render the complete function body
  return renderFunctionBody(
    structure.contentTypeLogic,
    bodyContentCode,
    headersContent,
    finalPath,
    method,
    hasBody,
    responseHandlers,
    headerParamLines,
    securityHeaderLines,
    queryParamLines,
  );
}
