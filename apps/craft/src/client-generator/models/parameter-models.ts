import type { ParameterObject } from "openapi3-ts/oas31";

import type { RequestBodyTypeInfo } from "../request-body.js";
import type { SecurityHeader } from "../security.js";

/**
 * Analyzed parameter information for template generation
 */
export interface ParameterAnalysis {
  headerProperties: {
    isRequired: boolean;
    name: string;
    needsQuoting: boolean;
    varName: string;
  }[];
  optionalityRules: ParameterOptionalityRules;
  pathProperties: string[];
  queryProperties: { isRequired: boolean; name: string }[];
  securityHeaderProperties: {
    headerName: string;
    isRequired: boolean;
    varName: string;
  }[];
  structure: ParameterStructure;
}

/**
 * Grouped parameters by their location
 */
export interface ParameterGroups {
  headerParams: ParameterObject[];
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
}

/**
 * Configuration for parameter optionality rules
 */
export interface ParameterOptionalityRules {
  isBodyOptional: boolean;
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
}

/**
 * Parameter structure information for interface and destructuring generation
 */
export interface ParameterStructure {
  bodyTypeInfo?: RequestBodyTypeInfo;
  hasBody: boolean;
  hasRequestMap: boolean;
  hasResponseMap: boolean;
  processed: ProcessedParameterGroup;
  requestMapTypeName?: string;
  responseMapTypeName?: string;
}

/**
 * Processed parameter groups with security information
 */
export interface ProcessedParameterGroup {
  headerParams: ParameterObject[];
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  securityHeaders: SecurityHeader[];
}
