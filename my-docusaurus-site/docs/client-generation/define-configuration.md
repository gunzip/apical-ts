# Define Configuration

The generated client operations require configuration to specify how to connect to your API. This includes the base URL, authentication, custom headers, and other options that control how requests are made.

## Configuration Interface

The `ApiConfig` interface defines all available configuration options:

```typescript
interface ApiConfig {
  baseURL: string;
  fetch: typeof fetch;
  headers?: Record<string, string>;
  forceValidation?: boolean;
  deserializers?: Record<string, (data: unknown) => unknown>;
}
```

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
    "Authorization": "Bearer your-token",
    "Content-Type": "application/json",
    "X-Custom-Header": "custom-value",
  },
  forceValidation: false,
  deserializers: {
    "application/json": (data) => JSON.parse(data),
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
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-API-Key": "your-api-key",
    "User-Agent": "MyApp/1.0.0",
  },
  // Other options...
};
```

:::tip
Headers defined in the configuration can be overridden on a per-operation basis if needed.
:::

### forceValidation

**Type**: `boolean`  
**Required**: No  
**Default**: `false`

When `true`, forces validation of response data even when the operation would normally skip it. This is useful for:

- Development environments where you want strict validation
- Testing scenarios where you need to ensure response correctness
- APIs that might return unexpected data structures

```typescript
const config = {
  forceValidation: true,
  // Other options...
};
```

See [Response Payload Validation](response-payload-validation) for more details.

### deserializers

**Type**: `Record<string, (data: unknown) => unknown>`  
**Required**: No  
**Default**: `{}`

Custom deserializers for specific content types. This allows you to transform response data before validation occurs.

```typescript
const config = {
  deserializers: {
    // Parse XML responses
    "application/xml": (data) => {
      const parser = new DOMParser();
      return parser.parseFromString(data as string, "application/xml");
    },
    
    // Handle CSV data
    "text/csv": (data) => {
      return (data as string).split('\n').map(line => line.split(','));
    },
    
    // Custom JSON parsing with date handling
    "application/json": (data) => {
      return JSON.parse(data as string, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    },
  },
  // Other options...
};
```

See [Custom Response Deserialization](custom-response-deserialization) for more details.

## Environment-Specific Configuration

### Development Configuration

```typescript
const developmentConfig = {
  baseURL: "http://localhost:3000/api",
  fetch: fetch,
  headers: {
    "Authorization": "Bearer dev-token",
  },
  forceValidation: true, // Strict validation in development
};
```

### Production Configuration

```typescript
const productionConfig = {
  baseURL: "https://api.production.com/v1",
  fetch: fetch,
  headers: {
    "Authorization": `Bearer ${process.env.API_TOKEN}`,
    "X-API-Version": "2024-01-01",
  },
  forceValidation: false, // Performance optimization
};
```

### Configuration Factory

```typescript
function createApiConfig(environment: "development" | "production") {
  const baseConfig = {
    fetch: fetch,
    headers: {
      "Content-Type": "application/json",
    },
  };

  switch (environment) {
    case "development":
      return {
        ...baseConfig,
        baseURL: "http://localhost:3000/api",
        forceValidation: true,
      };
    case "production":
      return {
        ...baseConfig,
        baseURL: "https://api.production.com/v1",
        headers: {
          ...baseConfig.headers,
          "Authorization": `Bearer ${process.env.API_TOKEN}`,
        },
      };
  }
}

const config = createApiConfig(process.env.NODE_ENV);
```

## Advanced Configuration

### Request Timeouts

```typescript
const fetchWithTimeout = (timeout = 5000) => {
  return async (url, options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
};

const config = {
  baseURL: "https://api.example.com/v1",
  fetch: fetchWithTimeout(10000), // 10 second timeout
};
```

### Retry Logic

```typescript
const fetchWithRetry = (maxRetries = 3) => {
  return async (url, options) => {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok || i === maxRetries) {
          return response;
        }
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error;
        if (i === maxRetries) {
          throw error;
        }
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }

    throw lastError;
  };
};

const config = {
  baseURL: "https://api.example.com/v1",
  fetch: fetchWithRetry(3),
};
```

### Request/Response Logging

```typescript
const fetchWithLogging = (fetch) => {
  return async (url, options) => {
    console.log(`🔄 ${options?.method || 'GET'} ${url}`);
    console.log('📤 Request:', options);

    const start = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - start;

    console.log(`📥 Response: ${response.status} (${duration}ms)`);
    
    return response;
  };
};

const config = {
  baseURL: "https://api.example.com/v1",
  fetch: fetchWithLogging(fetch),
};
```

## Default Configuration

If you don't want to pass configuration to every operation call, you can use the default configuration:

```typescript
import { defaultConfig } from "./generated/client/index.js";

// Modify the default configuration
Object.assign(defaultConfig, {
  baseURL: "https://api.example.com/v1",
  headers: {
    "Authorization": "Bearer your-token",
  },
});

// Now you can call operations without passing config
const pet = await getPetById({ petId: "123" });
```

:::warning
Modifying the default configuration affects all operations that don't explicitly receive a config parameter. Use this approach carefully in shared codebases.
:::

## Next Steps

- Learn how to [call operations](call-operations) using your configuration
- Understand [binding configuration to operations](binding-configuration-to-operations) for better ergonomics
- Explore [custom response deserialization](custom-response-deserialization) for advanced scenarios