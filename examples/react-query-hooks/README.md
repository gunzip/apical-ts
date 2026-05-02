# React Query Hooks from Generated Client and Routes

This example shows a **contract-derived frontend integration**. Apical TS
generates the client operations once, then a second generator turns those
operations and route metadata into React Query hooks. No endpoint modeling is
duplicated in the frontend layer.

## Contract-first flow

1. `swagger.json` is the source contract.
2. `pnpm run generate:client` generates:
   - `generated/client/*`: typed operation functions
   - `generated/routes/*`: route metadata, including HTTP methods
   - `generated/schemas/*`: shared Zod schemas
3. `pnpm run generate:hooks` reads the generated client and routes and emits
   `generated/react-query-hooks/*`.
4. `example/Usage.tsx` consumes the generated hooks.

## Why this is dynamic reuse

- Hook names are derived from generated operation names.
- `GET` / `HEAD` operations become `useX` query hooks.
- Write operations become `useXMutation` hooks.
- The frontend never needs its own copy of route names, payload types, or
  response unions.

## Quick start

1. Install dependencies from the monorepo root:

   ```bash
   pnpm install
   ```

2. Generate the client and hooks:

   ```bash
   cd examples/react-query-hooks
   pnpm run generate
   ```

3. Build the example package:

   ```bash
   pnpm run build
   ```

See `example/Usage.tsx` for a minimal consumption example.

## Project layout

- `swagger.json`: the API contract
- `generated/client/*`: generated operation functions
- `generated/routes/*`: generated route metadata
- `scripts/generate-hooks.ts`: secondary generator that emits React Query hooks
- `generated/react-query-hooks/*`: generated hooks
- `example/Usage.tsx`: example component using the generated hooks

## Example prompt

Use a prompt like this when you want an LLM to generate hooks from Apical
artifacts without redesigning the API:

```text
You are working in examples/react-query-hooks.

Use `generated/client/index.ts` and `generated/routes/index.ts` as the only API
contract. Do not restate endpoints, payload types, or HTTP methods manually.

Generate or update React Query hooks so that:
- GET and HEAD operations become `useX` hooks
- POST, PUT, PATCH, and DELETE operations become `useXMutation` hooks
- hook names come from generated operation names
- parameter and result types come from the generated client functions
- output is written under `generated/react-query-hooks/*`
```

## Example usage

```tsx
const { data, isLoading, error } = useFindPetsByStatus({
  query: { status: ["available"] },
});
```

This is the same contract-first idea as the Hono and MSW examples, applied to a
frontend adapter instead of a server framework.
