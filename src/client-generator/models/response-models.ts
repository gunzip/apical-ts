/* Response analysis data structures and models */

import type { OperationObject } from "openapi3-ts/oas31";

/*
 * Information about content type detection for a response
 */
export interface ContentTypeAnalysis {
  /* All content types available for this response */
  allContentTypes: string[];
  /* Whether any content type is JSON-like */
  hasJsonLike: boolean;
  /* Whether both JSON and non-JSON content types are present */
  hasMixedContentTypes: boolean;
  /* Whether any content type is non-JSON */
  hasNonJson: boolean;
}

/*
 * Represents the parsing strategy for a response
 */
export interface ParsingStrategy {
  /* Whether the response content type is JSON-like */
  isJsonLike: boolean;
  /* Whether mixed content types require runtime content type checking */
  requiresRuntimeContentTypeCheck: boolean;
  /* Whether the response should be validated with Zod */
  useValidation: boolean;
}

/*
 * Complete analysis of all responses for an operation
 */
export interface ResponseAnalysis {
  /* Default return type if no responses found */
  defaultReturnType: string;
  /* Discriminated union type definition */
  discriminatedUnionTypeDefinition?: string;
  /* Discriminated union type name (if generated) */
  discriminatedUnionTypeName?: string;
  /* Response map for parsing */
  responseMapName?: string;
  /* Response map type definition */
  responseMapType?: string;
  /* Array of individual response type information */
  responses: ResponseInfo[];
  /* Union type components for the return type */
  unionTypes: string[];
}

/*
 * Configuration for analyzing responses
 */
export interface ResponseAnalysisConfig {
  /* Whether the operation has a response content type map */
  hasResponseContentTypeMap?: boolean;
  /* Whether to use forced validation mode */
  forceValidation?: boolean;
  /* The operation being analyzed */
  operation: OperationObject;
  /* Set to collect type imports */
  typeImports: Set<string>;
}

/*
 * Information about a single response type for analysis
 */
export interface ResponseInfo {
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
}
