import type { RequestBodyObject } from "openapi3-ts/oas31";

/*
 * Data structures for request body analysis and code generation
 */

/* Information about request body types */
export type RequestBodyTypeInfo = {
  contentType: string;
  isRequired: boolean;
  typeImports: Set<string>;
  typeName: null | string;
};

/* Strategy for handling a specific content type */
export type ContentTypeStrategy = {
  bodyProcessing: string;
  contentTypeHeader: string;
  requiresFormData: boolean;
};

/* Configuration for content type handling */
export type ContentTypeHandlerConfig = {
  [contentType: string]: ContentTypeStrategy;
};

/* Structure representing analyzed request body requirements */
export type RequestBodyStructure = {
  contentType: string;
  hasBody: boolean;
  isRequired: boolean;
  strategy: ContentTypeStrategy;
  typeInfo: RequestBodyTypeInfo | null;
};

/* Content type prioritization configuration */
export type ContentTypePriority = {
  preferredTypes: readonly string[];
  fallbackType: string;
};

/* Result of content type analysis */
export type ContentTypeAnalysis = {
  availableTypes: string[];
  prioritizedTypes: string[];
  selectedType: string;
};

/* Template rendering context for request body handling */
export type RequestBodyRenderContext = {
  bodyContent: string;
  contentTypeHeader: string;
  hasBody: boolean;
  requestContentType: string | undefined;
};
