# Framework Integrations

Apical TS generates fully-typed Zod schemas and operation-based clients that can
be easily adapted to any JavaScript/TypeScript framework. The generated route
schemas provide runtime validation and type safety, making it straightforward to
integrate with your preferred libraries.

## Key Benefits

- **Framework Agnostic**: Use the same generated schemas across different
  frameworks
- **Type Safety**: Full TypeScript support with inferred types from OpenAPI
  specs
- **Runtime Validation**: Zod schemas ensure data integrity at runtime
- **Operation-Based**: Each API operation is a separate, composable function

## Example Integrations

We provide complete working examples for three popular frameworks in the
[`examples/`](https://github.com/gunzip/apical-ts/tree/main/examples/) folder:

### React Query Hooks

The
[React Query integration](https://github.com/gunzip/apical-ts/tree/main/examples/react-query-hooks/)
generates typed React Query hooks directly from your OpenAPI specification.

**Features:**

- `useX` query hooks for GET/HEAD operations
- `useXMutation` hooks for POST/PUT/PATCH/DELETE operations
- Automatic type inference from generated client operations
- Error handling and loading states built-in

```typescript
// Generated hook usage
const { data, isLoading, error } = useFindPetsByStatus({
  query: { status: "available" },
});
```

### Express Server Wrappers

The
[Express integration](https://github.com/gunzip/apical-ts/tree/main/examples/express/)
demonstrates how to create type-safe Express servers using generated route
wrappers.

**Features:**

- Automatic request/response validation
- Type-safe route handlers
- Mock server support with realistic data generation
- Full OpenAPI compliance

```typescript
// Generated route wrapper
<<<<<<< HEAD
createExpressAdapter(findPetsByStatusRoute(), findPetsByStatusHandler)(app);
=======
app.get("/pets", createExpressAdapter(findPetsByStatusRoute));
>>>>>>> df0a174c50668113ffbce48279e19bb824d7b7e0
```

### MSW Mock Server

The
[MSW integration](https://github.com/gunzip/apical-ts/tree/main/examples/msw-mock-server/)
shows how to create fully functional mock APIs using Mock Service Worker.

**Features:**

- HTTP request interception
- Auto-generated mock data using zocker
- Request validation against OpenAPI schemas
- Support for all response status codes

```typescript
// MSW handler from generated route
const handlers = [createMswHandler(findPetsByStatusRoute)];
```

## Adapting to Other Frameworks

The generated Zod schemas and operation functions are designed to be
framework-agnostic. Here's how you can adapt them:

1. **Use the generated schemas** for validation in your framework's middleware
2. **Compose the operation functions** with your framework's request/response
   handling
3. **Leverage the type definitions** for full TypeScript support

Each integration follows a similar adapter pattern:

- Import the generated route schemas and operations
- Create framework-specific adapters that handle requests/responses
- Apply validation and type safety at the framework layer

## Getting Started

To explore these integrations:

1. Clone the repository
2. Navigate to the desired example: `cd examples/[framework]`
3. Install dependencies: `pnpm install`
4. Generate the code: `pnpm run generate`
5. Run the example using the command documented in that example's README (for MSW: `pnpm dev`).

The examples include comprehensive documentation and working code you can adapt
for your own projects.
