This package generates a typed API client and React Query hooks from an OpenAPI
spec using Apical TS generators.

Quick start:

1. Install dependencies at repo root:

```bash
pnpm install
```

2. Generate client + hooks:

```bash
pnpm run generate
```

3. You can also run only the client or only the hooks generator from top-level:

```bash
pnpm --filter @apical-ts/react-query-hooks --workspace run generate
```

4. Example React usage is at `./example/Usage.tsx`.

Notes:

- The hooks generator emits typed hooks that derive input and return types from
  the generated client operations.
- It emits `useX` query hooks for GET/HEAD operations and `useXMutation`
  mutation hooks for other methods.
