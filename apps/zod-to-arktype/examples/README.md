# Examples

This directory contains example Zod schemas and their converted ArkType equivalents.

## Input (Zod Schemas)

The `input/` directory contains sample Zod v4 schemas:
- `User.ts` - Simple object with optional fields
- `ProductStatus.ts` - Enum example
- `Tags.ts` - Array example

## Converting

To convert these examples, run:

```bash
pnpm start convert -i examples/input -o examples/output
```

Or from the root:

```bash
pnpm --filter @apical-ts/zod-to-arktype start convert -i apps/zod-to-arktype/examples/input -o apps/zod-to-arktype/examples/output
```

## Output (ArkType Schemas)

The `output/` directory will contain the converted ArkType schemas with:
- Preserved JSDoc comments
- Proper type inference
- Import statements updated
- Export structure maintained
