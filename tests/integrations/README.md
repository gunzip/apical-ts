# Integration Test Suite

This directory contains comprehensive integration tests for the TypeScript OpenAPI client generated from `test.yaml`. The tests use [@stoplight/prism-cli](https://github.com/stoplightio/prism) to create a mock HTTP server based on the OpenAPI specification.

## Overview

The integration tests validate that:
- The generated TypeScript client works correctly against a real HTTP server
- All operations defined in the OpenAPI spec are properly implemented
- Authentication schemes function as expected
- Request/response handling works for various content types
- Error handling behaves correctly for different scenarios

## Test Structure

```
tests/integrations/
├── setup.ts                    # Mock server utilities
├── client.ts                   # Generated client configuration
├── fixtures/                   # Test data and sample files
│   ├── test.yaml               # OpenAPI specification
│   ├── definitions.yaml        # Schema definitions
│   ├── sample-file.txt         # Sample file for upload tests
│   └── test-helpers.ts         # Utility functions and sample data
├── operations/                 # Test files organized by functionality
│   ├── authentication.test.ts  # Authentication operations
│   ├── file-upload.test.ts     # File upload/download operations
│   ├── parameters.test.ts      # Parameter handling operations
│   ├── responses.test.ts       # Response handling operations
│   ├── security.test.ts        # Security scheme operations
│   └── body-schema.test.ts     # Request body and schema operations
├── generated/                  # Generated client (auto-created)
└── README.md                   # This file
```

## Running the Tests

### Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Build the project:
   ```bash
   pnpm run build
   ```

3. Generate the test client (if not already generated):
   ```bash
   pnpm start generate -i tests/integrations/fixtures/test.yaml -o tests/integrations/generated --generate-client
   ```

### Run All Integration Tests

```bash
# Run all tests including integration tests
pnpm test

# Run only integration tests
pnpm exec vitest tests/integrations/

# Run specific test file
pnpm exec vitest tests/integrations/operations/authentication.test.ts

# Run with coverage
pnpm exec vitest tests/integrations/ --coverage
```

### Run Tests in Watch Mode

```bash
pnpm exec vitest tests/integrations/ --watch
```

## Test Categories

### Authentication Tests (`authentication.test.ts`)

Tests all authentication schemes defined in the OpenAPI spec:
- `testAuthBearer` - Bearer token authentication via apiKey
- `testAuthBearerHttp` - Bearer token authentication via HTTP scheme  
- `testSimpleToken` - X-Functions-Key header authentication
- `testCustomTokenHeader` - Custom token header authentication

Each test validates:
- Successful authentication with valid tokens
- Rejection of requests with invalid/missing tokens
- Proper error handling for authentication failures

### File Upload Tests (`file-upload.test.ts`)

Tests file handling operations:
- `testFileUpload` - Multipart form file upload
- `testBinaryFileUpload` - Binary file upload handling
- `testBinaryFileDownload` - Binary file download with proper content types

Validates:
- File upload with different MIME types
- Binary data integrity
- Proper content-type headers
- Large file handling

### Parameter Tests (`parameters.test.ts`)

Tests parameter handling in various contexts:
- Path parameters with special characters (`testParameterWithDash`)
- Multiple path parameters (`testWithTwoParams`)
- Query and header parameters
- Parameter references (`$ref`)
- Path-level parameters
- Optional vs required parameters

### Response Tests (`responses.test.ts`)

Tests response handling scenarios:
- Multiple success responses (`testMultipleSuccess`)
- Response headers (`testResponseHeader`)
- Empty responses (`testWithEmptyResponse`)
- Different content types
- Response schema validation

### Security Tests (`security.test.ts`)

Tests security scheme behavior:
- Operation-specific security overrides (`testOverriddenSecurity`)
- No authentication required (`testOverriddenSecurityNoAuth`)
- Global vs operation-specific security
- Security error handling

### Body and Schema Tests (`body-schema.test.ts`)

Tests request body handling:
- Inline body schemas (`testInlineBodySchema`)
- Schema references (`testParameterWithBodyReference`)
- PUT vs POST operations
- Complex object serialization
- Schema validation edge cases

## Mock Server Configuration

The tests use Prism CLI to create mock servers that:
- Generate realistic responses based on the OpenAPI spec
- Validate requests against the spec
- Return appropriate HTTP status codes
- Include proper headers and content types

### Server Management

Each test file manages its own mock server instance:
- Starts before tests run (`beforeAll`)
- Uses a random port to avoid conflicts
- Stops after tests complete (`afterAll`)

### Configuration Options

The mock server can be configured via `MockServerConfig`:
- `port`: Port number (auto-generated random port)
- `specPath`: Path to OpenAPI specification file
- `host`: Host address (defaults to 'localhost')

## Writing New Tests

### Test Structure

Follow the Arrange-Act-Assert pattern:

```typescript
it("should handle specific scenario", async () => {
  // Arrange - Set up test data and client
  const client = createAuthenticatedClient(baseURL, "bearerToken");
  const params = { /* test parameters */ };

  // Act - Perform the operation
  const response = await client.someOperation(params);

  // Assert - Verify the results
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});
```

### Client Creation

Use the helper functions in `client.ts`:

```typescript
// For authenticated requests
const client = createAuthenticatedClient(baseURL, "bearerToken");

// For unauthenticated requests  
const client = createUnauthenticatedClient(baseURL);

// For custom configuration
const client = createTestClient({
  baseURL,
  authHeaders: { "custom-header": "value" },
  customHeaders: { "x-test": "true" }
});
```

### Test Data

Use sample data from `fixtures/test-helpers.ts`:

```typescript
import { sampleData, testHelpers } from "../fixtures/test-helpers.js";

// Use predefined sample data
const params = {
  qr: sampleData.queryParams.qr,
  body: sampleData.newModel
};

// Or create test data dynamically
const testFile = testHelpers.createTestFile("content", "test.txt");
const randomString = testHelpers.randomString(10);
```

## Error Handling

The tests handle various error scenarios:
- Network connectivity issues
- Authentication failures (401/403)
- Validation errors (400)
- Server errors (500)

Error assertions should check for appropriate error types:

```typescript
// For authentication failures
await expect(client.operation({})).rejects.toThrow();

// For specific error codes
try {
  await client.operation({});
} catch (error) {
  expect(error.message).toMatch(/40[13]/); // 401 or 403
}
```

## Debugging

### Verbose Output

Run tests with verbose output to see detailed mock server logs:

```bash
pnpm exec vitest tests/integrations/ --reporter=verbose
```

### Mock Server Logs

The mock server outputs are captured and can be viewed in test failures. Look for:
- Request/response details
- Validation errors
- Server startup/shutdown messages

### Troubleshooting

Common issues and solutions:

1. **Port conflicts**: Tests use random ports, but if issues persist, check for running processes
2. **Prism not found**: Ensure `@stoplight/prism-cli` is installed: `pnpm install -D @stoplight/prism-cli`
3. **Generated client missing**: Run the generate command to create the test client
4. **Timeout errors**: Mock server startup can take time; increase timeout if needed

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Data Independence**: Use unique test data to avoid conflicts
3. **Resource Cleanup**: Mock servers are automatically cleaned up, but ensure no resources leak
4. **Realistic Scenarios**: Test both success and failure cases
5. **Edge Cases**: Include tests for boundary conditions and error scenarios

## Contributing

When adding new operations to the OpenAPI spec:

1. Update the fixture files (`test.yaml`, `definitions.yaml`)
2. Regenerate the test client
3. Add corresponding integration tests
4. Follow the existing test patterns and naming conventions
5. Update this README if new test categories are added