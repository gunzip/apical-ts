import type { BodyValidatorDefinition } from "./types.js";

function isJsonContentType(contentType: string) {
  return contentType === "application/json" || contentType.endsWith("+json");
}

function isFormContentType(contentType: string) {
  return (
    contentType === "application/x-www-form-urlencoded" ||
    contentType === "multipart/form-data"
  );
}

function toRequestBodyValidatorTarget(contentType: string) {
  if (isJsonContentType(contentType)) {
    return "json" as const;
  }

  if (isFormContentType(contentType)) {
    return "form" as const;
  }

  return undefined;
}

export function getBodyValidators(requestMap: Record<string, unknown>) {
  return Object.keys(requestMap).flatMap((contentType) => {
    const target = toRequestBodyValidatorTarget(contentType);

    if (target === undefined) {
      return [];
    }

    return [{ contentType, target }] satisfies BodyValidatorDefinition[];
  });
}
