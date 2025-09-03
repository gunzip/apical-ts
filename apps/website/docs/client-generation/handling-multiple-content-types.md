# Handling Multiple Content Types (Request & Response)

This generator fully supports OpenAPI endpoints that define multiple content
types for both requests and responses. For each operation, the generated client:

- Accepts a `contentType` property in the request parameters, with optional
  `request` and `response` keys, to specify which content type to use for the
  request and which to prefer (accept) for the response.
- Validates and parses the response according to the content type actually
  returned by the server.

## Example: Endpoint with Multiple Request Content Types

Suppose your OpenAPI spec defines an operation that accepts both
`application/json` and `application/x-www-form-urlencoded` for the request body
and may return either `application/json` or `application/xml` for the response:

```yaml
/pet:
  put:
    operationId: updatePet
    requestBody:
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Pet"
        application/xml:
          schema:
            $ref: "#/components/schemas/Pet"
      required: true
    responses:
      "200":
        description: Successful operation
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/Pet"
          application/xml:
            schema:
              $ref: "#/components/schemas/Pet"
      "400":
        description: Invalid ID supplied
      "404":
        description: Pet not found
      "422":
        description: Validation exception
      default:
        description: Unexpected error
```

The generated operation function will accept a `contentType` object to select
the body and/or response format:

```ts
// ../examples/client-examples/multi-content-types.ts#L5-L68

const parseXml = () => {
  // Implement XML deserialization logic here
  // For demonstration, returning a dummy object
  return {
    name: "Parsed Fluffy",
    id: 1,
    photoUrls: [
      "http://example.com/parsed_photo1.jpg",
      "http://example.com/parsed_photo2.jpg",
    ],
  };
};

async function demonstrateClient() {
  const ret = await updatePet(
    {
      body: {
        name: "Fluffy",
        id: 1,
        photoUrls: [
          "http://example.com/photo1.jpg",
          "http://example.com/photo2.jpg",
        ],
      },
      contentType: {
        // We Accept XML...
        response: "application/xml",
      },
    },
    {
      ...globalConfig,
      deserializers: {
        // ... so we try to deserialize XML
        "application/xml": parseXml,
      },
    },
  );

  if (!ret.isValid) {
    console.error("Error:", ret.error);
  } else if (ret.status === 200) {
    console.log("Raw data:", ret.data);
    const parsed = ret.parse();
    if (!isParsed(parsed)) {
      if (parsed.kind == "parse-error") {
        // Here we can handle Zod parsing errors
        // (if we want to)
        console.error(
          "Error: Cannot parse data",
          z.prettifyError(parsed.error),
        );
      } else {
        // All other error kind...
        console.error("Error:", parsed.error);
      }
    } else if (parsed.contentType == "application/xml") {
      // Only here we can access the parsed XML data properties!
      console.log("Parsed XML data (name):", parsed.parsed.name);
    } else if (parsed.contentType == "application/json") {
      // Shouldn't happen since we requested XML, but who knows!
      console.log("Parsed JSON data (name):", parsed.parsed.name);
    }
  }
}
```

## Content Type Selection

You can specify both request and response content types:

```ts
const result = await updatePet({
  body: "<foo>bar</foo>",
  contentType: {
    request: "application/xml",
    response: "application/xml",
  },
});
```

## Example: Endpoint with Multiple Response Content Types

For endpoints that can return different content types based on client
preferences:

```yaml
/document/{id}:
  get:
    operationId: getDocument
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      "200":
        description: Document content
        content:
          application/json:
            schema:
              type: object
              properties:
                title: { type: string }
                content: { type: string }
          application/pdf:
            schema:
              type: string
              format: binary
          text/plain:
            schema:
              type: string
```

## Type Safety with Content Types

The generated client provides type safety based on content types:

```ts
const result = await getDocument({
  path: { id: "doc123" },
  contentType: { response: "application/xml" },
});

if (result.isValid && result.status === 200) {
  const parsed = result.parse();
  if (isParsed(parsed)) {
    // TypeScript knows the structure based on content type
    if (parsed.contentType === "application/xml") {
      // parsed.parsed has the XML schema type
      console.log(parsed.parsed.title); // ✅ Type-safe
    }
  }
}
```

## Default Content Types

When no content type is specified:

- **Requests**: The first content type defined in the OpenAPI spec is used
- **Responses**: The client accepts any content type the server returns

```ts
// Uses default content types
const result = await updatePet({
  body: { name: "Fluffy", id: 1, photoUrls: [] },
});
```

## Error Handling with Multiple Content Types

Different content types may have different error response formats:

```ts
const result = await updatePet({
  body: petData,
  contentType: { response: "application/xml" },
});

if (!result.isValid) {
  console.error("Request failed:", result.error);
} else if (result.status === 400) {
  // Handle validation error - format depends on content type
  const parsed = result.parse();
  if (isParsed(parsed)) {
    if (parsed.contentType === "application/json") {
      console.error("JSON:", parsed.parsed);
    } else if (parsed.contentType === "application/xml") {
      console.error("XML:", parsed.parsed);
    }
  }
}
```

## Best Practices

1. **Provide deserializers** for non-JSON content types
1. **Handle all possible response content types** in your code
1. **Use type guards** to safely access content-type-specific data
1. **Test with all supported content types** to ensure compatibility

## Common Patterns

### File Upload with Multiple Formats

```ts
// Upload as multipart/form-data
const uploadResult = await uploadFile({
  file: fileData,
  contentType: { request: "multipart/form-data" },
});

// Upload as binary
const binaryResult = await uploadFile({
  file: fileData,
  contentType: { request: "application/octet-stream" },
});
```

### API Versioning via Content Type

```ts
// Use v1 API format
const v1Result = await getUser({
  id: "123",
  contentType: {
    request: "application/vnd.api.v1+json",
    response: "application/vnd.api.v1+json",
  },
});

// Use v2 API format
const v2Result = await getUser({
  id: "123",
  contentType: {
    request: "application/vnd.api.v2+json",
    response: "application/vnd.api.v2+json",
  },
});
```
