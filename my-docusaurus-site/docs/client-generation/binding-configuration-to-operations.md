# Binding Configuration to Operations

Instead of passing configuration to every operation call, you can bind a configuration object to all operations using the `configureOperations` helper. This creates a more ergonomic API client with pre-configured operations.

## The configureOperations Helper

The `configureOperations` function takes your imported operations and a configuration object, returning a client where all operations are pre-configured:

```typescript
import * as operations from "./generated/client/index.js";
import { configureOperations } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    "Authorization": "Bearer your-token",
  },
};

// Create a configured client
const client = configureOperations(operations, apiConfig);

// Now you can call operations without passing config
const pet = await client.getPetById({ petId: "123" });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});
```

## Benefits of Binding Configuration

### Cleaner Code

**Without binding:**
```typescript
const pet = await getPetById({ petId: "123" }, apiConfig);
const orders = await getOrders({ limit: 10 }, apiConfig);
const user = await getUserById({ userId: "456" }, apiConfig);
```

**With binding:**
```typescript
const client = configureOperations(operations, apiConfig);

const pet = await client.getPetById({ petId: "123" });
const orders = await client.getOrders({ limit: 10 });
const user = await client.getUserById({ userId: "456" });
```

### Consistency

All operations automatically use the same configuration, ensuring consistent:
- Base URLs
- Authentication headers
- Timeout settings
- Custom deserializers
- Validation preferences

### Type Safety

The configured client maintains full type safety:

```typescript
const client = configureOperations(operations, apiConfig);

// TypeScript knows the exact parameter types
const pet = await client.getPetById({ petId: "123" }); // ✅ Correct
const invalid = await client.getPetById({ id: "123" }); // ❌ Type error
```

## Creating Client Classes

You can wrap the configured operations in a class for even better organization:

```typescript
import * as operations from "./generated/client/index.js";
import { configureOperations, type ApiConfig } from "./generated/client/index.js";

export class PetStoreClient {
  private client: ReturnType<typeof configureOperations>;

  constructor(config: ApiConfig) {
    this.client = configureOperations(operations, config);
  }

  // Pet operations
  async getPet(petId: string) {
    return this.client.getPetById({ petId });
  }

  async createPet(pet: { name: string; status: string }) {
    return this.client.createPet({ body: pet });
  }

  async updatePet(petId: string, updates: Partial<{ name: string; status: string }>) {
    return this.client.updatePet({ petId, body: updates });
  }

  // Order operations
  async getOrders(limit = 10) {
    return this.client.getOrders({ limit });
  }

  async createOrder(order: { petId: string; quantity: number }) {
    return this.client.createOrder({ body: order });
  }
}

// Usage
const client = new PetStoreClient({
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    "Authorization": "Bearer your-token",
  },
});

const pet = await client.getPet("123");
const order = await client.createOrder({ petId: "123", quantity: 2 });
```

## Selective Operation Binding

You can choose to bind only specific operations instead of all operations:

```typescript
import { 
  getPetById, 
  createPet, 
  updatePet,
  configureOperations 
} from "./generated/client/index.js";

// Only configure pet-related operations
const petOperations = { getPetById, createPet, updatePet };
const petClient = configureOperations(petOperations, apiConfig);

// Use the configured operations
const pet = await petClient.getPetById({ petId: "123" });
```

## Multiple Client Configurations

You can create multiple clients with different configurations for different environments or purposes:

```typescript
// Production client
const productionClient = configureOperations(operations, {
  baseURL: "https://api.production.com/v1",
  fetch: fetch,
  headers: {
    "Authorization": `Bearer ${process.env.PROD_TOKEN}`,
  },
});

// Development client with validation enabled
const developmentClient = configureOperations(operations, {
  baseURL: "http://localhost:3000/api",
  fetch: fetch,
  headers: {
    "Authorization": "Bearer dev-token",
  },
  forceValidation: true,
});

// Test client with mocked fetch
const testClient = configureOperations(operations, {
  baseURL: "https://api.test.com",
  fetch: mockFetch,
  headers: {},
});
```

## Overriding Configuration Per Operation

Even with bound configuration, you can still override settings for individual operations by passing a config as the second parameter:

```typescript
const client = configureOperations(operations, apiConfig);

// Use default configuration
const pet1 = await client.getPetById({ petId: "123" });

// Override configuration for this specific call
const pet2 = await client.getPetById(
  { petId: "456" },
  {
    ...apiConfig,
    headers: {
      ...apiConfig.headers,
      "X-Special-Header": "special-value",
    },
  }
);
```

## Factory Functions

Create factory functions to standardize client creation across your application:

```typescript
import { configureOperations } from "./generated/client/index.js";
import * as operations from "./generated/client/index.js";

export function createApiClient(environment: "development" | "production") {
  const config = {
    fetch: fetch,
    headers: {
      "Content-Type": "application/json",
    },
  };

  switch (environment) {
    case "development":
      return configureOperations(operations, {
        ...config,
        baseURL: "http://localhost:3000/api",
        forceValidation: true,
      });
    
    case "production":
      return configureOperations(operations, {
        ...config,
        baseURL: "https://api.production.com/v1",
        headers: {
          ...config.headers,
          "Authorization": `Bearer ${process.env.API_TOKEN}`,
        },
      });
  }
}

// Usage across your application
const client = createApiClient(process.env.NODE_ENV);
```

## Dependency Injection

Use configured clients with dependency injection frameworks:

### React Context

```typescript
import React, { createContext, useContext, ReactNode } from 'react';
import { configureOperations } from './generated/client/index.js';
import * as operations from './generated/client/index.js';

type ApiClient = ReturnType<typeof configureOperations>;

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({ children }: { children: ReactNode }) {
  const client = configureOperations(operations, {
    baseURL: process.env.REACT_APP_API_URL,
    fetch: fetch,
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  return (
    <ApiClientContext.Provider value={client}>
      {children}
    </ApiClientContext.Provider>
  );
}

export function useApiClient() {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error('useApiClient must be used within ApiClientProvider');
  }
  return client;
}

// Usage in components
function PetComponent({ petId }: { petId: string }) {
  const client = useApiClient();
  const [pet, setPet] = useState(null);

  useEffect(() => {
    client.getPetById({ petId }).then(result => {
      if (result.success) {
        setPet(result.data);
      }
    });
  }, [petId, client]);

  return <div>{pet ? pet.name : 'Loading...'}</div>;
}
```

### Service Container

```typescript
class ServiceContainer {
  private apiClient: ReturnType<typeof configureOperations>;

  constructor() {
    this.apiClient = configureOperations(operations, {
      baseURL: process.env.API_URL,
      fetch: fetch,
      headers: {
        'Authorization': `Bearer ${process.env.API_TOKEN}`,
      },
    });
  }

  getApiClient() {
    return this.apiClient;
  }

  // Other services...
  getUserService() {
    return new UserService(this.apiClient);
  }

  getPetService() {
    return new PetService(this.apiClient);
  }
}

class PetService {
  constructor(private client: ReturnType<typeof configureOperations>) {}

  async findPetById(id: string) {
    const result = await this.client.getPetById({ petId: id });
    if (result.success && result.status === 200) {
      return result.data;
    }
    throw new Error('Pet not found');
  }

  async createPet(pet: { name: string; status: string }) {
    const result = await this.client.createPet({ body: pet });
    if (result.success && result.status === 201) {
      return result.data;
    }
    throw new Error('Failed to create pet');
  }
}
```

## Testing with Bound Configuration

Bound configuration makes testing easier by allowing you to inject test configurations:

```typescript
// test-utils.ts
import { configureOperations } from './generated/client/index.js';
import * as operations from './generated/client/index.js';

export function createTestClient(mockFetch: jest.MockedFunction<typeof fetch>) {
  return configureOperations(operations, {
    baseURL: 'https://test.api.com',
    fetch: mockFetch,
    headers: {},
  });
}

// pet.test.ts
import { createTestClient } from './test-utils';

describe('Pet operations', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let client: ReturnType<typeof createTestClient>;

  beforeEach(() => {
    mockFetch = jest.fn();
    client = createTestClient(mockFetch);
  });

  it('should get pet by id', async () => {
    const mockPet = { id: '123', name: 'Fluffy', status: 'available' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPet),
      headers: new Headers({ 'content-type': 'application/json' }),
    } as Response);

    const result = await client.getPetById({ petId: '123' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockPet);
    }
  });
});
```

## Performance Considerations

### Client Instance Reuse

Create and reuse client instances rather than creating them on every operation:

```typescript
// ❌ Don't do this - creates new configuration every time
function getBadPet(id: string) {
  const client = configureOperations(operations, config);
  return client.getPetById({ petId: id });
}

// ✅ Do this - reuse the configured client
const client = configureOperations(operations, config);

function getGoodPet(id: string) {
  return client.getPetById({ petId: id });
}
```

### Lazy Configuration

For applications with multiple API configurations, consider lazy loading:

```typescript
class ApiClientManager {
  private clients = new Map<string, ReturnType<typeof configureOperations>>();

  getClient(environment: string) {
    if (!this.clients.has(environment)) {
      const config = this.getConfigForEnvironment(environment);
      const client = configureOperations(operations, config);
      this.clients.set(environment, client);
    }
    
    return this.clients.get(environment)!;
  }

  private getConfigForEnvironment(environment: string) {
    // Return appropriate config based on environment
  }
}
```

## Best Practices

1. **Create one client per API** - Don't mix operations from different APIs
2. **Use factory functions** for consistent client creation across environments
3. **Prefer class wrappers** for complex domain logic
4. **Inject clients** rather than importing them directly in business logic
5. **Configure once, use everywhere** - avoid reconfiguring for each operation
6. **Test with mock configurations** to ensure proper isolation
7. **Consider caching** client instances for performance
8. **Document your client API** especially if you're wrapping operations in classes

## Next Steps

- Learn about response handling patterns
- Explore error handling strategies  
- Understand response payload validation
- See custom response deserialization documentation for advanced scenarios