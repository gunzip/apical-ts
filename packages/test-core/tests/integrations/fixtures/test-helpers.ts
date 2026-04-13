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
