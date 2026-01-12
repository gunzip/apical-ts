/* OpenAPI parameter serialization utilities */

/*
 * Renders query, path and header parameter serialization utilities
 */
export function renderParameterSerializationUtilities(): string {
  return `/*
 * OpenAPI parameter serialization styles for different parameter types
 */
export type QueryParamStyle = "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
export type PathParamStyle = "simple" | "label" | "matrix";
export type HeaderParamStyle = "simple";

export interface QueryParamSerializationOptions {
  style?: QueryParamStyle;
  explode?: boolean;
}

export interface PathParamSerializationOptions {
  style?: PathParamStyle;
  explode?: boolean;
}

export interface HeaderParamSerializationOptions {
  style?: HeaderParamStyle;
  explode?: boolean;
}

function filterAndStringifyArray(value: unknown[]): string[] {
  return value
    .filter(item => item !== undefined && item !== null)
    .map(item => String(item));
}

function filterAndStringifyEntries(obj: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, String(v)]);
}

export function serializeQueryParam(
  paramName: string,
  value: unknown,
  options: QueryParamSerializationOptions = {}
): Array<[string, string]> {
  const { style = "form", explode = true } = options;

  if (value === undefined || value === null) {
    return [];
  }

  if (style === "deepObject" && typeof value === "object" && value !== null) {
    const entries = filterAndStringifyEntries(value as Record<string, unknown>);
    if (entries.length === 0) return [];
    return entries.map(([key, val]) => [\`\${paramName}[\${key}]\`, val]);
  }

  if (Array.isArray(value)) {
    if (explode) {
      return filterAndStringifyArray(value).map(item => [paramName, item]);
    } else {
      const items = filterAndStringifyArray(value);
      if (items.length === 0) return [];

      switch (style) {
        case "spaceDelimited":
          return [[paramName, items.join(" ")]];
        case "pipeDelimited":
          return [[paramName, items.join("|")]];
        case "form":
        default:
          return [[paramName, items.join(",")]];
      }
    }
  }

  if (typeof value === "object" && value !== null) {
    const entries = filterAndStringifyEntries(value as Record<string, unknown>);
    if (entries.length === 0) return [];

    if (explode) {
      return entries;
    } else {
      const flatValues = entries.flatMap(([k, v]) => [k, v]);
      switch (style) {
        case "spaceDelimited":
          return [[paramName, flatValues.join(" ")]];
        case "pipeDelimited":
          return [[paramName, flatValues.join("|")]];
        case "form":
        default:
          return [[paramName, flatValues.join(",")]];
      }
    }
  }

  return [[paramName, String(value)]];
}

/*
 * Serialize a single path parameter value according to OpenAPI 3.x specification.
 * Path parameters support simple, label, and matrix styles with explode behavior.
 */
export function serializePathParam(
  paramName: string,
  value: unknown,
  options: PathParamSerializationOptions = {}
): string {
  const { style = "simple", explode = false } = options;

  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    const items = filterAndStringifyArray(value);
    if (items.length === 0) return "";

    switch (style) {
      case "simple":
        return items.join(",");
      case "label":
        return explode ? \`.\${items.join(".")}\` : \`.\${items.join(",")}\`;
      case "matrix":
        return explode ? items.map(item => \`;\${paramName}=\${item}\`).join("") : \`;\${paramName}=\${items.join(",")}\`;
      default:
        return items.join(",");
    }
  }

  if (typeof value === "object" && value !== null) {
    const entries = filterAndStringifyEntries(value as Record<string, unknown>);
    if (entries.length === 0) return "";

    switch (style) {
      case "simple":
        return explode
          ? entries.map(([k, v]) => \`\${k}=\${v}\`).join(",")
          : entries.flatMap(([k, v]) => [k, v]).join(",");
      case "label":
        return explode
          ? \`.\${entries.map(([k, v]) => \`\${k}=\${v}\`).join(".")}\`
          : \`.\${entries.flatMap(([k, v]) => [k, v]).join(",")}\`;
      case "matrix":
        return explode
          ? entries.map(([k, v]) => \`;\${k}=\${v}\`).join("")
          : \`;\${paramName}=\${entries.flatMap(([k, v]) => [k, v]).join(",")}\`;
      default:
        return entries.flatMap(([k, v]) => [k, v]).join(",");
    }
  }

  switch (style) {
    case "label":
      return \`.\${String(value)}\`;
    case "matrix":
      return \`;\${paramName}=\${String(value)}\`;
    case "simple":
    default:
      return String(value);
  }
}

/*
 * Serialize a single header parameter value according to OpenAPI 3.x specification.
 * Header parameters only support simple style with explode behavior.
 */
export function serializeHeaderParam(
  paramName: string,
  value: unknown,
  options: HeaderParamSerializationOptions = {}
): string {
  const { explode = false } = options;

  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    const items = filterAndStringifyArray(value);
    if (items.length === 0) return "";
    return items.join(",");
  }

  if (typeof value === "object" && value !== null) {
    const entries = filterAndStringifyEntries(value as Record<string, unknown>);
    if (entries.length === 0) return "";

    return explode
      ? entries.map(([k, v]) => \`\${k}=\${v}\`).join(",")
      : entries.flatMap(([k, v]) => [k, v]).join(",");
  }

  return String(value);
}`;
}
