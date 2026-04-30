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
  const paramNameMap: Record<string, string> = {};
  const honoPath = routePath.replaceAll(/\{([^}]+)\}/g, (_, raw) => {
    const sanitized = sanitizeParamName(raw);
    paramNameMap[raw] = sanitized;
    return `:${sanitized}`;
  });

  return {
    honoPath,
    paramNameMap,
  };
}
