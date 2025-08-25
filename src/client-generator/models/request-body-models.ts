/*
 * Data structures for request body analysis and code generation
 */

/* Result of content type analysis */
export type ContentTypeAnalysis = {
  availableTypes: string[];
  prioritizedTypes: string[];
  selectedType: string;
};

/* Configuration for content type handling */
export type ContentTypeHandlerConfig = Record<string, ContentTypeStrategy>;

/* Content type prioritization configuration */
export type ContentTypePriority = {
  fallbackType: string;
  preferredTypes: readonly string[];
};

/* Strategy for handling a specific content type */
export type ContentTypeStrategy = {
  bodyProcessing: string;
  contentTypeHeader: string;
  requiresFormData: boolean;
};

/* Template rendering context for request body handling */
export type RequestBodyRenderContext = {
  bodyContent: string;
  contentTypeHeader: string;
  hasBody: boolean;
  requestContentType: string | undefined;
};

/* Structure representing analyzed request body requirements */
export type RequestBodyStructure = {
  contentType: string;
  hasBody: boolean;
  isRequired: boolean;
  strategy: ContentTypeStrategy;
  typeInfo: null | RequestBodyTypeInfo;
};

/* Information about request body types */
export type RequestBodyTypeInfo = {
  contentType: string;
  isRequired: boolean;
  typeImports: Set<string>;
  typeName: null | string;
};
