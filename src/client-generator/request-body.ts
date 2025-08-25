import type { RequestBodyObject } from "openapi3-ts/oas31";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import type {
  ContentTypeAnalysis,
  ContentTypePriority,
  RequestBodyStructure,
  RequestBodyTypeInfo,
} from "./models/request-body-models.js";
import {
  DEFAULT_CONTENT_TYPE_HANDLERS,
  renderLegacyRequestBodyHandling,
} from "./templates/request-body-templates.js";

/* Re-export RequestBodyTypeInfo for backward compatibility */
export type { RequestBodyTypeInfo } from "./models/request-body-models.js";

/*
 * Pure logic functions for request body analysis
 */

/* Default content type prioritization configuration */
const DEFAULT_CONTENT_TYPE_PRIORITY: ContentTypePriority = {
  preferredTypes: [
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
    "application/xml",
    "application/octet-stream",
  ],
  fallbackType: "application/json",
};

/*
 * Orders content types by preference based on priority configuration
 */
export function prioritizeContentTypes(
  availableTypes: string[],
  priority: ContentTypePriority = DEFAULT_CONTENT_TYPE_PRIORITY,
): ContentTypeAnalysis {
  const prioritizedTypes: string[] = [];

  /* Add preferred types in order if they are available */
  for (const preferredType of priority.preferredTypes) {
    if (availableTypes.includes(preferredType)) {
      prioritizedTypes.push(preferredType);
    }
  }

  /* Add any remaining types that weren't in the preferred list */
  for (const availableType of availableTypes) {
    if (!prioritizedTypes.includes(availableType)) {
      prioritizedTypes.push(availableType);
    }
  }

  const selectedType = prioritizedTypes[0] || priority.fallbackType;

  return {
    availableTypes,
    prioritizedTypes,
    selectedType,
  };
}

/*
 * Selects appropriate content type handling strategy
 */
export function determineContentTypeStrategy(contentType: string) {
  return (
    DEFAULT_CONTENT_TYPE_HANDLERS[contentType] || {
      bodyProcessing: "typeof body === 'string' ? body : JSON.stringify(body)",
      contentTypeHeader: `"Content-Type": "${contentType}"`,
      requiresFormData: false,
    }
  );
}

/*
 * Determines request body structure and requirements from OpenAPI spec
 */
export function determineRequestBodyStructure(
  requestBody: RequestBodyObject | undefined,
  operationId: string,
): RequestBodyStructure {
  const hasBody = !!requestBody;

  if (!hasBody || !requestBody) {
    return {
      contentType: "application/json",
      hasBody: false,
      isRequired: false,
      strategy: determineContentTypeStrategy("application/json"),
      typeInfo: null,
    };
  }

  const isRequired = requestBody.required === true;
  const contentType = getRequestBodyContentType(requestBody);
  const strategy = determineContentTypeStrategy(contentType);
  const typeInfo = resolveRequestBodyType(requestBody, operationId);

  return {
    contentType,
    hasBody,
    isRequired,
    strategy,
    typeInfo,
  };
}

/**
 * Generates request body handling code for different content types
 */
export function generateRequestBodyHandling(
  hasBody: boolean,
  requestContentType?: string,
): { bodyContent: string; contentTypeHeader: string } {
  return renderLegacyRequestBodyHandling({
    bodyContent: "",
    contentTypeHeader: "",
    hasBody,
    requestContentType,
  });
}

/*
 * Extracts the request body content type from the OpenAPI spec
 *
 * NOTE: Currently, we only support a single content type per request body.
 * If multiple content types are specified in the OpenAPI spec, we select
 * one based on priority order. This is a known limitation.
 */
export function getRequestBodyContentType(
  requestBody: RequestBodyObject,
): string {
  if (!requestBody.content) {
    return DEFAULT_CONTENT_TYPE_PRIORITY.fallbackType;
  }

  const availableTypes = Object.keys(requestBody.content);
  const analysis = prioritizeContentTypes(availableTypes);
  return analysis.selectedType;
}

/**
 * Resolves request body schema and extracts type information
 */
export function resolveRequestBodyType(
  requestBody: RequestBodyObject,
  operationId: string,
): RequestBodyTypeInfo {
  // Check if request body is required (default is false)
  const isRequired = requestBody.required === true;
  const contentType = getRequestBodyContentType(requestBody);

  // Look for the determined content type
  const content = requestBody.content?.[contentType];
  if (!content?.schema) {
    return {
      contentType,
      isRequired,
      typeImports: new Set<string>(),
      typeName: null,
    };
  }

  const schema = content.schema;

  // If it's a reference to a schema, use that as the type name
  if (schema["$ref"]) {
    const originalTypeName = schema["$ref"].split("/").pop();
    const typeName = originalTypeName
      ? sanitizeIdentifier(originalTypeName)
      : null;
    return {
      contentType,
      isRequired,
      typeImports: new Set([typeName || ""]),
      typeName: typeName || null,
    };
  }

  // For inline schemas, use the pre-generated request schema
  // The request schema will be generated as {operationId}Request in the main generator
  const sanitizedOperationId: string = sanitizeIdentifier(operationId);
  const requestTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}Request`;
  return {
    contentType,
    isRequired,
    typeImports: new Set([requestTypeName]),
    typeName: requestTypeName,
  };
}
