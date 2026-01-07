/* eslint-disable no-console */
import type { OpenAPIObject } from "openapi3-ts/oas31";

import { promises as fs } from "fs";
import yaml from "js-yaml";

import {
  convertOpenAPI30to31,
  convertToOpenAPI31,
  isOpenAPI20,
  isOpenAPI30,
  isOpenAPI31,
} from "./converter.js";

/**
 * Parses an OpenAPI specification from a file path or URL and converts it to OpenAPI 3.1
 */
export async function parseOpenAPI(
  filePathOrUrl: string,
): Promise<OpenAPIObject> {
  const fileContent = await fetchContent(filePathOrUrl);
  const extension = getFileExtension(filePathOrUrl);

  let parsed: unknown;

  if (extension === "yaml" || extension === "yml") {
    parsed = yaml.load(fileContent);
  } else if (extension === "json") {
    parsed = JSON.parse(fileContent);
  } else {
    // For URLs without clear extension, try to parse as YAML first, then JSON
    if (isUrl(filePathOrUrl)) {
      try {
        parsed = yaml.load(fileContent);
      } catch {
        try {
          parsed = JSON.parse(fileContent);
        } catch {
          throw new Error(
            `Unable to parse content from ${filePathOrUrl} as YAML or JSON`,
          );
        }
      }
    } else {
      throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  // Automatically convert to OpenAPI 3.1 regardless of input version
  if (isOpenAPI20(parsed)) {
    console.log(
      "🔄 Detected OpenAPI 2.0 (Swagger) specification, converting to 3.1.0...",
    );
    parsed = await convertToOpenAPI31(parsed);
    console.log("✅ Successfully converted from OpenAPI 2.0 to 3.1.0");
  } else if (isOpenAPI30(parsed)) {
    console.log(
      "🔄 Detected OpenAPI 3.0.x specification, converting to 3.1.0...",
    );
    parsed = convertOpenAPI30to31(parsed);
    console.log("✅ Successfully converted to OpenAPI 3.1.0");
  } else if (isOpenAPI31(parsed)) {
    console.log(
      "✅ OpenAPI 3.1.x specification detected, no conversion needed",
    );
  } else {
    console.warn("⚠️ Unknown OpenAPI version, proceeding without conversion");
  }

  return parsed as OpenAPIObject;
}

/**
 * Fetches content from a URL or reads from a local file
 */
async function fetchContent(input: string): Promise<string> {
  if (isUrl(input)) {
    console.log(`🌐 Fetching OpenAPI specification from: ${input}`);
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from ${input}: ${response.status} ${response.statusText}`,
      );
    }
    return await response.text();
  } else {
    return await fs.readFile(input, "utf-8");
  }
}

/**
 * Extracts file extension from a path or URL
 */
function getFileExtension(input: string): string | undefined {
  // For URLs, check Content-Type or URL path
  if (isUrl(input)) {
    const url = new URL(input);
    const pathname = url.pathname;
    return pathname.split(".").pop()?.toLowerCase();
  } else {
    return input.split(".").pop()?.toLowerCase();
  }
}

/**
 * Checks if the input string is a valid URL
 */
function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}
