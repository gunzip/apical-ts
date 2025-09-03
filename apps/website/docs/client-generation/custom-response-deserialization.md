# Custom Response Deserialization

For advanced scenarios (e.g. XML parsing, vendor-specific media types, binary
post-processing) you can provide custom deserializers through the config object.
The `parse()` method will automatically use these deserializers before schema
validation occurs.

Deserializers are methods that transform the raw response data into a format
suitable for validation. They can be defined for specific content types and are
applied automatically during the parsing process.

## Why use Deserializers?

- Apply transformations (e.g. date reviver, case normalization) prior to Zod
  validation
- Decode non‑JSON types (XML → JS object, CSV → array, binary → metadata)
- Gracefully handle vendor or unknown content types without modifying generated
  code

## Example of Custom Deserializers

```ts
{
  "application/xml": (data: unknown) => {
    // Custom XML parsing logic
    const xmlString = data as string;
    const nameMatch = /<name>([^<]+)<\/name>/u.exec(xmlString);
    const ageMatch = /<age>([^<]+)<\/age>/u.exec(xmlString);
    return {
      name: nameMatch?.[1] || "",
      age: Number(ageMatch?.[1]) || 0,
    };
  },
  "application/vnd.custom+json": (data: unknown) => {
    // Custom JSON transformation
    const obj = data as Record<string, unknown>;
    return {
      ...obj,
      id: String(obj.id).toUpperCase(),
      timestamp: new Date(),
    };
  },
}
```

## Basic Usage

```ts
const res = await testMultiContentTypes(
  {
    body: { id: "123", name: "Example" },
    contentType: { response: "application/xml" },
  },
  {
    ...globalConfig,
    // this can be merged into the global config object as well
    deserializers: {
      "application/xml": (raw: unknown) => customXmlToJson(raw as string),
      "application/octet-stream": (blob: unknown) => ({
        size: (blob as Blob).size,
      }),
    },
  },
);

if (res.isValid && res.status === 200) {
  const outcome = res.parse();
  if (isParsed(outcome)) {
    console.log(outcome.parsed);
  } else if (outcome.kind === "parse-error") {
    console.error("Validation failed", outcome.error);
  } else if (outcome.kind === "deserialization-error") {
    console.error("Deserializer threw", outcome.error);
  } else if (outcome.kind === "missing-schema") {
    console.warn("No schema for content type; raw value:", res.data);
  }
}
```

## Configuring Deserializers

The `deserializers` is a property of the config object that maps content types
to deserializer functions:

```ts
type Deserializer = (data: unknown, contentType?: string) => unknown;
type DeserializerMap = Record<string, Deserializer>;
```

When provided in the config, the raw response body is passed to your function
before schema validation. Whatever you return becomes the input to schema
validation (if a schema for that content type exists).

### Global Configuration

```ts
const globalConfig = {
  baseURL: "https://api.example.com",
  fetch: fetch,
  deserializers: {
    "application/xml": (data: unknown) => xmlParser.parse(data as string),
    "text/csv": (data: unknown) => csvParser.parse(data as string),
    "application/octet-stream": (blob: unknown) => ({
      size: (blob as Blob).size,
      type: (blob as Blob).type,
    }),
  },
};
```

### Per-Operation Configuration

```ts
const result = await getDocument(
  { docId: "123" },
  {
    ...globalConfig,
    deserializers: {
      ...globalConfig.deserializers,
      "application/pdf": (blob: unknown) => ({
        size: (blob as Blob).size,
        pages: estimatePageCount(blob as Blob),
      }),
    },
  },
);
```

## Returned Object Shapes

The result of `parse()` is a discriminated object you can pattern match on:

| Scenario                              | Shape                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Schema + validation success           | `{ contentType, parsed }`                                                   |
| Schema + validation failure           | `{ contentType, parseError }`                                               |
| Schema present but deserializer threw | `{ contentType, deserializationError }`                                     |
| No schema for content type            | `{ contentType, missingSchema: true, deserialized, deserializationError? }` |

Notes:

- If the deserializer throws, validation is skipped (you get
  `deserializationError`).
- If no schema exists, the transformed value is returned under `deserialized`
  and flagged with `missingSchema: true`.
- Content type normalization strips any charset parameters (e.g.
  `application/json; charset=utf-8` → `application/json`).

## Common Patterns

### 1. XML → JS

```ts
const outcome = res.parse();
// Uses deserializers from config:
// {
//   "application/xml": (xml: unknown) => fastXmlParser.parse(xml as string),
// }
```

### 2. Binary metadata

```ts
const outcome = res.parse();
// Uses deserializers from config:
// {
//   "application/octet-stream": (b: unknown) => ({ size: (b as Blob).size }),
// }
```

### 3. Vendor JSON normalization

```ts
const outcome = res.parse();
// Uses deserializers from config:
// {
//   "application/vnd.custom+json": (data: any) => ({
//     ...data,
//     id: String(data.id).toUpperCase(),
//   }),
// }
```

## Advanced Examples

### Date Parsing

```ts
const dateDeserializer = (data: unknown) => {
  const obj = JSON.parse(data as string);
  return {
    ...obj,
    createdAt: new Date(obj.createdAt),
    updatedAt: new Date(obj.updatedAt),
  };
};

const config = {
  ...globalConfig,
  deserializers: {
    "application/json": dateDeserializer,
  },
};
```

### CSV Processing

```ts
const csvDeserializer = (data: unknown) => {
  const csv = data as string;
  const lines = csv.split("\n").filter((line) => line.trim());
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return headers.reduce(
      (obj, header, index) => {
        obj[header.trim()] = values[index]?.trim() || "";
        return obj;
      },
      {} as Record<string, string>,
    );
  });
};

const config = {
  ...globalConfig,
  deserializers: {
    "text/csv": csvDeserializer,
    "application/csv": csvDeserializer,
  },
};
```

### Binary File Processing

```ts
const imageDeserializer = async (blob: unknown) => {
  const file = blob as Blob;
  const arrayBuffer = await file.arrayBuffer();

  return {
    size: file.size,
    type: file.type,
    width: extractImageWidth(arrayBuffer),
    height: extractImageHeight(arrayBuffer),
  };
};

const config = {
  ...globalConfig,
  deserializers: {
    "image/jpeg": imageDeserializer,
    "image/png": imageDeserializer,
  },
};
```

## Error Handling Summary

| Field                         | Meaning                                             |
| ----------------------------- | --------------------------------------------------- |
| Variant / Field               | Meaning                                             |
| ----------------------        | --------------------------------------------------- |
| `parsed`                      | Successfully deserialized & schema-validated data   |
| `kind: parse-error`           | Validation failed (`error` is a `ZodError`)         |
| `kind: deserialization-error` | Custom deserializer threw an exception              |
| `kind: missing-schema`        | No schema found for that content type               |

### Handling Deserialization Errors

```ts
const result = await getDocument({ docId: "123" });

if (result.isValid && result.status === 200) {
  const outcome = result.parse();

  if ("parsed" in outcome) {
    console.log("Success:", outcome.parsed);
  } else if (outcome.kind === "deserialization-error") {
    console.error("Deserializer failed:", outcome.error);
    // Fall back to raw data
    console.log("Raw data:", result.data);
  } else if (outcome.kind === "parse-error") {
    console.error("Schema validation failed:", outcome.error);
  } else if (outcome.kind === "missing-schema") {
    console.warn("No schema available, using raw data");
    // outcome.deserialized contains the transformed data
  }
}
```

## Best Practices

- Keep deserializers pure & fast—avoid performing network calls
- Return plain JS objects ready for validation; do not mutate globals
- Prefer adding schemas in the spec when possible (better type safety)
- Log or surface `deserializationError` for observability

### Performance Considerations

1. **Avoid heavy computations** in deserializers
2. **Cache parsed results** when appropriate
3. **Use streaming** for large files
4. **Handle errors gracefully** to prevent application crashes

### Testing Deserializers

```ts
// Test your deserializers independently
describe("XML Deserializer", () => {
  it("should parse valid XML", () => {
    const xml = "<user><name>John</name><age>30</age></user>";
    const result = xmlDeserializer(xml);
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("should handle invalid XML gracefully", () => {
    const invalidXml = "<user><name>John</age></user>";
    expect(() => xmlDeserializer(invalidXml)).not.toThrow();
  });
});
```
