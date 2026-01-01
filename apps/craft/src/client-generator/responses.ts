import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31";

import type { ResponseInfo } from "./models/response-models.js";

import { analyzeResponseStructure } from "./response-analysis.js";
import {
  renderResponseHandlers,
  renderUnionType,
} from "./templates/response-templates.js";

/* Re-export shared content type map types and functions */
export type { ContentTypeMaps } from "../shared/content-type-maps.js";
export { generateContentTypeMaps } from "../shared/content-type-maps.js";

/**
 * Result of response handler generation
 */
export interface ResponseHandlerResult {
  defaultResponseInfo?: ResponseInfo;
  responseHandlers: string[];
  responseMapName?: string;
  returnType: string;
}

/**
 * Information about response types and handlers
 */
export interface ResponseTypeInfo {
  responseHandlers: string[];
  typeImports: Set<string>;
  typeName: null | string;
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
): ResponseHandlerResult {
  /* Analyze the response structure */
  const analysis = analyzeResponseStructure({
    doc,
    hasResponseContentTypeMap,
    operation,
    responseMapName,
    typeImports,
  });

  /* Generate response handlers using templates */
  const responseHandlers = renderResponseHandlers(
    analysis.responses,
    responseMapName,
  );

  /* Generate return type using templates */
  const returnType = renderUnionType(
    analysis.unionTypes,
    analysis.defaultReturnType,
  );

  return {
    defaultResponseInfo: analysis.defaultResponseInfo,
    responseHandlers,
    responseMapName: responseMapName || analysis.responseMapName, // Use parameter or derived value
    returnType,
  };
}
