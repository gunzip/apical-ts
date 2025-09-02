# Benefits of Operation-Based Architecture

@apical-ts/craft uses an operation-based architecture where each API operation becomes a standalone, typed function. This approach provides significant advantages over traditional monolithic client generation.

## Key Benefits

### Tree Shaking
Only bundle the operations you actually use. Each operation is generated in its own file, allowing modern bundlers to eliminate unused code automatically. This results in smaller bundle sizes and better performance.

### Type Safety
Better parameter organization with an immutable config object. Each operation has strongly typed parameters, responses, and error handling, eliminating runtime type errors.

### Flexibility
Easy per-operation configuration with all required fields. You can customize authentication, headers, validation, and other options on a per-operation basis without affecting global settings.

### Maintainability
Each operation in its own file makes the codebase easier to navigate, understand, and maintain. Updates to specific operations don't affect others.

### Testing
Simple to mock individual operations for unit testing. You can test each operation in isolation without setting up complex mocking infrastructure.

### Debugging
Easier to trace issues with isolated operations. Stack traces point directly to the specific operation function, making debugging more straightforward.

## Comparison with Monolithic Approaches

### Traditional Approach
```typescript
// Monolithic client - everything bundled together
import { ApiClient } from './generated-client';

const client = new ApiClient(config);
// All operations bundled, even if you only use one
const pet = await client.pets.getPetById('123');
```

### Operation-Based Approach
```typescript
// Operation-based - only import what you need
import { getPetById } from './generated/client/getPetById.js';

// Only this operation is bundled
const result = await getPetById({ 
  petId: '123' 
}, config);
```

## Performance Advantages

### Bundle Size
- **Smaller bundles**: Only include operations you actually use
- **Better compression**: Isolated functions compress more efficiently
- **Faster loading**: Reduced payload size improves page load times

### Runtime Performance
- **Lower memory usage**: No large client objects in memory
- **Faster initialization**: No client instantiation overhead
- **Optimized execution**: Direct function calls without method resolution

### Development Performance
- **Faster builds**: Changes to one operation don't trigger rebuilds of others
- **Better caching**: Individual files cache independently
- **Quicker iteration**: Work on specific operations without affecting others

## Developer Experience Benefits

### Intellisense & Autocomplete
Each operation function has dedicated types, providing better IDE support and more accurate autocomplete suggestions.

### Error Messages
Type errors point to specific operations and parameters, making them easier to understand and fix.

### Documentation
Each operation can have its own documentation and examples, improving discoverability and understanding.

### Refactoring
Changes to operation signatures are isolated, making refactoring safer and more predictable.

## Scalability Advantages

### Large APIs
For APIs with hundreds of operations, the operation-based approach scales much better than monolithic clients.

### Team Development
Multiple developers can work on different operations simultaneously without conflicts.

### Version Management
Different operations can evolve independently, making API versioning more manageable.

### Deployment
Operations can be deployed and updated independently, enabling more granular release strategies.

## Framework Integration

The operation-based architecture integrates seamlessly with modern frameworks and patterns:

- **React**: Easy to use with hooks and components
- **Vue**: Simple integration with composables
- **Angular**: Works well with services and dependency injection
- **Node.js**: Perfect for server-side API consumption
- **Edge functions**: Minimal overhead for serverless environments

This architecture ensures that your generated client code is not only type-safe and performant but also maintainable and scalable as your application grows.