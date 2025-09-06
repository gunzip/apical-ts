# Content Type Discrimination with Forced Validation

This modification enhances the client generator to provide better type
discrimination based on content type when using `forceValidation: true`.

## What Changed

Previously, when `forceValidation` was enabled, the response structure was:

```typescript
const forcedResult = {
  isValid: true as const,
  status: 200 as const,
  data,
  response,
  parsed: parseResult.parsed, // Only the parsed data
};
```

Now, the response structure includes both the parsed data and the content type:

```typescript
const forcedResult = {
  isValid: true as const,
  status: 200 as const,
  data,
  response,
  parsed: {
    data: parseResult.parsed,
    contentType: parseResult.contentType,
  },
};
```

## Benefits

This change allows developers to:

1. **Discriminate types based on content type**: When an API endpoint returns
   different types for different content types, you can now discriminate the
   actual type based on the `contentType` field.

2. **Type-safe content type handling**: TypeScript can now properly infer the
   type of the parsed data based on the content type.

3. **Better IntelliSense support**: IDEs can provide better autocomplete and
   type checking when working with multi-content-type responses.

## Example Usage

```typescript
import { testMultiContentTypes } from "./generated/client/testMultiContentTypes.js";

const config = {
  baseURL: "https://api.example.com",
  fetch: fetch,
  headers: {},
  forceValidation: true as const,
};

const result = await testMultiContentTypes(
  {
    body: { id: "123", name: "Test" },
    contentType: {
      request: "application/json",
      response: "application/json", // Could also be "application/xml" etc.
    },
  },
  config
);

if (result.isValid) {
  // Now you can discriminate based on content type!
  switch (result.parsed.contentType) {
    case "application/json":
      // result.parsed.data is properly typed for JSON
      console.log("JSON data:", result.parsed.data);
      break;

    case "application/xml":
      // result.parsed.data is properly typed for XML
      console.log("XML data:", result.parsed.data);
      break;

    default:
      console.log("Unknown content type:", result.parsed.contentType);
  }
}
```

## Type Definition Changes

The `ApiResponseWithForcedParse` type was updated from:

```typescript
export type ApiResponseWithForcedParse<
  S extends number | "default",
  Map extends Record<string, Record<string, any>>,
> = {
  readonly isValid: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parsed: \`\${S}\` extends keyof Map
    ? z.infer<Map[\`\${S}\`][keyof Map[\`\${S}\`]]>
    : never;
};
```

To:

```typescript
export type ApiResponseWithForcedParse<
  S extends number | "default",
  Map extends Record<string, Record<string, any>>,
> = {
  readonly isValid: true;
  readonly status: S;
  readonly data: unknown;
  readonly response: Response;
  readonly parsed: \`\${S}\` extends keyof Map
    ? {
        [K in keyof Map[\`\${S}\`]]: {
          data: z.infer<Map[\`\${S}\`][K]>;
          contentType: K;
        };
      }[keyof Map[\`\${S}\`]]
    : never;
};
```

## Backward Compatibility

This is a **breaking change** for code that was previously accessing
`result.parsed` directly as the parsed data. You'll need to update your code to
access `result.parsed.data` instead.

Before:

```typescript
if (result.isValid) {
  const userData = result.parsed; // This was the parsed user data directly
}
```

After:

```typescript
if (result.isValid) {
  const userData = result.parsed.data; // Now you need to access .data
  const contentType = result.parsed.contentType; // And you get contentType for free
}
```

## Files Modified

- `apps/craft/src/client-generator/templates/config-templates.ts`: Updated
  `ApiResponseWithForcedParse` type
- `apps/craft/src/client-generator/templates/response-templates.ts`: Updated
  forced result generation
- Various test files to reflect the new structure

## Testing

All existing tests have been updated and new tests have been added to verify the
content type discrimination functionality works correctly.
