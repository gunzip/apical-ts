import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export async function readTextFile(filePath: string) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

export async function writeFileIfChanged(filePath: string, content: string) {
  const existingContent = await readTextFile(filePath);

  if (existingContent === content) {
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}
