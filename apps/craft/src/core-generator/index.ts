/* eslint-disable no-console */
import type { OpenAPIObject } from "openapi3-ts/oas31";

import $RefParser from "@apidevtools/json-schema-ref-parser";
import { promises as fs } from "fs";

import { generateOperations } from "../client-generator/index.js";
import { applyGeneratedOperationIds } from "../operation-id-generator/index.js";
import { generateServerOperations } from "../server-generator/index.js";
import { convertToOpenAPI31 } from "./converter.js";
import { createPackageJson } from "./package-generator.js";
import { parseOpenAPI } from "./parser.js";
import { resolveRequestBodies } from "./request-body-resolver.js";
import {
  renameConflictingSchemas,
  renameSanitizationConflictingSchemas,
} from "./schema-conflict-resolver.js";
import { generateAllSchemas } from "./schema-generation-coordinator.js";

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

  const openApiDoc = await parseAndPreprocessOpenAPI(input);

  await generateAllSchemas(
    openApiDoc,
    output,
    concurrency,
    strictValidation,
    genServer,
  );

  await generateAllOperations(
    openApiDoc,
    output,
    concurrency,
    genClient,
    genServer,
  );

  await createPackageJson(output);
}

/**
 * Generates all operations (client and/or server)
 */
async function generateAllOperations(
  openApiDoc: OpenAPIObject,
  output: string,
  concurrency: number,
  generateClient: boolean,
  generateServer: boolean,
): Promise<void> {
  if (generateClient) {
    await generateOperations(openApiDoc, output, concurrency);
  }

  if (generateServer) {
    await generateServerOperations(openApiDoc, output, concurrency);
    console.log("✅ Server operations generated successfully");
  }
}

/**
 * Parses and preprocesses the OpenAPI document
 */
async function parseAndPreprocessOpenAPI(
  input: string,
): Promise<OpenAPIObject> {
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

  /*
   * Pre-process: rename component schemas whose names would collide with
   * internal generator types or global / built-in JavaScript identifiers.
   * This prevents name clashes in generated imports (e.g. user schema named
   * ApiResponse, Blob, Buffer, etc.). Renamed schemas receive a stable
   * 'Schema' suffix (or 'Schema2', 'Schema3', ... if needed to avoid further
   * collisions). All $ref pointers are updated accordingly across the
   * document before any generation steps begin.
   */
  const renamedCount = renameConflictingSchemas(openApiDoc);
  if (renamedCount > 0) {
    console.log(
      "✅ Renamed conflicting schema names with 'Schema' suffix where necessary",
    );
  }

  /*
   * Pre-process: rename schemas whose sanitized identifiers would collide.
   * This prevents name clashes when schemas like 'Catalog' and '_catalog'
   * both sanitize to similar identifiers causing case-sensitivity conflicts
   * in TypeScript imports and file systems.
   */
  const sanitizationRenamedCount =
    renameSanitizationConflictingSchemas(openApiDoc);
  if (sanitizationRenamedCount > 0) {
    console.log(
      "✅ Renamed schema names with sanitization conflicts to avoid case-sensitivity issues",
    );
  }

  // Resolve requestBodies references to inline content
  const resolvedRequestBodiesCount = resolveRequestBodies(openApiDoc);
  if (resolvedRequestBodiesCount > 0) {
    console.log(
      `✅ Resolved ${resolvedRequestBodiesCount} requestBody references`,
    );
  }

  return openApiDoc;
}
