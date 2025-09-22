import type { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import { promises as fs } from "fs";
import pLimit from "p-limit";
import path from "path";

import {
  analyzeSchemaForRecursion,
  createRecursiveContext,
  generateRecursiveSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
} from "../schema-generator/index.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { isPlainSchemaObject } from "./openapi-utils.js";
import {
  extractRequestSchemas,
  extractResponseSchemas,
} from "./schema-extractor.js";

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
  strictValidation: boolean;
}

interface SchemaGenerationContext {
  generateServer: boolean;
  limit: ReturnType<typeof pLimit>;
  openApiDoc: OpenAPIObject;
  schemasDir: string;
  strictValidation: boolean;
}

type SchemaGeneratorFunction<T = SchemaObject> = (
  name: string,
  schema: T,
  options: { strictValidation: boolean },
) => Promise<{ content: string; fileName: string }>;

/**
 * Generates all schemas (component, request, and response schemas)
 */
export async function generateAllSchemas(
  openApiDoc: OpenAPIObject,
  output: string,
  concurrency: number,
  strictValidation: boolean,
  generateServer: boolean,
): Promise<void> {
  if (!openApiDoc.components?.schemas) {
    return;
  }

  const schemasDir = path.join(output, "schemas");
  await fs.mkdir(schemasDir, { recursive: true });

  const limit = pLimit(concurrency);
  const context: SchemaGenerationContext = {
    generateServer,
    limit,
    openApiDoc,
    schemasDir,
    strictValidation,
  };

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
  ];

  await Promise.all(schemaGenerationPromises);
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
    strictValidation,
  } = options;
  const isRecursive = recursiveContext.recursiveSchemas.has(schemaName);

  return context.limit(async () => {
    const generationPromise = isRecursive
      ? generateRecursiveSchemaFile({
          description,
          name: schemaName,
          originalSchemaName: originalSchemaName || schemaName,
          recursiveContext,
          schema,
          strictValidation,
        })
      : generateSchemaFile(schemaName, schema, description, {
          originalSchemaName,
          recursiveContext,
          strictValidation,
        });

    const schemaFile = await generationPromise;
    const filePath = path.join(context.schemasDir, schemaFile.fileName);
    return await fs.writeFile(filePath, schemaFile.content);
  });
}

/**
 * Creates schema generation promises for both regular and strict variants
 */
function createSchemaGenerationPromises<T = SchemaObject>(
  schemaMap: Map<string, T>,
  context: SchemaGenerationContext,
  generatorFn: SchemaGeneratorFunction<T>,
): Promise<void>[] {
  const promises: Promise<void>[] = [];

  for (const [name, schema] of schemaMap) {
    // Generate regular schema
    const promise = context.limit(() =>
      generatorFn(name, schema, {
        strictValidation: context.strictValidation,
      }).then((schemaFile) => {
        const filePath = path.join(context.schemasDir, schemaFile.fileName);
        return fs.writeFile(filePath, schemaFile.content);
      }),
    );
    promises.push(promise);

    // Generate strict schema for server when generateServer is enabled
    if (context.generateServer) {
      const strictPromise = context.limit(() =>
        generatorFn(`${name}Strict`, schema, {
          strictValidation: true,
        }).then((schemaFile) => {
          const filePath = path.join(context.schemasDir, schemaFile.fileName);
          return fs.writeFile(filePath, schemaFile.content);
        }),
      );
      promises.push(strictPromise);
    }
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

  // First pass: analyze all schemas for recursive patterns
  for (const [name, schema] of Object.entries(
    context.openApiDoc.components.schemas,
  )) {
    if (!isPlainSchemaObject(schema)) {
      continue;
    }

    const sanitizedName = sanitizeIdentifier(name);

    // Analyze for recursion and update context
    const isRecursive = analyzeSchemaForRecursion(name, schema);
    if (isRecursive) {
      recursiveContext.recursiveSchemas.add(sanitizedName);
      // Also add the strict variant if server generation is enabled
      if (context.generateServer) {
        recursiveContext.recursiveSchemas.add(`${sanitizedName}Strict`);
      }
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

    // Generate regular schema
    const promise = createComponentSchemaPromise({
      context,
      description,
      recursiveContext,
      schema,
      schemaName: sanitizedName,
      strictValidation: context.strictValidation,
    });
    promises.push(promise);

    // Generate strict schema for server when generateServer is enabled
    if (context.generateServer) {
      const strictPromise = createComponentSchemaPromise({
        context,
        description,
        originalSchemaName: sanitizedName,
        recursiveContext,
        schema,
        schemaName: `${sanitizedName}Strict`,
        strictValidation: true,
      });
      promises.push(strictPromise);
    }
  }

  return promises;
}
