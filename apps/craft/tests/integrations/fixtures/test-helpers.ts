import {
  createAuthenticatedClient,
  createTestClient,
  createUnauthenticatedClient,
} from "../client.js";

/**
 * Sample data for testing API operations
 */
export const sampleData = {
  // Header parameters
  headerParams: {
    headerInlineParam: "test-header-value",
    "request-id": "test-request-id-123",
    "x-header-param": "test-x-header-value",
  },

  // Inline body schema data
  inlineBody: {
    age: 25,
    name: "Test Name",
  },

  // Message data matching the Message schema
  message: {
    content: {
      markdown:
        "# Test Message\n\nThis is a test message with **bold** text and [links](https://example.com). This message is long enough to meet the minimum requirements for the MessageBodyMarkdown schema which requires at least 80 characters.",
      subject: "Test Subject for Message",
    },
    id: "msg-123",
    sender_service_id: "service-456",
  },

  // NewModel data for body reference tests
  newModel: {
    id: "model-789",
    name: "Test Model Name",
  },

  // Path parameters
  pathParams: {
    "first-param": "first-value",
    param: "SomeCustomStringType",
    "path-param": "test-path-value",
    "second-param": "second-value",
  },

  // Person data matching the Person schema
  person: {
    age: 30,
    email: "john.doe@example.com",
    name: "John Doe",
  },

  // Query parameters
  queryParams: {
    cursor: "test-cursor-123",
    qo: "optional-query-param",
    qr: "required-query-param",
  },
};

/**
 * Helper functions for test data creation
 */
export const testHelpers = {
  /**
   * Create a test client for the given base URL and auth scheme
   */
  createClient: (
    baseURL: string,
    authScheme?:
      | "bearerToken"
      | "bearerTokenHttp"
      | "customToken"
      | "simpleToken",
  ) => {
    if (authScheme) {
      return createAuthenticatedClient(baseURL, authScheme);
    }
    return createUnauthenticatedClient(baseURL);
  },

  /**
   * Create FormData for file upload testing
   */
  createFileFormData: (file: File): FormData => {
    const formData = new FormData();
    formData.append("file", file);
    return formData;
  },

  /**
   * Create a File object for testing file uploads
   */
  createTestFile: (
    content = "test file content",
    filename = "test.txt",
    mimeType = "text/plain",
  ): File => {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  },

  /**
   * Generate a random string for testing
   */
  randomString: (length = 10): string => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};
