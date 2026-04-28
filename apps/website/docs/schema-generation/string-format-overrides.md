---
id: string-format-overrides
title: String Format Overrides
description:
  Replace OpenAPI string format handling with imported custom Zod schemas by
  using the --format CLI option.
keywords:
  [
    string format overrides,
    OpenAPI format,
    custom Zod schemas,
    schema generation,
    CLI,
  ]
---

# String Format Overrides

`@apical-ts/craft` can replace the built-in handling of an OpenAPI
`type: string` + `format` combination with your own Zod schema.

This is useful when a format in your API represents a domain-specific value
such as a tax code, customer ID, slug, or branded UUID that should be validated
by a custom schema instead of the default string-format mapping.

## CLI Syntax

Use the repeatable `--format` option:

```bash
npx @apical-ts/craft generate \
  --client \
  --server \
  -i openapi.yaml \
  -o generated \
  --format <format>=<module-or-path>[#<export>]
```

Examples:

```bash
npx @apical-ts/craft generate \
  --client \
  --server \
  -i openapi.yaml \
  -o generated \
  --format tax-code=./src/zod/TaxCode.ts \
  --format uuid=@acme/domain-schemas#Uuid
```

- `<format>` must match the OpenAPI `format` value exactly
- `<module-or-path>` accepts package specifiers and explicit project paths
- `#<export>` is optional; when omitted, `craft` infers the export name from
  the last module or path segment
- `--format` can be provided multiple times

## Example

OpenAPI schema:

```yaml
components:
  schemas:
    Profile:
      type: object
      properties:
        fiscalCode:
          type: string
          format: tax-code
      required:
        - fiscalCode

paths:
  /profiles/{taxCode}:
    get:
      operationId: getProfileByTaxCode
      parameters:
        - in: path
          name: taxCode
          required: true
          schema:
            type: string
            format: tax-code
```

Custom Zod schema:

```ts
import * as z from "zod";

export const TaxCode = z.union([z.literal("TAX-001"), z.literal("TAX-002")]);
export type TaxCode = z.infer<typeof TaxCode>;
```

Generation command:

```bash
npx @apical-ts/craft generate \
  --client \
  --routes \
  --server \
  -i openapi.yaml \
  -o generated \
  --format tax-code=./src/zod/TaxCode.ts
```

## What Gets Generated

When a field or parameter matches the configured format:

1. The generated schema file imports your custom Zod schema.
2. The matching property or parameter reuses that schema instead of the
   built-in string-format logic.
3. The resulting type flows through generated schemas, routes, client
   operations, and server wrappers.

For the example above, both `Profile.fiscalCode` and the `taxCode` path
parameter will use `TaxCode` end-to-end.

## Import Sources

You can import overrides from:

- **A package or module specifier**

  ```bash
  --format uuid=@acme/domain-schemas#Uuid
  ```

- **A project path**

  ```bash
  --format tax-code=./src/zod/TaxCode.ts
  ```

If you omit `#<export>`, `craft` infers the export name automatically:

- `./src/zod/TaxCode.ts` → `TaxCode`
- `@acme/domain-schemas/Uuid` → `Uuid`

## Validation Rules

The CLI validates overrides before generation starts:

- duplicate mappings for the same format are rejected
- empty format names are rejected
- invalid export names are rejected
- an import target ending with `#` is rejected
- ambiguous mappings that would generate the same internal reference are
  rejected

## Behavior Notes

- The override applies only to matching OpenAPI `type: string` formats
- Once a mapping matches, the generated code delegates validation to your custom
  schema
- Built-in string-format constraints are not combined with the custom schema for
  that field

## Related Pages

- [CLI Usage](../cli-usage.md)
- [Supported Features](../supported-features.md)
