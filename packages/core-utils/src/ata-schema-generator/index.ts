/*
 * ATA Schema Generator — entry point.
 *
 * Orchestrates generation of all schema files using ata-validator
 * AOT compilation. Called from the schema-generation-coordinator when
 * --validator=ata is specified.
 */

import type { OpenAPIObject, SchemaObject } from "openapi3-ts/oas31";

import { promises as fs } from "fs";
import pLimit from "p-limit";
import path from "path";

import type { Profiler } from "../core-generator/profiler.js";
import type { ExtraPropsMode } from "../shared/types.js";

import { isPlainSchemaObject } from "../core-generator/openapi-utils.js";
import { extractOperationParameters } from "../core-generator/parameter-extractor.js";
import {
  extractRequestSchemas,
  extractResponseSchemas,
} from "../core-generator/schema-extractor.js";
import {
  buildSchemaFileIndexEntry,
  buildParameterSchemaIndexEntry,
  generateSchemaIndex,
  type SchemaIndexEntry,
} from "../core-generator/schema-index-generator.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import {
  generateAtaFallbackContent,
  generateAtaRequestSchemaFile,
  generateAtaResponseSchemaFile,
  generateAtaSchemaFile,
} from "./file-generator.js";
import {
  getAtaHelpersFileContent,
  HELPERS_FILE_NAME,
} from "./helpers-content.js";
import { writeAtaParameterSchemaFile } from "./parameter-file-generator.js";

/*
 * Generates all schemas using ata-validator (AOT mode).
 */
export async function generateAtaSchemas(
  openApiDoc: OpenAPIObject,
  output: string,
  concurrency: number,
  extraProps: ExtraPropsMode,
  profiler?: Profiler,
): Promise<void> {
  const schemasDir = path.join(output, "schemas");
  await fs.mkdir(schemasDir, { recursive: true });

  /* Emit the ata runtime helpers file */
  await fs.writeFile(
    path.join(schemasDir, HELPERS_FILE_NAME),
    getAtaHelpersFileContent(),
  );

  const limit = pLimit(concurrency);
  const resolvedSchemas = openApiDoc.components?.schemas ?? {};

  profiler?.start("schemas:ata-components");
  const componentPromises = generateAtaComponentSchemas(
    openApiDoc,
    schemasDir,
    limit,
    extraProps,
    resolvedSchemas,
  );
  const componentEntries = (await Promise.all(componentPromises)).flat();
  profiler?.end("schemas:ata-components");

  profiler?.start("schemas:ata-requests");
  const requestSchemas = extractRequestSchemas(openApiDoc);
  const requestPromises = generateAtaRequestSchemas(
    requestSchemas,
    schemasDir,
    limit,
    extraProps,
    resolvedSchemas,
  );
  const requestEntries = (await Promise.all(requestPromises)).flat();
  profiler?.end("schemas:ata-requests");

  profiler?.start("schemas:ata-responses");
  const responseSchemas = extractResponseSchemas(openApiDoc);
  const responsePromises = generateAtaResponseSchemas(
    responseSchemas,
    schemasDir,
    limit,
    extraProps,
    resolvedSchemas,
  );
  const responseEntries = (await Promise.all(responsePromises)).flat();
  profiler?.end("schemas:ata-responses");

  profiler?.start("schemas:ata-parameters");
  const operationParameters = extractOperationParameters(openApiDoc);
  const parameterPromises = operationParameters.map((paramMeta) =>
    limit(async () => {
      await writeAtaParameterSchemaFile(
        schemasDir,
        paramMeta.operationId,
        paramMeta,
        {
          extraProps,
        },
      );
      return [buildParameterSchemaIndexEntry(paramMeta)];
    }),
  );
  const parameterEntries = (await Promise.all(parameterPromises)).flat();
  profiler?.end("schemas:ata-parameters");

  // Generate schema index
  profiler?.start("schemas:ata-index");
  const allEntries = [
    ...componentEntries,
    ...requestEntries,
    ...responseEntries,
    ...parameterEntries,
  ];
  await generateSchemaIndex(schemasDir, allEntries);
  profiler?.end("schemas:ata-index");

  /* eslint-disable-next-line no-console */
  console.log("✅ Schemas generated successfully (ata-validator)");
}

function generateAtaComponentSchemas(
  openApiDoc: OpenAPIObject,
  schemasDir: string,
  limit: ReturnType<typeof pLimit>,
  extraProps: ExtraPropsMode,
  resolvedSchemas: Record<string, unknown>,
): Promise<SchemaIndexEntry[]>[] {
  const promises: Promise<SchemaIndexEntry[]>[] = [];

  if (!openApiDoc.components?.schemas) {
    return promises;
  }

  for (const [name, schema] of Object.entries(openApiDoc.components.schemas)) {
    if (!isPlainSchemaObject(schema)) {
      /* eslint-disable-next-line no-console */
      console.warn(
        `⚠️ ${name}: not a plain schema object, generating fallback`,
      );
      const sanitizedName = sanitizeIdentifier(name);
      const promise = limit(async () => {
        const content = generateAtaFallbackContent(sanitizedName, schema);
        const fileName = `${sanitizedName}.ts`;
        await fs.writeFile(path.join(schemasDir, fileName), content);
        return [buildSchemaFileIndexEntry(fileName)];
      });
      promises.push(promise);
      continue;
    }

    const sanitizedName = sanitizeIdentifier(name);
    const description = (schema as SchemaObject).description?.trim();

    const promise = limit(async () => {
      const schemaFile = await generateAtaSchemaFile(
        sanitizedName,
        schema as SchemaObject,
        {
          description,
          extraProps,
          resolvedSchemas: resolvedSchemas as Record<string, unknown>,
        },
      );

      await writeSchemaFileWithAuxiliary(schemasDir, schemaFile);

      const entries = [buildSchemaFileIndexEntry(schemaFile.fileName)];

      if (schemaFile.variantFiles) {
        for (const variant of schemaFile.variantFiles) {
          await writeSchemaFileWithAuxiliary(schemasDir, variant);
          entries.push(buildSchemaFileIndexEntry(variant.fileName));
        }
      }

      return entries;
    });
    promises.push(promise);
  }

  return promises;
}

function generateAtaRequestSchemas(
  schemaMap: Map<string, SchemaObject>,
  schemasDir: string,
  limit: ReturnType<typeof pLimit>,
  extraProps: ExtraPropsMode,
  resolvedSchemas: Record<string, unknown>,
): Promise<SchemaIndexEntry[]>[] {
  const promises: Promise<SchemaIndexEntry[]>[] = [];

  for (const [name, schema] of schemaMap) {
    const promise = limit(async () => {
      const schemaFile = await generateAtaRequestSchemaFile(name, schema, {
        extraProps,
        resolvedSchemas: resolvedSchemas as Record<string, unknown>,
      });
      await writeSchemaFileWithAuxiliary(schemasDir, schemaFile);
      return [buildSchemaFileIndexEntry(schemaFile.fileName)];
    });
    promises.push(promise);
  }

  return promises;
}

function generateAtaResponseSchemas(
  schemaMap: Map<string, SchemaObject>,
  schemasDir: string,
  limit: ReturnType<typeof pLimit>,
  extraProps: ExtraPropsMode,
  resolvedSchemas: Record<string, unknown>,
): Promise<SchemaIndexEntry[]>[] {
  const promises: Promise<SchemaIndexEntry[]>[] = [];

  for (const [name, schema] of schemaMap) {
    const promise = limit(async () => {
      const schemaFile = await generateAtaResponseSchemaFile(name, schema, {
        extraProps,
        resolvedSchemas: resolvedSchemas as Record<string, unknown>,
      });
      await writeSchemaFileWithAuxiliary(schemasDir, schemaFile);
      return [buildSchemaFileIndexEntry(schemaFile.fileName)];
    });
    promises.push(promise);
  }

  return promises;
}

interface SchemaFileWithAuxiliary {
  auxiliaryFiles?: Array<{ content: string; fileName: string }>;
  content: string;
  fileName: string;
}

async function writeSchemaFileWithAuxiliary(
  schemasDir: string,
  schemaFile: SchemaFileWithAuxiliary,
): Promise<void> {
  await fs.writeFile(
    path.join(schemasDir, schemaFile.fileName),
    schemaFile.content,
  );

  if (schemaFile.auxiliaryFiles) {
    for (const aux of schemaFile.auxiliaryFiles) {
      await fs.writeFile(path.join(schemasDir, aux.fileName), aux.content);
    }
  }
}
