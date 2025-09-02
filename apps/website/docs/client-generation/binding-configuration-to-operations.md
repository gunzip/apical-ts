# Binding Configuration to Operations

You can use the `configureOperations` helper to bind a configuration object to
all generated operations, so you don't have to pass the config each time:

```typescript
import * as operations from "./generated/client/index.js";
import { configureOperations } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
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

You can still override the configuration for individual operations, passing it
as the second argument.
