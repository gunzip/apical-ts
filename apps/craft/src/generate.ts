/* eslint-disable no-console */
import type { ExtraPropsMode } from "@apical-ts/core-utils";
import type { OpenAPIObject } from "openapi3-ts/oas31";

import { generateOperations } from "@apical-ts/client-generator";
import {
  applyGeneratedOperationIds,
  convertToOpenAPI31,
  createPackageJson,
  generateSchemas,
  parseOpenAPI,
  Profiler,
  renameConflictingSchemas,
  renameSanitizationConflictingSchemas,
  resolveRequestBodies,
} from "@apical-ts/core-utils";
import { generateRoutes as generateRouteMetadata } from "@apical-ts/route-generator";
import { generateServerOperations } from "@apical-ts/server-generator";
import $RefParser from "@apidevtools/json-schema-ref-parser";
import { promises as fs } from "fs";

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
 *   concurrency: 10,
 *   extraProps: 'strip'
 * };
 * ```
 */
export interface GenerationOptions {
  /**
   * The maximum number of parallel tasks to run during generation.
   * @default 10
   */
  concurrency?: number;
  /**
   * Control how additional properties are handled in object schemas
   * - strip: standard behavior, validates but strips unknown properties (default)
   * - loose: adds .loose() to objects without explicit additionalProperties
   * - strict: adds .strict() to objects without explicit additionalProperties
   * @default "strip"
   */
  extraProps?: ExtraPropsMode;
  generateClient: boolean;
  generateRoutes?: boolean;
  generateServer?: boolean;
  input: string;
  output: string;
  /** Enable timing breakdown of major phases */
  profile?: boolean;
}

/**
 * Generates TypeScript schemas, and optionally API client, route metadata, and server operations from an OpenAPI specification.
 *
 * This function supports the following generation options:
 * - **Schemas**: Generates Zod schemas for runtime validation.
 * - **Client**: Generates a fully-typed API client.
 * - **Routes**: Generates route metadata for server-side integration.
 * - **Server**: Generates server-side operation handlers.
 *
 * @param options - Configuration options for code generation.
 * @example
 * ```javascript
 * const options: GenerationOptions = {
 *   input: './openapi.yaml',
 *   output: './generated',
 *   generateClient: true,
 *   generateRoutes: true,
 *   generateServer: false,
 *   concurrency: 10,
 *   extraProps: 'strip'
 * };
 * ```
 */
export async function generate(options: GenerationOptions): Promise<void> {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    extraProps = "strip",
    generateClient: genClient,
    generateRoutes: genRoutes = false,
    generateServer: genServer = false,
    input,
    output,
    profile = false,
  } = options;

  await fs.mkdir(output, { recursive: true });

  const profiler = profile ? new Profiler() : undefined;

  profiler?.start("parse+preprocess");
  const openApiDoc = await parseAndPreprocessOpenAPI(input);
  profiler?.end("parse+preprocess");

  profiler?.start("schemas:all");
  await generateSchemas(
    openApiDoc,
    output,
    concurrency,
    genServer,
    extraProps,
    profiler,
  );
  profiler?.end("schemas:all");

  await generateAllOperations(
    openApiDoc,
    output,
    concurrency,
    genClient,
    genRoutes,
    genServer,
    profiler,
  );

  profiler?.start("package-json");
  await createPackageJson(output);
  profiler?.end("package-json");

  profiler?.printSummary?.("Generation timing (ms)");
}

/**
 * Generates all operations (routes, client and/or server)
 */
async function generateAllOperations(
  openApiDoc: OpenAPIObject,
  output: string,
  concurrency: number,
  generateClient: boolean,
  generateRoutes: boolean,
  generateServer: boolean,
  profiler?: Profiler,
): Promise<void> {
  const operationPromises: Promise<void>[] = [];

  /* Generate routes if explicitly requested or if client/server is enabled */
  if (generateRoutes || generateClient || generateServer) {
    profiler?.start("routes");
    operationPromises.push(
      generateRouteMetadata(openApiDoc, output, concurrency).finally(() => {
        profiler?.end("routes");
      }),
    );
  }

  if (generateClient) {
    profiler?.start("client-operations");
    operationPromises.push(
      generateOperations(openApiDoc, output, concurrency).finally(() => {
        profiler?.end("client-operations");
      }),
    );
  }

  if (generateServer) {
    profiler?.start("server-operations");
    operationPromises.push(
      generateServerOperations(openApiDoc, output, concurrency)
        .then(() => {
          console.log("✅ Server operations generated successfully");
        })
        .finally(() => {
          profiler?.end("server-operations");
        }),
    );
  }

  await Promise.all(operationPromises);
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
