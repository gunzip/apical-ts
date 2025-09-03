# Define Configuration

The generated client operations require configuration to specify how to connect
to your API. This includes the base URL, authentication, custom headers, and
other options that control how requests are made.

## Using the Default Configuration

Operations will use a **default configuration** if you don't pass a config
object and you haven't overridden it with `configureOperations` (see
[Binding Configuration to Operations](#binding-configuration-to-operations)).

```typescript
const result = await getPetById({ petId: "123" });
```

By default `baseURL` is set to the first server found in the OpenAPI
specification.

## Binding Configuration to Operations

You can use the `configureOperations` helper to bind a configuration object to
one or more generated operations, so you don't have to pass the config each
time. The method returns a new object with the same operations, but with the
provided config applied.

```typescript
import * as operations from "./generated/client/index.js";
import { configureOperations } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer <your-token>",
  },
};

// You may consider to only pass operations you use
const client = configureOperations(operations, apiConfig);

// Now you can call operations without passing config:
const pet = await client.getPetById({ petId: "123" });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});
```

:::tip

When using a configured client object, always call operations on this new object
rather than directly on the original imported methods. To prevent confusion or
accidental misuse, consider aliasing the imported operations if you import them
individually.

:::

```typescript
import { getPetById as _getPetById } from "./generated/client/getPetById.js";
import { createPet as _createPet } from "./generated/client/createPet.js";
import { configureOperations } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer <your-token>",
  },
};

const client = configureOperations(
  { getPetById: _getPetById, createPet: _createPet },
  apiConfig,
);

// You won't forget to call operations on the client object now
const pet = await client.getPetById({ petId: "123" });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});
```

You can still override the configuration for individual operations, passing it
as the second argument. Useful, for example, when you have to change the headers
for a specific request.

## Basic Configuration

### Minimal Configuration

```typescript
import { getPetById, createPet } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
};
```

### Complete Configuration

```typescript
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
    "X-Custom-Header": "custom-value",
  },
  forceValidation: true,
  deserializers: {
    "application/json": (data) => data,
    "application/xml": (data) => {
      const parser = new DOMParser();
      return parser.parseFromString(data, "application/xml");
    },
  },
};
```

## Configuration Options

### baseURL

**Type**: `string`  
**Required**: Yes

The base URL for your API. All operation paths will be appended to this URL.

```typescript
const config = {
  baseURL: "https://api.example.com/v1",
  // Other options...
};

// getPetById with petId "123" will call:
// https://api.example.com/v1/pets/123
```

### fetch

**Type**: `typeof fetch`  
**Required**: Yes

The fetch function to use for making HTTP requests. This allows you to:

- Use different fetch implementations (node-fetch, undici, etc.)
- Add request/response interceptors
- Configure timeouts and retries
- Add logging or metrics

```typescript
// Browser environment
const config = {
  fetch: window.fetch,
  // Other options...
};

// Node.js environment
import { fetch } from "undici";
const config = {
  fetch: fetch,
  // Other options...
};

// Custom fetch with interceptors
const customFetch = async (url, options) => {
  console.log(`Making request to ${url}`);
  const response = await fetch(url, options);
  console.log(`Response status: ${response.status}`);
  return response;
};

const config = {
  fetch: customFetch,
  // Other options...
};
```

### headers

**Type**: `Record<string, string>`  
**Required**: No  
**Default**: `{}`

Default headers to include with every request. Common use cases include:

- Authentication tokens
- Content-Type specifications
- Custom application headers
- API keys

```typescript
const config = {
  headers: {
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Key": "your-api-key",
    "User-Agent": "MyApp/1.0.0",
  },
  // Other options...
};
```

:::tip

Headers defined in the configuration can be overridden on a per-operation basis
if needed.

:::

### forceValidation

**Type**: `boolean`  
**Required**: No  
**Default**: `false`

When `true`, forces validation of response data even when the operation would
normally skip it. This is useful for:

- Development environments where you want strict validation
- Testing scenarios where you need to ensure response correctness
- APIs that might return unexpected data structures

```typescript
const config = {
  forceValidation: true,
  // Other options...
};
```

See the [Response Payload Validation](response-payload-validation) documentation
for more details.

### deserializers

**Type**: `Record<string, (data: unknown) => unknown>`  
**Required**: No  
**Default**: `{}`

Custom deserializers for specific content types. This allows you to transform
response data before validation occurs.

See the [Custom Response Deserialization](custom-response-deserialization)
documentation for more details.

## Next Steps

- Learn how to [call operations](call-operations) using your configuration
- Explore the custom response deserialization documentation for advanced
  scenarios
