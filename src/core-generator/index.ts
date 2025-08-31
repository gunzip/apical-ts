/* eslint-disable no-console */
import type {
  OpenAPIObject,
  OperationObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
} from "openapi3-ts/oas31";

import $RefParser from "@apidevtools/json-schema-ref-parser";
import assert from "assert";
import { promises as fs } from "fs";
import { isReferenceObject } from "openapi3-ts/oas31";
import pLimit from "p-limit";
import path from "path";

import { generateOperations } from "../client-generator/index.js";
import { applyGeneratedOperationIds } from "../operation-id-generator/index.js";
import {
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
} from "../schema-generator/index.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { generateServerOperations } from "../server-generator/index.js";
import { convertToOpenAPI31 } from "./converter.js";
import { parseOpenAPI } from "./parser.js";

const DEFAULT_CONCURRENCY = 10;

/**
 * Configuration options for code generation
 *
 * @example
 * ```javascript
 * const options: GenerationOptions = {
 *   input: './openapi.yaml',
 *   output: './generated',
 *   generateClient: true,
 *   strictValidation: false,
 *   concurrency: 10,
 * };
 * ```
 */
export interface GenerationOptions {
  /**
   * The maximum number of parallel tasks to run during generation.
   * @default 10
   */
  concurrency?: number;
  generateClient: boolean;
  generateServer?: boolean;
  input: string;
  output: string;
  /**
   * Use strict object validation (z.strictObject) instead of loose validation (z.object).
   * When false (default), allows additional properties in objects for client-side flexibility.
   * When true, rejects unknown properties for server-side validation.
   * @default false
   */
  strictValidation?: boolean;
}

/**
 * Generates TypeScript schemas and optional API client from OpenAPI specification
 */
export async function generate(options: GenerationOptions): Promise<void> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    generateClient: genClient,
    generateServer: genServer = false,
    input,
    output,
    strictValidation = false,
  } = options;

  await fs.mkdir(output, { recursive: true });

  // Pre-process: Resolve external $ref pointers before parsing to avoid parsing failures
  let openApiDoc: OpenAPIObject;
  try {
    // Bundle external references first, then convert to OpenAPI 3.1
    const bundled = await $RefParser.bundle(input, {
      mutateInputSchema: false, // Don't modify the original
    });
    console.log("✅ Successfully resolved external $ref pointers");

    // Convert the bundled document to OpenAPI 3.1
    openApiDoc = await convertToOpenAPI31(bundled);
  } catch (error) {
    console.warn(
      "⚠️ Failed to resolve external $ref pointers, falling back to regular parsing:",
      error,
    );
    openApiDoc = await parseOpenAPI(input);
  }

  // Apply generated operation IDs for operations that don't have them
  applyGeneratedOperationIds(openApiDoc);
  console.log("✅ Applied generated operation IDs where missing");

  const limit = pLimit(concurrency);
  const schemaGenerationPromises: Promise<void>[] = [];

  if (openApiDoc.components?.schemas) {
    const schemasDir = path.join(output, "schemas");
    await fs.mkdir(schemasDir, { recursive: true });

    function isPlainSchemaObject(obj: unknown): obj is SchemaObject {
      if (!obj || typeof obj !== "object") return false;
      // Must have at least one OpenAPI schema property
      return (
        "type" in obj ||
        "allOf" in obj ||
        "anyOf" in obj ||
        "oneOf" in obj ||
        "properties" in obj ||
        "additionalProperties" in obj ||
        "array" in obj
      );
    }

    // Generate schemas from components/schemas
    for (const [name, schema] of Object.entries(
      openApiDoc.components.schemas,
    )) {
      if (!isPlainSchemaObject(schema)) {
        console.warn(
          `⚠️ Skipping ${name}: not a plain OpenAPI schema object. Value:`,
          schema,
        );
        continue;
      }

      const sanitizedName = sanitizeIdentifier(name);

      const description = schema.description
        ? schema.description.trim()
        : undefined;
      const promise = limit(() =>
        generateSchemaFile(sanitizedName, schema, description, {
          strictValidation,
        }).then((schemaFile) => {
          const filePath = path.join(schemasDir, schemaFile.fileName);
          return fs.writeFile(filePath, schemaFile.content);
        }),
      );
      schemaGenerationPromises.push(promise);
    }

    // Generate request schemas from operations
    const requestSchemas = extractRequestSchemas(openApiDoc);
    for (const [name, schema] of requestSchemas) {
      const promise = limit(() =>
        generateRequestSchemaFile(name, schema, { strictValidation }).then(
          (schemaFile) => {
            const filePath = path.join(schemasDir, schemaFile.fileName);
            return fs.writeFile(filePath, schemaFile.content);
          },
        ),
      );
      schemaGenerationPromises.push(promise);
    }

    // Generate response schemas from operations
    const responseSchemas = extractResponseSchemas(openApiDoc);
    for (const [name, schema] of responseSchemas) {
      const promise = limit(() =>
        generateResponseSchemaFile(name, schema, { strictValidation }).then(
          (schemaFile) => {
            const filePath = path.join(schemasDir, schemaFile.fileName);
            return fs.writeFile(filePath, schemaFile.content);
          },
        ),
      );
      schemaGenerationPromises.push(promise);
    }
  }

  await Promise.all(schemaGenerationPromises);
  console.log("✅ Schemas generated successfully");

  if (genClient) {
    await generateOperations(openApiDoc, output, concurrency);
  }

  if (genServer) {
    await generateServerOperations(openApiDoc, output, concurrency);
    console.log("✅ Server operations generated successfully");
  }

  const packageJsonContent = {
    dependencies: {
      zod: "^4.0.0",
    },
    name: "generated-client",
    type: "module",
    version: "1.0.0",
  };
  const packageJsonPath = path.join(output, "package.json");
  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2),
  );
}

/**
 * Extracts request schemas from operations for inline request body schemas
 *
 * @example
 * ```javascript
 * const openApiDoc = {
 *   paths: {
 *     '/users': {
 *       post: {
 *         operationId: 'createUser',
 *         requestBody: {
 *           content: {
 *             'application/json': {
 *               schema: {
 *                 type: 'object',
 *                 properties: { name: { type: 'string' } }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const schemas = extractRequestSchemas(openApiDoc);
 * // Result: Map with entry 'CreateUserRequest' -> schema object
 * ```
 */
function extractRequestSchemas(
  openApiDoc: OpenAPIObject,
): Map<string, SchemaObject> {
  const requestSchemas = new Map<string, SchemaObject>();

  forEachOperation(openApiDoc, (operation) => {
    if (!operation.requestBody) return;

    // Handle both direct RequestBodyObject and ReferenceObject
    let requestBody: RequestBodyObject;
    if (isReferenceObject(operation.requestBody)) {
      // Skip reference objects for now - we only want inline schemas
      return;
    } else {
      requestBody = operation.requestBody;
    }

    const supportedContentTypes = [
      "application/json",
      "multipart/form-data",
      "application/x-www-form-urlencoded",
    ];

    assert(operation.operationId, "Operation ID is missing");

    for (const contentType of supportedContentTypes) {
      const content = requestBody.content?.[contentType];
      if (content?.schema && !isReferenceObject(content.schema)) {
        // Only extract inline schemas, not $ref schemas
        const requestTypeName = `${sanitizeIdentifier(operation.operationId)}Request`;
        requestSchemas.set(requestTypeName, content.schema);
        break; // Only process the first matching content type
      }
    }
  });

  return requestSchemas;
}

/**
 * Extracts response schemas from operations for inline response schemas
 *
 * @example
 * ```javascript
 * const openApiDoc = {
 *   paths: {
 *     '/users/{id}': {
 *       get: {
 *         operationId: 'getUser',
 *         responses: {
 *           '200': {
 *             content: {
 *               'application/json': {
 *                 schema: {
 *                   type: 'object',
 *                   properties: { id: { type: 'string' }, name: { type: 'string' } }
 *                 }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const schemas = extractResponseSchemas(openApiDoc);
 * // Result: Map with entry 'GetUser200Response' -> schema object
 * ```
 */
function extractResponseSchemas(
  openApiDoc: OpenAPIObject,
): Map<string, SchemaObject> {
  const responseSchemas = new Map<string, SchemaObject>();

  forEachOperation(openApiDoc, (operation) => {
    if (!operation.responses) return;

    const operationId = operation.operationId;

    assert(operationId, "Operation ID is missing");

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") continue;

      // Handle both direct ResponseObject and ReferenceObject
      let responseObj: ResponseObject;
      if (isReferenceObject(response)) {
        // Skip reference objects for now - we only want inline schemas
        continue;
      } else {
        responseObj = response;
      }

      if (!responseObj.content) continue;

      // Check for various content types
      const supportedContentTypes = [
        "application/json",
        "application/problem+json",
        "application/octet-stream",
        "multipart/form-data",
      ];

      for (const contentType of Object.keys(responseObj.content)) {
        if (
          supportedContentTypes.includes(contentType) ||
          contentType.includes("+json")
        ) {
          const content = responseObj.content[contentType];
          if (content?.schema && !isReferenceObject(content.schema)) {
            // Only extract inline schemas, not $ref schemas
            const sanitizedOperationId = sanitizeIdentifier(operationId);
            const responseTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${statusCode}Response`;
            responseSchemas.set(responseTypeName, content.schema);
          }
          break; // Only process the first matching content type
        }
      }
    }
  });

  return responseSchemas;
}

/**
 * Common utility to iterate through all operations in an OpenAPI document.
 * Works with all operations, regardless of whether they have operationId
 */
function forEachOperation(
  openApiDoc: OpenAPIObject,
  callback: (
    operation: OperationObject,
    method: string,
    pathKey: string,
  ) => void,
): void {
  if (!openApiDoc.paths) {
    return;
  }

  for (const [pathKey, pathItem] of Object.entries(openApiDoc.paths)) {
    const pathItemObj = pathItem;

    // Define the HTTP methods we support with their corresponding operations
    const httpMethods: {
      method: string;
      operation: OperationObject | undefined;
    }[] = [
      { method: "get", operation: pathItemObj.get },
      { method: "post", operation: pathItemObj.post },
      { method: "put", operation: pathItemObj.put },
      { method: "delete", operation: pathItemObj.delete },
      { method: "patch", operation: pathItemObj.patch },
    ];

    for (const { method, operation } of httpMethods) {
      if (operation) {
        // OperationId is generated if missing
        callback(operation, method, pathKey);
      }
    }
  }
}
