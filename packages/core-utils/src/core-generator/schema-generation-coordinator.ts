import type { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import { promises as fs } from "fs";
import pLimit from "p-limit";
import path from "path";

import type { Profiler } from "./profiler.js";
import type { StringFormatOverride } from "../schema-generator/format-overrides.js";

import {
  createStringFormatOverrideRegistry,
  analyzeSchemaForRecursion,
  createRecursiveContext,
  findRecursiveSchemas,
  generateRecursiveSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  generateSchemaFile,
  writeParameterSchemaFile,
} from "../schema-generator/index.js";
import {
  getHelpersFileContent,
  HELPERS_FILE_NAME,
} from "../schema-generator/helpers-content.js";
import type { ResolvedSchemas } from "../schema-generator/types.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import type { ExtraPropsMode } from "../shared/types.js";
import { isPlainSchemaObject } from "./openapi-utils.js";
import {
  extractOperationParameters,
  type OperationParameterMetadata,
} from "./parameter-extractor.js";
import {
  extractRequestSchemas,
  extractResponseSchemas,
} from "./schema-extractor.js";
import {
  buildParameterSchemaIndexEntry,
  buildSchemaFileIndexEntry,
  generateSchemaIndex,
  type SchemaIndexEntry,
} from "./schema-index-generator.js";

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
  formatOverrides: ReturnType<typeof createStringFormatOverrideRegistry>;
  generateServer: boolean;
  limit: ReturnType<typeof pLimit>;
  openApiDoc: OpenAPIObject;
  resolvedSchemas: ResolvedSchemas;
  schemasDir: string;
}

type SchemaGeneratorFunction<T = SchemaObject> = (
  name: string,
  schema: T,
) => Promise<GeneratedSchemaFile>;

interface GeneratedSchemaFile {
  content: string;
  fileName: string;
  variantFiles?: GeneratedSchemaFile[];
}

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
  formatOverrides: readonly StringFormatOverride[] = [],
): Promise<void> {
  const schemasDir = path.join(output, "schemas");
  await fs.mkdir(schemasDir, { recursive: true });

  /* Emit the schema runtime.ts utility file (exclusiveUnion for oneOf semantics) */
  await fs.writeFile(
    path.join(schemasDir, HELPERS_FILE_NAME),
    getHelpersFileContent(),
  );
  await fs.rm(path.join(schemasDir, "_helpers.ts"), { force: true });

  const limit = pLimit(concurrency);
  const context: SchemaGenerationContext = {
    extraProps,
    formatOverrides: createStringFormatOverrideRegistry(formatOverrides),
    generateServer,
    limit,
    openApiDoc,
    resolvedSchemas: openApiDoc.components?.schemas ?? {},
    schemasDir,
  };

  if (profiler) {
    profiler.start("schemas:parameter-metadata");
  }
  const operationParameters = extractOperationParameters(openApiDoc);
  profiler?.end("schemas:parameter-metadata");

  if (!profiler) {
    const schemaGenerationPromises: Promise<SchemaIndexEntry[]>[] = [
      // Generate schemas from components/schemas
      ...generateComponentSchemas(context),
      // Generate request schemas from operations
      ...createSchemaGenerationPromises(
        extractRequestSchemas(openApiDoc),
        context,
        (name, schema) =>
          generateRequestSchemaFile(name, schema, {
            extraProps: context.extraProps,
            formatOverrides: context.formatOverrides,
            resolvedSchemas: context.resolvedSchemas,
            schemaDirectory: context.schemasDir,
          }),
      ),
      // Generate response schemas from operations
      ...createSchemaGenerationPromises(
        extractResponseSchemas(openApiDoc),
        context,
        (name, schema) =>
          generateResponseSchemaFile(name, schema, {
            extraProps: context.extraProps,
            formatOverrides: context.formatOverrides,
            resolvedSchemas: context.resolvedSchemas,
            schemaDirectory: context.schemasDir,
          }),
      ),
      // Generate parameter schemas from operations
      ...generateParameterSchemas(operationParameters, context),
    ];

    const schemaIndexEntries = (
      await Promise.all(schemaGenerationPromises)
    ).flat();
    await generateSchemaIndex(context.schemasDir, schemaIndexEntries);
  } else {
    const schemaIndexEntries: SchemaIndexEntry[] = [];

    // Profiled path: run phases sequentially to get isolated timings
    profiler.start("schemas:components");
    schemaIndexEntries.push(
      ...(await Promise.all(generateComponentSchemas(context))).flat(),
    );
    profiler.end("schemas:components");

    profiler.start("schemas:requests");
    schemaIndexEntries.push(
      ...(
        await Promise.all(
          createSchemaGenerationPromises(
            extractRequestSchemas(openApiDoc),
            context,
            (name, schema) =>
              generateRequestSchemaFile(name, schema, {
                extraProps: context.extraProps,
                formatOverrides: context.formatOverrides,
                resolvedSchemas: context.resolvedSchemas,
                schemaDirectory: context.schemasDir,
              }),
          ),
        )
      ).flat(),
    );
    profiler.end("schemas:requests");

    profiler.start("schemas:responses");
    schemaIndexEntries.push(
      ...(
        await Promise.all(
          createSchemaGenerationPromises(
            extractResponseSchemas(openApiDoc),
            context,
            (name, schema) =>
              generateResponseSchemaFile(name, schema, {
                extraProps: context.extraProps,
                formatOverrides: context.formatOverrides,
                resolvedSchemas: context.resolvedSchemas,
                schemaDirectory: context.schemasDir,
              }),
          ),
        )
      ).flat(),
    );
    profiler.end("schemas:responses");

    profiler.start("schemas:parameters");
    schemaIndexEntries.push(
      ...(
        await Promise.all(
          generateParameterSchemas(operationParameters, context),
        )
      ).flat(),
    );
    profiler.end("schemas:parameters");

    profiler.start("schemas:index");
    await generateSchemaIndex(context.schemasDir, schemaIndexEntries);
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
): Promise<SchemaIndexEntry[]> {
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
    const generationPromise =
      isRecursive && canUseRecursiveFile
        ? generateRecursiveSchemaFile({
            description,
            extraProps: context.extraProps,
            formatOverrides: context.formatOverrides,
            name: schemaName,
            originalSchemaName: originalSchemaName || schemaName,
            recursiveContext,
            resolvedSchemas: context.resolvedSchemas,
            schemaDirectory: context.schemasDir,
            schema,
          })
        : generateSchemaFile(schemaName, schema, description, {
            extraProps: context.extraProps,
            formatOverrides: context.formatOverrides,
            originalSchemaName,
            recursiveContext,
            resolvedSchemas: context.resolvedSchemas,
            schemaDirectory: context.schemasDir,
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

    return buildSchemaIndexEntries(schemaFile);
  });
}

/**
 * Creates schema generation promises for schemas
 */
function createSchemaGenerationPromises<T = SchemaObject>(
  schemaMap: Map<string, T>,
  context: SchemaGenerationContext,
  generatorFn: SchemaGeneratorFunction<T>,
): Promise<SchemaIndexEntry[]>[] {
  const promises: Promise<SchemaIndexEntry[]>[] = [];

  for (const [name, schema] of schemaMap) {
    // Generate schema (used by both client and server)
    const promise = context.limit(async () => {
      const schemaFile = await generatorFn(name, schema);
      const filePath = path.join(context.schemasDir, schemaFile.fileName);
      await fs.writeFile(filePath, schemaFile.content);
      return [buildSchemaFileIndexEntry(schemaFile.fileName)];
    });
    promises.push(promise);
  }

  return promises;
}

/**
 * Generates component schemas from the OpenAPI document
 */
function generateComponentSchemas(
  context: SchemaGenerationContext,
): Promise<SchemaIndexEntry[]>[] {
  const promises: Promise<SchemaIndexEntry[]>[] = [];

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
  for (const [name, schema] of Object.entries(
    context.openApiDoc.components.schemas,
  )) {
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
        `⚠️ ${name}: not a plain schema object, generating fallback`,
      );
      const sanitizedName = sanitizeIdentifier(name);
      const promise = context.limit(async () => {
        const content = generateFallbackSchemaContent(sanitizedName, schema);
        const fileName = `${sanitizedName}.ts`;
        const filePath = path.join(context.schemasDir, fileName);
        await fs.writeFile(filePath, content);
        return [buildSchemaFileIndexEntry(fileName)];
      });
      promises.push(promise);
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
  operationParameters: readonly OperationParameterMetadata[],
  context: SchemaGenerationContext,
): Promise<SchemaIndexEntry[]>[] {
  const promises: Promise<SchemaIndexEntry[]>[] = [];

  /* Generate parameter schema files for each operation */
  for (const parameterMetadata of operationParameters) {
    const promise = context.limit(async () => {
      await writeParameterSchemaFile(
        context.schemasDir,
        parameterMetadata.operationId,
        parameterMetadata,
        {
          /* Client defaults - no coercion or special handling */
          coercePrimitives: false,
          formatOverrides: context.formatOverrides,
          lowercaseHeaderKeys: false,
        },
      );
      return [buildParameterSchemaIndexEntry(parameterMetadata)];
    });
    promises.push(promise);
  }

  return promises;
}

function buildSchemaIndexEntries(
  schemaFile: GeneratedSchemaFile,
): SchemaIndexEntry[] {
  const entries = [buildSchemaFileIndexEntry(schemaFile.fileName)];

  if (schemaFile.variantFiles) {
    for (const variantFile of schemaFile.variantFiles) {
      entries.push(...buildSchemaIndexEntries(variantFile));
    }
  }

  return entries;
}

/* Generates a minimal fallback file for schemas that are not plain OpenAPI objects */
export function generateFallbackSchemaContent(
  name: string,
  schema: unknown,
): string {
  // OpenAPI 3.1 boolean schemas preserve allow-anything vs allow-nothing.
  const fallbackSchema = schema === false ? "z.never()" : "z.unknown()";

  return `import * as z from 'zod';\n\nexport const ${name} = ${fallbackSchema};\nexport type ${name} = z.infer<typeof ${name}>;\n`;
}
