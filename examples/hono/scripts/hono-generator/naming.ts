function splitIntoWords(value: string) {
  const normalizedValue = value
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  return normalizedValue === ""
    ? []
    : normalizedValue.split(/\s+/).filter((segment) => segment.length > 0);
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

export function toCamelCase(value: string) {
  const [firstSegment = "operation", ...remainingSegments] =
    splitIntoWords(value);

  return [
    firstSegment.toLowerCase(),
    ...remainingSegments.map((segment) => capitalize(segment)),
  ].join("");
}

export function toPascalCase(value: string) {
  const segments = splitIntoWords(value);

  if (segments.length === 0) {
    return "Operation";
  }

  return segments.map((segment) => capitalize(segment)).join("");
}
