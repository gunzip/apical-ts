import type { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import { promises as fs } from "fs";
import pLimit from "p-limit";
import path from "path";

import type { Profiler } from "./profiler.js";

import {
  analyzeSchemaForRecursion,
  createRecursiveContext,
  findRecursiveSchemas,
  generateRecursiveSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
  writeParameterSchemaFile,
} from "../schema-generator/index.js";
import type { ResolvedSchemas } from "../schema-generator/types.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import type { ExtraPropsMode } from "../shared/types.js";
import { isPlainSchemaObject } from "./openapi-utils.js";
import { extractOperationParameters } from "./parameter-extractor.js";
import {
  extractRequestSchemas,
  extractResponseSchemas,
} from "./schema-extractor.js";
import { generateSchemaIndex } from "./schema-index-generator.js";

/**
 * Options for component schema promise creation
 */
interface ComponentSchemaOptions {
  context: SchemaGenerationContext;
  description?: string;
  originalSchemaName?: string;
  recursiveContext: ReturnType<typeof createRecursiveContext>;
  schema: SchemaObject;
  schemaName: string;
}

interface SchemaGenerationContext {
  extraProps: ExtraPropsMode;
  generateServer: boolean;
  limit: ReturnType<typeof pLimit>;
  openApiDoc: OpenAPIObject;
  resolvedSchemas: ResolvedSchemas;
  schemasDir: string;
}

type SchemaGeneratorFunction<T = SchemaObject> = (
  name: string,
  schema: T,
) => Promise<{ content: string; fileName: string }>;

/**
 * Generates all schemas (component, request, response, and parameter schemas)
 */
export async function generateSchemas(
  openApiDoc: OpenAPIObject,
  output: string,
  concurrency: number,
  generateServer: boolean,
  extraProps: ExtraPropsMode,
  profiler?: Profiler,
): Promise<void> {
  const schemasDir = path.join(output, "schemas");
  await fs.mkdir(schemasDir, { recursive: true });

  const limit = pLimit(concurrency);
  const context: SchemaGenerationContext = {
    extraProps,
    generateServer,
    limit,
    openApiDoc,
    resolvedSchemas: openApiDoc.components?.schemas ?? {},
    schemasDir,
  };

  if (!profiler) {
    const schemaGenerationPromises: Promise<void>[] = [
      // Generate schemas from components/schemas
      ...generateComponentSchemas(context),
      // Generate request schemas from operations
      ...createSchemaGenerationPromises(
        extractRequestSchemas(openApiDoc),
        context,
        generateRequestSchemaFile,
      ),
      // Generate response schemas from operations
      ...createSchemaGenerationPromises(
        extractResponseSchemas(openApiDoc),
        context,
        generateResponseSchemaFile,
      ),
      // Generate parameter schemas from operations
      ...generateParameterSchemas(openApiDoc, context),
    ];

    await Promise.all(schemaGenerationPromises);

    /* Generate the schema index barrel file */
    const operationParameters = extractOperationParameters(openApiDoc);
    await generateSchemaIndex(context.schemasDir, operationParameters);
  } else {
    // Profiled path: run phases sequentially to get isolated timings
    profiler.start("schemas:components");
    await Promise.all(generateComponentSchemas(context));
    profiler.end("schemas:components");

    profiler.start("schemas:requests");
    await Promise.all(
      createSchemaGenerationPromises(
        extractRequestSchemas(openApiDoc),
        context,
        generateRequestSchemaFile,
      ),
    );
    profiler.end("schemas:requests");

    profiler.start("schemas:responses");
    await Promise.all(
      createSchemaGenerationPromises(
        extractResponseSchemas(openApiDoc),
        context,
        generateResponseSchemaFile,
      ),
    );
    profiler.end("schemas:responses");

    profiler.start("schemas:parameters");
    await Promise.all(generateParameterSchemas(openApiDoc, context));
    profiler.end("schemas:parameters");

    profiler.start("schemas:index");
    const operationParameters = extractOperationParameters(openApiDoc);
    await generateSchemaIndex(context.schemasDir, operationParameters);
    profiler.end("schemas:index");
  }
  /* eslint-disable-next-line no-console */
  console.log("✅ Schemas generated successfully");
}

/**
 * Creates a schema generation promise for a single schema variant
 */
function createComponentSchemaPromise(
  options: ComponentSchemaOptions,
): Promise<void> {
  const {
    context,
    description,
    originalSchemaName,
    recursiveContext,
    schema,
    schemaName,
  } = options;
  const isRecursive = recursiveContext.recursiveSchemas.has(schemaName);
  const isObjectType =
    schema.type === "object" ||
    (Array.isArray(schema.type) && schema.type.includes("object"));
  const canUseRecursiveFile = isObjectType && !!schema.properties;

  return context.limit(async () => {
    const generationPromise = isRecursive && canUseRecursiveFile
      ? generateRecursiveSchemaFile({
          description,
          extraProps: context.extraProps,
          name: schemaName,
          originalSchemaName: originalSchemaName || schemaName,
          recursiveContext,
          resolvedSchemas: context.resolvedSchemas,
          schema,
        })
      : generateSchemaFile(schemaName, schema, description, {
          extraProps: context.extraProps,
          originalSchemaName,
          recursiveContext,
          resolvedSchemas: context.resolvedSchemas,
        });

    const schemaFile = await generationPromise;
    const filePath = path.join(context.schemasDir, schemaFile.fileName);
    await fs.writeFile(filePath, schemaFile.content);

    /* Write variant re-export files if present */
    if (schemaFile.variantFiles) {
      for (const variantFile of schemaFile.variantFiles) {
        const variantPath = path.join(context.schemasDir, variantFile.fileName);
        await fs.writeFile(variantPath, variantFile.content);
      }
    }
  });
}

/**
 * Creates schema generation promises for schemas
 */
function createSchemaGenerationPromises<T = SchemaObject>(
  schemaMap: Map<string, T>,
  context: SchemaGenerationContext,
  generatorFn: SchemaGeneratorFunction<T>,
): Promise<void>[] {
  const promises: Promise<void>[] = [];

  for (const [name, schema] of schemaMap) {
    // Generate schema (used by both client and server)
    const promise = context.limit(() =>
      generatorFn(name, schema).then((schemaFile) => {
        const filePath = path.join(context.schemasDir, schemaFile.fileName);
        return fs.writeFile(filePath, schemaFile.content);
      }),
    );
    promises.push(promise);
  }

  return promises;
}

/**
 * Generates component schemas from the OpenAPI document
 */
function generateComponentSchemas(
  context: SchemaGenerationContext,
): Promise<void>[] {
  const promises: Promise<void>[] = [];

  if (!context.openApiDoc.components?.schemas) {
    return promises;
  }

  // Create a shared recursive context for all schemas
  const recursiveContext = createRecursiveContext();

  findRecursiveSchemas(context.openApiDoc.components.schemas).forEach(
    (schemaName) => {
      recursiveContext.recursiveSchemas.add(schemaName);
    },
  );

  // Preserve direct self-reference detection as a fallback.
  for (const [name, schema] of Object.entries(context.openApiDoc.components.schemas)) {
    if (!isPlainSchemaObject(schema)) {
      continue;
    }

    const sanitizedName = sanitizeIdentifier(name);
    if (analyzeSchemaForRecursion(name, schema)) {
      recursiveContext.recursiveSchemas.add(sanitizedName);
    }
  }

  // Second pass: generate schema files with recursive context
  for (const [name, schema] of Object.entries(
    context.openApiDoc.components.schemas,
  )) {
    if (!isPlainSchemaObject(schema)) {
      /* eslint-disable-next-line no-console */
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

    // Generate schema (used by both client and server)
    const promise = createComponentSchemaPromise({
      context,
      description,
      recursiveContext,
      schema,
      schemaName: sanitizedName,
    });
    promises.push(promise);
  }

  return promises;
}

/**
 * Generates parameter schemas for all operations
 */
function generateParameterSchemas(
  openApiDoc: OpenAPIObject,
  context: SchemaGenerationContext,
): Promise<void>[] {
  const promises: Promise<void>[] = [];

  /* Extract all operation parameters */
  const operationParameters = extractOperationParameters(openApiDoc);

  /* Generate parameter schema files for each operation */
  for (const parameterMetadata of operationParameters) {
    const promise = context.limit(() =>
      writeParameterSchemaFile(
        context.schemasDir,
        parameterMetadata.operationId,
        parameterMetadata,
        {
          /* Client defaults - no coercion or special handling */
          coercePrimitives: false,
          lowercaseHeaderKeys: false,
        },
      ),
    );
    promises.push(promise);
  }

  return promises;
}
