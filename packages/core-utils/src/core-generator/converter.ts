import type { OpenAPIObject as OpenAPIV3Document } from "openapi3-ts/oas30";
import type {
  MediaTypeObject as V3MediaTypeObject,
  OpenAPIObject as V3OpenAPIObject,
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
  OpenAPIObject as V31OpenAPIObject,
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
  // We let Swagger 2.0 documents pass through without validation
  // in order to avoid importing openapi-types to get the 2.x typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  openapi: unknown,
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
    `Unsupported OpenAPI version: ${
      typeof openapi === "object" && openapi !== null
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (openapi as any).openapi || (openapi as any).swagger || "unknown"
        : "unknown"
    }`,
  );
}

/**
 * Checks if an OpenAPI document is version 2.0 (Swagger)
 */
export function isOpenAPI20(openapi: unknown): boolean {
  return (
    typeof openapi === "object" &&
    openapi !== null &&
    "swagger" in openapi &&
    typeof openapi.swagger === "string" &&
    openapi.swagger.startsWith("2.0")
  );
}

/**
 * Checks if an OpenAPI document is version 3.0.x
 */
export function isOpenAPI30(openapi: unknown): openapi is V3OpenAPIObject {
  return (
    typeof openapi === "object" &&
    openapi !== null &&
    "openapi" in openapi &&
    typeof openapi.openapi === "string" &&
    openapi.openapi.startsWith("3.0")
  );
}

/**
 * Checks if an OpenAPI document is version 3.1.x
 */
export function isOpenAPI31(openapi: unknown): openapi is V31OpenAPIObject {
  return (
    typeof openapi === "object" &&
    openapi !== null &&
    "openapi" in openapi &&
    typeof openapi.openapi === "string" &&
    openapi.openapi.startsWith("3.1")
  );
}

/* Helper: normalize singular example to examples array */
function applyExampleConversion(
  source: V3SchemaObject,
  target: V31SchemaObject,
): void {
  if (source.example !== undefined && source.examples === undefined) {
    target.examples = [source.example];
    delete (target as V3SchemaObject).example;
  }
}

/* Helper: convert boolean exclusiveMinimum/Maximum to numeric values */
function applyExclusiveBoundsConversion(
  source: V3SchemaObject,
  target: V31SchemaObject,
): void {
  if (typeof source.exclusiveMinimum === "boolean") {
    if (source.exclusiveMinimum && typeof source.minimum === "number") {
      target.exclusiveMinimum = source.minimum;
      delete target.minimum;
    } else {
      delete target.exclusiveMinimum;
    }
  }
  if (typeof source.exclusiveMaximum === "boolean") {
    if (source.exclusiveMaximum && typeof source.maximum === "number") {
      target.exclusiveMaximum = source.maximum;
      delete target.maximum;
    } else {
      delete target.exclusiveMaximum;
    }
  }
}

/* Helper: convert legacy format markers for binary/base64 content */
function applyFormatConversion(
  source: V3SchemaObject,
  target: V31SchemaObject,
): void {
  if (source.format === "binary") {
    delete target.format;
    target.contentMediaType = "application/octet-stream";
  } else if (source.format === "base64") {
    delete target.format;
    target.contentEncoding = "base64";
  }
}

/* Helper: recursively convert nested schema structures */
function applyNestedSchemaConversion(
  source: V3SchemaObject,
  target: V31SchemaObject,
): void {
  if (source.properties) {
    const convertedProperties: Record<
      string,
      V31ReferenceObject | V31SchemaObject
    > = {};
    for (const [propName, propSchema] of Object.entries(source.properties)) {
      convertedProperties[propName] = convertSchema(propSchema);
    }
    target.properties = convertedProperties;
  }
  if (source.items) {
    target.items = convertSchema(source.items);
  }
  if (
    source.additionalProperties &&
    typeof source.additionalProperties === "object"
  ) {
    target.additionalProperties = convertSchema(source.additionalProperties);
  }
  if (source.allOf) target.allOf = source.allOf.map(convertSchema);
  if (source.anyOf) target.anyOf = source.anyOf.map(convertSchema);
  if (source.oneOf) target.oneOf = source.oneOf.map(convertSchema);
  if (source.not) target.not = convertSchema(source.not);
}

/* Helper: nullable -> type union conversion and nullable flag removal */
function applyNullableConversion(
  source: V3SchemaObject,
  target: V31SchemaObject,
): void {
  if (!("nullable" in target)) return;
  if (source.nullable === true && source.type) {
    delete target.nullable;
    if (Array.isArray(source.type)) {
      if (!source.type.includes("null")) target.type = [...source.type, "null"];
    } else {
      target.type = [source.type, "null"];
    }
  } else if (source.nullable === false) {
    delete target.nullable;
  }
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
  const methods: (keyof Pick<
    V3PathItemObject,
    "delete" | "get" | "head" | "options" | "patch" | "post" | "put" | "trace"
  >)[] = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
  for (const method of methods) {
    if (pathItem[method]) {
      converted[method] = convertOperation(pathItem[method]);
    }
  }
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
  if (!schema || typeof schema !== "object") return schema;
  if (isV3ReferenceObject(schema)) return schema;

  const converted = { ...schema } as V31SchemaObject;

  applyNullableConversion(schema, converted);
  applyExclusiveBoundsConversion(schema, converted);
  applyExampleConversion(schema, converted);
  applyFormatConversion(schema, converted);
  applyNestedSchemaConversion(schema, converted);

  return converted;
}
