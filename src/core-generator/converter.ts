import type { OpenAPIObject as OpenAPIV3Document } from "openapi3-ts/oas30";
import type {
  ComponentsObject as V3ComponentsObject,
  MediaTypeObject as V3MediaTypeObject,
  OperationObject as V3OperationObject,
  ParameterObject as V3ParameterObject,
  PathItemObject as V3PathItemObject,
  ReferenceObject as V3ReferenceObject,
  RequestBodyObject as V3RequestBodyObject,
  ResponseObject as V3ResponseObject,
  SchemaObject as V3SchemaObject,
} from "openapi3-ts/oas30";
import type { OpenAPIObject as OpenAPIV3_1Document } from "openapi3-ts/oas31";
import type {
  MediaTypeObject as V31MediaTypeObject,
  OperationObject as V31OperationObject,
  ParameterObject as V31ParameterObject,
  PathItemObject as V31PathItemObject,
  ReferenceObject as V31ReferenceObject,
  RequestBodyObject as V31RequestBodyObject,
  ResponseObject as V31ResponseObject,
  SchemaObject as V31SchemaObject,
} from "openapi3-ts/oas31";

import { isReferenceObject as isV3ReferenceObject } from "openapi3-ts/oas30";
import { convertObj } from "swagger2openapi";

/**
 * Converts an OpenAPI 2.0 (Swagger) specification to OpenAPI 3.0 format
 */
export async function convertOpenAPI20to30(
  swagger20: any,
): Promise<OpenAPIV3Document> {
  try {
    const result = await convertObj(swagger20, {
      patch: true,
      resolve: true,
      source: "input.yaml",
      warnOnly: true,
    });
    return result.openapi as OpenAPIV3Document;
  } catch (error) {
    throw new Error(
      `Failed to convert OpenAPI 2.0 to 3.0: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Converts an OpenAPI 3.0.x specification to OpenAPI 3.1.0 format
 */
export function convertOpenAPI30to31(
  openapi30: OpenAPIV3Document,
): OpenAPIV3_1Document {
  const converted = JSON.parse(
    JSON.stringify(openapi30),
  ) as OpenAPIV3_1Document;

  // Update version
  converted.openapi = "3.1.0";

  // Convert components schemas
  if (openapi30.components?.schemas) {
    const convertedSchemas: Record<
      string,
      V31ReferenceObject | V31SchemaObject
    > = {};
    for (const [schemaName, schema] of Object.entries(
      openapi30.components.schemas,
    )) {
      convertedSchemas[schemaName] = convertSchema(schema);
    }
    if (converted.components) {
      converted.components.schemas = convertedSchemas;
    }
  }

  // Convert path schemas (request/response bodies, parameters)
  const convertedPaths: Record<string, V31PathItemObject> = {};
  for (const [pathName, pathItem] of Object.entries(openapi30.paths)) {
    convertedPaths[pathName] = convertPathItem(pathItem);
  }
  converted.paths = convertedPaths;

  return converted;
}

/**
 * Converts an OpenAPI specification to 3.1 format, handling both 2.0 and 3.0 inputs
 */
export async function convertToOpenAPI31(
  openapi: any,
): Promise<OpenAPIV3_1Document> {
  // If it's already 3.1, return as-is
  if (isOpenAPI31(openapi)) {
    return openapi as OpenAPIV3_1Document;
  }

  // If it's 2.0, first convert to 3.0, then to 3.1
  if (isOpenAPI20(openapi)) {
    const openapi30 = await convertOpenAPI20to30(openapi);
    return convertOpenAPI30to31(openapi30);
  }

  // If it's 3.0, convert directly to 3.1
  if (isOpenAPI30(openapi)) {
    return convertOpenAPI30to31(openapi as OpenAPIV3Document);
  }

  throw new Error(
    `Unsupported OpenAPI version: ${openapi.openapi || openapi.swagger || "unknown"}`,
  );
}

/**
 * Checks if an OpenAPI document is version 2.0 (Swagger)
 */
export function isOpenAPI20(openapi: any): boolean {
  return (
    typeof openapi.swagger === "string" && openapi.swagger.startsWith("2.0")
  );
}

/**
 * Checks if an OpenAPI document is version 3.0.x
 */
export function isOpenAPI30(openapi: any): boolean {
  return (
    typeof openapi.openapi === "string" && openapi.openapi.startsWith("3.0")
  );
}

/**
 * Checks if an OpenAPI document is version 3.1.x
 */
export function isOpenAPI31(openapi: any): boolean {
  return (
    typeof openapi.openapi === "string" && openapi.openapi.startsWith("3.1")
  );
}

/**
 * Converts a media type object from 3.0 to 3.1 format
 */
function convertMediaType(
  mediaTypeObject: V3MediaTypeObject,
): V31MediaTypeObject {
  if (!mediaTypeObject || typeof mediaTypeObject !== "object") {
    return mediaTypeObject as V31MediaTypeObject;
  }

  const converted = { ...mediaTypeObject } as V31MediaTypeObject;

  if (mediaTypeObject.schema) {
    converted.schema = convertSchema(mediaTypeObject.schema);
  }

  return converted;
}

/**
 * Converts an operation from 3.0 to 3.1 format
 */
function convertOperation(operation: V3OperationObject): V31OperationObject {
  if (!operation || typeof operation !== "object") {
    return operation as V31OperationObject;
  }

  const converted = { ...operation } as V31OperationObject;

  // Convert parameters
  if (operation.parameters) {
    converted.parameters = operation.parameters.map(convertParameter);
  }

  // Convert request body
  if (operation.requestBody) {
    converted.requestBody = convertRequestBody(operation.requestBody);
  }

  // Convert responses
  if (operation.responses) {
    const convertedResponses: Record<
      string,
      V31ReferenceObject | V31ResponseObject
    > = {};
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") {
        if (response) {
          convertedResponses[statusCode] = convertResponse(response);
        }
      } else {
        convertedResponses[statusCode] = convertResponse(response);
      }
    }
    converted.responses = convertedResponses;
  }

  return converted;
}

/**
 * Converts a parameter from 3.0 to 3.1 format
 */
function convertParameter(
  parameter: V3ParameterObject | V3ReferenceObject,
): V31ParameterObject | V31ReferenceObject {
  if (!parameter || typeof parameter !== "object") {
    return parameter as V31ParameterObject | V31ReferenceObject;
  }

  if (isV3ReferenceObject(parameter)) {
    return parameter;
  }

  const converted = { ...parameter } as V31ParameterObject;

  if (parameter.schema) {
    converted.schema = convertSchema(parameter.schema);
  }

  return converted;
}

/**
 * Converts a path item from 3.0 to 3.1 format
 */
function convertPathItem(pathItem: V3PathItemObject): V31PathItemObject {
  if (!pathItem || typeof pathItem !== "object") {
    return pathItem as V31PathItemObject;
  }

  const converted = { ...pathItem } as V31PathItemObject;

  // Convert each operation
  const methods: (keyof Pick<
    V3PathItemObject,
    "delete" | "get" | "head" | "options" | "patch" | "post" | "put" | "trace"
  >)[] = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

  for (const method of methods) {
    if (pathItem[method]) {
      converted[method] = convertOperation(pathItem[method]!);
    }
  }

  // Convert parameters
  if (pathItem.parameters) {
    converted.parameters = pathItem.parameters.map(convertParameter);
  }

  return converted;
}

/**
 * Converts a request body from 3.0 to 3.1 format
 */
function convertRequestBody(
  requestBody: V3ReferenceObject | V3RequestBodyObject,
): V31ReferenceObject | V31RequestBodyObject {
  if (!requestBody || typeof requestBody !== "object") {
    return requestBody as V31ReferenceObject | V31RequestBodyObject;
  }

  if (isV3ReferenceObject(requestBody)) {
    return requestBody;
  }

  const converted = { ...requestBody } as V31RequestBodyObject;

  if (requestBody.content) {
    const convertedContent: Record<string, V31MediaTypeObject> = {};
    for (const [mediaType, mediaTypeObject] of Object.entries(
      requestBody.content,
    )) {
      convertedContent[mediaType] = convertMediaType(mediaTypeObject);
    }
    converted.content = convertedContent;
  }

  return converted;
}

/**
 * Converts a response from 3.0 to 3.1 format
 */
function convertResponse(
  response: V3ReferenceObject | V3ResponseObject,
): V31ReferenceObject | V31ResponseObject {
  if (!response || typeof response !== "object") {
    return response as V31ReferenceObject | V31ResponseObject;
  }

  if (isV3ReferenceObject(response)) {
    return response;
  }

  const converted = { ...response } as V31ResponseObject;

  if (response.content) {
    const convertedContent: Record<string, V31MediaTypeObject> = {};
    for (const [mediaType, mediaTypeObject] of Object.entries(
      response.content,
    )) {
      convertedContent[mediaType] = convertMediaType(mediaTypeObject);
    }
    converted.content = convertedContent;
  }

  return converted;
}

/**
 * Recursively converts a schema object from 3.0 to 3.1 format
 */
function convertSchema(
  schema: V3ReferenceObject | V3SchemaObject,
): V31ReferenceObject | V31SchemaObject {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle reference objects
  if (isV3ReferenceObject(schema)) {
    return schema;
  }

  const converted = { ...schema } as V31SchemaObject;

  // 1. Convert nullable to type arrays
  if (schema.nullable === true && schema.type && "nullable" in converted) {
    delete converted.nullable;
    if (Array.isArray(schema.type)) {
      if (!schema.type.includes("null")) {
        converted.type = [...schema.type, "null"];
      }
    } else {
      converted.type = [schema.type, "null"];
    }
  } else if (schema.nullable === false && "nullable" in converted) {
    delete converted.nullable;
  }

  // 2. Convert exclusiveMinimum/exclusiveMaximum from boolean to numeric
  if (typeof schema.exclusiveMinimum === "boolean") {
    if (schema.exclusiveMinimum && typeof schema.minimum === "number") {
      converted.exclusiveMinimum = schema.minimum;
      delete converted.minimum;
    } else {
      delete converted.exclusiveMinimum;
    }
  }

  if (typeof schema.exclusiveMaximum === "boolean") {
    if (schema.exclusiveMaximum && typeof schema.maximum === "number") {
      converted.exclusiveMaximum = schema.maximum;
      delete converted.maximum;
    } else {
      delete converted.exclusiveMaximum;
    }
  }

  // 3. Convert singular example to examples array
  if (schema.example !== undefined && schema.examples === undefined) {
    converted.examples = [schema.example];
    delete converted.example;
  }

  // 4. Convert format: binary/base64 to contentEncoding/contentMediaType
  if (schema.format === "binary") {
    delete converted.format;
    converted.contentMediaType = "application/octet-stream";
  } else if (schema.format === "base64") {
    delete converted.format;
    converted.contentEncoding = "base64";
  }

  // Recursively convert nested schemas
  if (schema.properties) {
    const convertedProperties: Record<
      string,
      V31ReferenceObject | V31SchemaObject
    > = {};
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      convertedProperties[propName] = convertSchema(propSchema);
    }
    converted.properties = convertedProperties;
  }

  if (schema.items) {
    converted.items = convertSchema(schema.items);
  }

  if (
    schema.additionalProperties &&
    typeof schema.additionalProperties === "object"
  ) {
    converted.additionalProperties = convertSchema(schema.additionalProperties);
  }

  if (schema.allOf) {
    converted.allOf = schema.allOf.map(convertSchema);
  }

  if (schema.anyOf) {
    converted.anyOf = schema.anyOf.map(convertSchema);
  }

  if (schema.oneOf) {
    converted.oneOf = schema.oneOf.map(convertSchema);
  }

  if (schema.not) {
    converted.not = convertSchema(schema.not);
  }

  return converted;
}
