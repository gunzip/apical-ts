import { createTestClient, createAuthenticatedClient, createUnauthenticatedClient } from "../client.js";

/**
 * Sample data for testing API operations
 */
export const sampleData = {
  // Person data matching the Person schema
  person: {
    name: "John Doe",
    age: 30,
    email: "john.doe@example.com"
  },

  // Message data matching the Message schema  
  message: {
    id: "msg-123",
    content: {
      markdown: "# Test Message\n\nThis is a test message with **bold** text and [links](https://example.com). This message is long enough to meet the minimum requirements for the MessageBodyMarkdown schema which requires at least 80 characters.",
      subject: "Test Subject for Message"
    },
    sender_service_id: "service-456"
  },

  // NewModel data for body reference tests
  newModel: {
    id: "model-789",
    name: "Test Model Name"
  },

  // Inline body schema data
  inlineBody: {
    name: "Test Name",
    age: 25
  },

  // Query parameters
  queryParams: {
    qo: "optional-query-param",
    qr: "required-query-param", 
    cursor: "test-cursor-123"
  },

  // Path parameters
  pathParams: {
    "path-param": "test-path-value",
    "first-param": "first-value",
    "second-param": "second-value",
    param: "SomeCustomStringType"
  },

  // Header parameters
  headerParams: {
    "headerInlineParam": "test-header-value",
    "request-id": "test-request-id-123",
    "x-header-param": "test-x-header-value"
  }
};

/**
 * Helper functions for test data creation
 */
export const testHelpers = {
  /**
   * Create a test client for the given base URL and auth scheme
   */
  createClient: (baseURL: string, authScheme?: 'bearerToken' | 'bearerTokenHttp' | 'simpleToken' | 'customToken') => {
    if (authScheme) {
      return createAuthenticatedClient(baseURL, authScheme);
    }
    return createUnauthenticatedClient(baseURL);
  },

  /**
   * Generate a random string for testing
   */
  randomString: (length: number = 10): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Create a File object for testing file uploads
   */
  createTestFile: (content: string = "test file content", filename: string = "test.txt", mimeType: string = "text/plain"): File => {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  },

  /**
   * Create FormData for file upload testing
   */
  createFileFormData: (file: File): FormData => {
    const formData = new FormData();
    formData.append('file', file);
    return formData;
  }
};