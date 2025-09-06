# Handling Multiple Content Types

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
  const r = await updatePet(
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

  if (!r.isValid) {
    console.error("Error:", r.error);
    return r.error;
  }

  if (r.status === 200) {
    console.log("Raw data:", r.data);
    if (r.parsed.contentType == "application/xml") {
      // Only here we can access the parsed XML data properties!
      console.log("Parsed XML data (name):", r.parsed.data.name);
    } else if (r.parsed.contentType == "application/json") {
      // Shouldn't happen since we requested XML, but who knows!
      console.log("Parsed JSON data (name):", r.parsed.data.name);
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

## Content Type Discrimination with Forced Validation

When using `forceValidation: true` (the default), the response structure
provides enhanced type discrimination based on content type. Instead of just the
parsed data, you get both the data and the content type in a structured format:

```ts
const result = await updatePet({
  body: { name: "Fluffy", id: 1, photoUrls: [] },
  contentType: { response: "application/xml" },
});

if (result.isValid && result.status === 200) {
  // With forceValidation=true (default)
  // parsed field contains both data and contentType
  const { data, contentType } = result.parsed;

  // Now you can discriminate types based on content type
  switch (contentType) {
    case "application/json":
      // TypeScript knows 'data' is the JSON schema type
      console.log("JSON pet:", data.name);
      break;
    case "application/xml":
      // TypeScript knows 'data' is the XML schema type
      console.log("XML pet:", data.name);
      break;
    default:
      console.log("Unknown content type:", contentType);
  }
}
```

This feature enables type-safe content type discrimination, allowing you to
handle different response formats with full TypeScript support. If the schemas
for all supported content types are identical, your code can safely handle the
response without discriminating by content type.

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

## Best Practices

1. **Provide deserializers** for non-JSON content types
1. **Handle all possible response content types** in your code
1. **Use type guards** to safely access content-type-specific data
1. **Test with all supported content types** to ensure compatibility
