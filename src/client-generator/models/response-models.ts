/* Response analysis data structures and models */

import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

/*
 * Represents the parsing strategy for a response
 */
export type ParsingStrategy = {
  /* Whether the response should be validated with Zod */
  useValidation: boolean;
  /* Whether the response content type is JSON-like */
  isJsonLike: boolean;
  /* Whether mixed content types require runtime content type checking */
  requiresRuntimeContentTypeCheck: boolean;
};

/*
 * Information about a single response type for analysis
 */
export type ResponseInfo = {
  /* HTTP status code */
  statusCode: string;
  /* TypeScript type name for the response */
  typeName: string | null;
  /* Content type for this response */
  contentType: string | null;
  /* Parsing strategy for this response */
  parsingStrategy: ParsingStrategy;
  /* Whether this response has schema content */
  hasSchema: boolean;
};

/*
 * Complete analysis of all responses for an operation
 */
export type ResponseAnalysis = {
  /* Array of individual response type information */
  responses: ResponseInfo[];
  /* Union type components for the return type */
  unionTypes: string[];
  /* Default return type if no responses found */
  defaultReturnType: string;
};

/*
 * Configuration for analyzing responses
 */
export type ResponseAnalysisConfig = {
  /* The operation being analyzed */
  operation: OperationObject;
  /* Set to collect type imports */
  typeImports: Set<string>;
  /* Whether the operation has a response content type map */
  hasResponseContentTypeMap?: boolean;
};

/*
 * Information about content type detection for a response
 */
export type ContentTypeAnalysis = {
  /* All content types available for this response */
  allContentTypes: string[];
  /* Whether any content type is JSON-like */
  hasJsonLike: boolean;
  /* Whether any content type is non-JSON */
  hasNonJson: boolean;
  /* Whether both JSON and non-JSON content types are present */
  hasMixedContentTypes: boolean;
};