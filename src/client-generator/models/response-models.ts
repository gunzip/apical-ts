/* Response analysis data structures and models */

import type { OperationObject } from "openapi3-ts/oas31";

/*
 * Information about content type detection for a response
 */
export type ContentTypeAnalysis = {
  /* All content types available for this response */
  allContentTypes: string[];
  /* Whether any content type is JSON-like */
  hasJsonLike: boolean;
  /* Whether both JSON and non-JSON content types are present */
  hasMixedContentTypes: boolean;
  /* Whether any content type is non-JSON */
  hasNonJson: boolean;
};

/*
 * Represents the parsing strategy for a response
 */
export type ParsingStrategy = {
  /* Whether the response content type is JSON-like */
  isJsonLike: boolean;
  /* Whether mixed content types require runtime content type checking */
  requiresRuntimeContentTypeCheck: boolean;
  /* Whether the response should be validated with Zod */
  useValidation: boolean;
};

/*
 * Complete analysis of all responses for an operation
 */
export type ResponseAnalysis = {
  /* Default return type if no responses found */
  defaultReturnType: string;
  /* Array of individual response type information */
  responses: ResponseInfo[];
  /* Union type components for the return type */
  unionTypes: string[];
};

/*
 * Configuration for analyzing responses
 */
export type ResponseAnalysisConfig = {
  /* Whether the operation has a response content type map */
  hasResponseContentTypeMap?: boolean;
  /* The operation being analyzed */
  operation: OperationObject;
  /* Set to collect type imports */
  typeImports: Set<string>;
};

/*
 * Information about a single response type for analysis
 */
export type ResponseInfo = {
  /* Content type for this response */
  contentType: null | string;
  /* Whether this response has schema content */
  hasSchema: boolean;
  /* Parsing strategy for this response */
  parsingStrategy: ParsingStrategy;
  /* HTTP status code */
  statusCode: string;
  /* TypeScript type name for the response */
  typeName: null | string;
};
