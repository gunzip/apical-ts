import { toCamelCase } from "./naming.js";

function sanitizeParamName(value: string) {
  return value.replaceAll(/[^a-zA-Z0-9_]/g, "_");
}

export function createFallbackOperationId(method: string, routePath: string) {
  return toCamelCase(
    `${method} ${routePath
      .replaceAll("{", " ")
      .replaceAll("}", " ")
      .replaceAll("/", " ")}`,
  );
}

export function hasCustomParamNames(paramNameMap: Record<string, string>) {
  return Object.entries(paramNameMap).some(([original, sanitized]) => {
    return original !== sanitized;
  });
}

export function toHonoPath(routePath: string) {
  const paramNameMap = Object.create(null) as Record<string, string>;
  const rawParamNamesBySanitizedName = Object.create(null) as Record<
    string,
    string
  >;
  const honoPath = routePath.replaceAll(/\{([^}]+)\}/g, (_, raw) => {
    const sanitized = sanitizeParamName(raw);

    const existingRaw = rawParamNamesBySanitizedName[sanitized];
    if (existingRaw !== undefined && existingRaw !== raw) {
      throw new Error(
        `Route path "${routePath}" contains parameter names "${existingRaw}" and "${raw}" that both sanitize to "${sanitized}" for Hono.`,
      );
    }

    rawParamNamesBySanitizedName[sanitized] = raw;
    paramNameMap[raw] = sanitized;
    return `:${sanitized}`;
  });

  return {
    honoPath,
    paramNameMap,
  };
}
