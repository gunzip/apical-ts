import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import type { ResponseInfo } from "./models/response-models.js";

import { analyzeResponseStructure } from "./response-analysis.js";
import {
  renderResponseHandlers,
  renderUnionType,
} from "./templates/response-templates.js";

/* Re-export shared content type map types and functions */
export type { ContentTypeMaps } from "@apical-ts/core-utils/shared";
export { generateContentTypeMaps } from "@apical-ts/core-utils/shared";

/**
 * Result of response handler generation
 */
export interface ResponseHandlerResult {
  defaultResponseInfo?: ResponseInfo;
  responseHeadersMapName?: string;
  responseHandlers: string[];
  responseMapName?: string;
  returnType: string;
}

/*
 * Generates response handling code and determines return type using discriminated unions.
 * Produces an array of switch-case handler segments and a union type of ApiResponse.
 */
export function generateResponseHandlers(
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap = false,
  responseMapName?: string,
  doc?: OpenAPIObject,
  responseHeadersMapName?: string,
): ResponseHandlerResult {
  /* Analyze the response structure */
  const analysis = analyzeResponseStructure({
    doc,
    hasResponseContentTypeMap,
    operation,
    responseHeadersMapName,
    responseMapName,
    typeImports,
  });

  /* Generate response handlers using templates */
  const responseHandlers = renderResponseHandlers(
    analysis.responses,
    responseMapName,
    responseHeadersMapName,
  );

  /* Generate return type using templates */
  const returnType = renderUnionType(
    analysis.unionTypes,
    analysis.defaultReturnType,
  );

  return {
    defaultResponseInfo: analysis.defaultResponseInfo,
    responseHeadersMapName,
    responseHandlers,
    responseMapName: responseMapName || analysis.responseMapName, // Use parameter or derived value
    returnType,
  };
}
