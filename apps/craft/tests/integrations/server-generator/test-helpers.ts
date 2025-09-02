import express, { Request, Response } from "express";
import { Person } from "../generated/schemas/Person.js";
import { Message } from "../generated/schemas/Message.js";
import { NewModel } from "../generated/schemas/NewModel.js";
import { TestDeserUser } from "../generated/schemas/TestDeserUser.js";

/**
 * Helper function to create a test Express app
 */
export function createTestApp(): express.Application {
  const app = express();

  // Middleware for parsing JSON bodies
  app.use(express.json());

  // Middleware for parsing URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));

  // Middleware for parsing raw binary data
  app.use(express.raw({ type: "application/octet-stream", limit: "10mb" }));

  // Middleware for multipart form data (basic parsing)
  app.use(
    "/test-file-upload",
    express.raw({ type: "multipart/form-data", limit: "10mb" }),
  );
  app.use(
    "/test-binary-file-upload",
    express.raw({ type: "multipart/form-data", limit: "10mb" }),
  );

  return app;
}

/**
 * Creates a test app and sets up a route for a specific operation
 */
export function setupTestRoute<THandler extends (...args: any[]) => any>(
  path: string,
  method: "get" | "post" | "put" | "patch" | "delete",
  wrapper: (handler: THandler) => any,
  handler: THandler,
  customErrorHandler?: (result: any, res: express.Response) => void,
): express.Application {
  const app = createTestApp();

  app[method](path, (req, res) => {
    const wrappedHandler = wrapper(handler);
    wrappedHandler(extractRequestParams(req))
      .then((result: any) => {
        if (customErrorHandler) {
          customErrorHandler(result, res);
        } else {
          res.status(result.status).type(result.contentType).send(result.data);
        }
      })
      .catch((err: Error) => res.status(500).json({ error: err.message }));
  });

  return app;
}

/**
 * Mock data generators for test responses
 */
export const mockData = {
  person: (): Person => ({
    name: "John Doe",
    age: 30,
    email: "john.doe@example.com",
    fiscal_code: "SPNDNL80R13C555X",
    family_name: "Doe",
    has_profile: true,
    is_email_set: true,
    version: 1,
  }),

  message: (): Message => ({
    id: "msg-123",
    content: {
      markdown:
        "# Test Message\n\nThis is a test message with some **bold** text and at least 80 characters to meet the minimum length requirement.",
      subject: "Test Subject for Testing",
    },
    sender_service_id: "test-service",
  }),

  newModel: (): NewModel => ({
    id: "model-123",
    name: "Test Model",
  }),

  testDeserUser: (): TestDeserUser => ({
    name: "Test User",
    age: 25,
  }),

  problemDetails: () => ({
    type: "https://example.com/probs/gateway-timeout",
    title: "Gateway Timeout",
    status: 504,
    detail: "The upstream service failed to respond within the allotted time.",
    instance: "https://example.com/instances/123",
  }),

  oneOfTestLimited: () => ({
    limited: true,
  }),

  oneOfTestUnlimited: () => ({
    unlimited: true,
  }),

  customErrorResponse: () => ({
    prop1: { id: "simple-123" },
    prop2: "Error message",
  }),
};

/**
 * Helper to extract parameters from Express request for wrapper consumption
 * Handles parameter name transformation from kebab-case to camelCase
 */
export function extractRequestParams(req: Request) {
  // Transform query parameters from kebab-case to camelCase
  const transformedQuery: Record<string, any> = {};
  for (const [key, value] of Object.entries(req.query)) {
    const transformedKey = transformParameterName(key);
    transformedQuery[transformedKey] = value;
  }

  // Transform path parameters from kebab-case to camelCase
  const transformedPath: Record<string, any> = {};
  for (const [key, value] of Object.entries(req.params)) {
    const transformedKey = transformParameterName(key);
    transformedPath[transformedKey] = value;
  }

  // Transform header parameters
  // Express normalizes all headers to lowercase, so we need to handle this
  const transformedHeaders: Record<string, any> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    // Apply basic transformation
    const transformedKey = transformParameterName(key);
    transformedHeaders[transformedKey] = value;

    // Handle specific header mappings for camelCase headers that Express lowercases
    if (key === "headerinlineparam") {
      transformedHeaders["headerInlineParam"] = value;
    }
  }

  return {
    query: transformedQuery,
    path: transformedPath,
    headers: transformedHeaders,
    body: req.body,
    contentType: req.get("content-type") || undefined,
  };
}

/**
 * Transform parameter names from kebab-case to camelCase (matching sanitizeIdentifier logic)
 */
function transformParameterName(name: string): string {
  // Handle special cases for headers that should preserve original format
  if (name.startsWith("x-")) {
    return name; // Keep x-headers as-is
  }

  // For headers that Express converts to lowercase, we need to handle both cases:
  // 1. headerinlineparam -> headerInlineParam
  // 2. header-inline-param -> headerInlineParam

  // First, check if this looks like a header that was normalized by Express
  // (all lowercase, no dashes, but originally had camelCase)
  if (name === name.toLowerCase() && !name.includes("-")) {
    // This might be a header like "headerinlineparam" that should be "headerInlineParam"
    // We need to figure out the original camelCase format
    // For now, let's just return it as-is and see if it matches
    return name;
  }

  // Transform kebab-case to camelCase: foo-bar -> fooBar, path-param -> pathParam
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Helper to send response from wrapper result
 */
export function sendWrapperResponse(
  res: Response,
  result: { status: number; contentType: string; data: any },
) {
  res.status(result.status).type(result.contentType).send(result.data);
}
