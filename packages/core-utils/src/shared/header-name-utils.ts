import type { ParameterObject } from "openapi3-ts/oas31";

/**
 * Silly logic due to some APIs specs having malformed header names
 * with extra quotes, e.g. "'X-API-Key'".
 *
 * e.g., https://openapi.vercel.sh/
 */
export function normalizeHeaderName(name: string): string {
  let normalized = name.trim();

  while (
    normalized.length > 1 &&
    normalized.startsWith("'") &&
    normalized.endsWith("'")
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized.length > 0 ? normalized : name;
}

export function normalizeHeaderParameter(
  parameter: ParameterObject,
): ParameterObject {
  if (parameter.in !== "header") {
    return parameter;
  }

  const normalizedName = normalizeHeaderName(parameter.name);
  if (normalizedName === parameter.name) {
    return parameter;
  }

  return {
    ...parameter,
    name: normalizedName,
  };
}
