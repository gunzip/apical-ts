import { promises as fs } from "node:fs";
import path from "node:path";

import { writeTypeScriptFile } from "../core-generator/file-writer.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";

export interface SanitizedOperationEntry {
  operationId: string;
  sanitizedOperationId: string;
}

export async function createOutputSubdirectory(
  outputDir: string,
  directoryName: string,
): Promise<string> {
  const directoryPath = path.join(outputDir, directoryName);
  await fs.mkdir(directoryPath, { recursive: true });
  return directoryPath;
}

export function createSanitizedOperationEntries<
  T extends { operationId: string },
>(operations: readonly T[]): Array<T & SanitizedOperationEntry> {
  const seenOperationIds = new Map<string, string>();

  return operations.map((operation) => {
    const sanitizedOperationId = sanitizeIdentifier(operation.operationId);
    const conflictingOperationId =
      seenOperationIds.get(sanitizedOperationId) ?? null;

    if (conflictingOperationId !== null) {
      throw new Error(
        `Duplicate sanitized operation ID: ${operation.operationId} conflicts with ${conflictingOperationId}`,
      );
    }

    seenOperationIds.set(sanitizedOperationId, operation.operationId);
    return { ...operation, sanitizedOperationId };
  });
}

export function getOperationOutputFilePath(
  outputDir: string,
  operationId: string,
): string {
  return path.join(outputDir, `${sanitizeIdentifier(operationId)}.ts`);
}

export async function writeOperationModuleFile(
  outputDir: string,
  operationId: string,
  content: string,
): Promise<void> {
  await writeTypeScriptFile(
    getOperationOutputFilePath(outputDir, operationId),
    content,
  );
}
