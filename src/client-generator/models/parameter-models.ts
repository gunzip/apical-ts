import type { ParameterObject } from "openapi3-ts/oas31";

import type { RequestBodyTypeInfo } from "../request-body.js";
import type { SecurityHeader } from "../security.js";

/**
 * Grouped parameters by their location
 */
export type ParameterGroups = {
  headerParams: ParameterObject[];
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
};

/**
 * Processed parameter groups with security information
 */
export type ProcessedParameterGroup = {
  headerParams: ParameterObject[];
  isHeadersOptional: boolean;
  isQueryOptional: boolean;
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  securityHeaders: SecurityHeader[];
};

/**
 * Parameter structure information for interface and destructuring generation
 */
export type ParameterStructure = {
  processed: ProcessedParameterGroup;
  hasBody: boolean;
  bodyTypeInfo?: RequestBodyTypeInfo;
  hasRequestMap: boolean;
  hasResponseMap: boolean;
  requestMapTypeName?: string;
  responseMapTypeName?: string;
};

/**
 * Configuration for parameter optionality rules
 */
export type ParameterOptionalityRules = {
  isQueryOptional: boolean;
  isHeadersOptional: boolean;
  isBodyOptional: boolean;
};

/**
 * Analyzed parameter information for template generation
 */
export type ParameterAnalysis = {
  structure: ParameterStructure;
  optionalityRules: ParameterOptionalityRules;
  pathProperties: string[];
  queryProperties: Array<{ name: string; isRequired: boolean }>;
  headerProperties: Array<{
    name: string;
    isRequired: boolean;
    varName: string;
    needsQuoting: boolean;
  }>;
  securityHeaderProperties: Array<{
    headerName: string;
    isRequired: boolean;
    varName: string;
  }>;
};