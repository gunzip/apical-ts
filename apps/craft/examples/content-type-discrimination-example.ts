import { testMultiContentTypes } from "../tests/integrations/generated/client/testMultiContentTypes.js";
import type { NewModel } from "../tests/integrations/generated/schemas/NewModel.js";
import type { Book } from "../tests/integrations/generated/schemas/Book.js";

/*
 * Example demonstrating content type discrimination with forced validation
 * This example shows how the new structure allows for type-safe content type discrimination
 */

// Example usage with forced validation enabled
async function exampleWithForceValidation() {
  const config = {
    baseURL: "https://api.example.com",
    fetch: fetch,
    headers: {},
    forceValidation: true as const, // Enable forced validation
  };

  const body: NewModel = {
    id: "123",
    name: "Test Model",
  };

  try {
    const result = await testMultiContentTypes(
      {
        body,
        contentType: {
          request: "application/json",
          response: "application/json", // or "application/vnd.custom+json" or "application/xml"
        },
      },
      config,
    );

    if (result.isValid) {
      // Now we can discriminate based on content type!
      switch (result.parsed.contentType) {
        case "application/json":
          // result.parsed.data is now typed as NewModel (for 200) or Book (for 201)
          console.log("JSON content:", result.parsed.data);
          if (result.status === 200) {
            // TypeScript knows this is NewModel
            const model = result.parsed.data as NewModel;
            console.log("Model ID:", model.id);
          } else if (result.status === 201) {
            // TypeScript knows this is Book
            const book = result.parsed.data as Book;
            console.log("Book title:", book.title);
          }
          break;

        case "application/vnd.custom+json":
          // result.parsed.data is typed as NewModel
          console.log("Custom JSON content:", result.parsed.data);
          break;

        case "application/xml":
          // result.parsed.data is typed as NewModel
          console.log("XML content:", result.parsed.data);
          break;

        default:
          // TypeScript will catch this as never
          console.log("Unknown content type");
      }

      // You can also access the raw response and status
      console.log("Status:", result.status);
      console.log("Raw data:", result.data);
    } else {
      // Handle validation errors
      console.error("Validation failed:", result.error);
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

// Example utility function to discriminate response types (forced validation only)
function handleMultiContentResponse(
  result: Awaited<ReturnType<typeof testMultiContentTypes<true>>>,
) {
  if (!result.isValid) {
    throw new Error(`API error: ${result.kind}`);
  }

  // With forced validation, the parsed field is always available
  const { contentType, data } = result.parsed;

  switch (contentType) {
    case "application/json":
      return {
        type: "json" as const,
        data: data as NewModel | Book,
        contentType,
      };

    case "application/vnd.custom+json":
      return {
        type: "custom-json" as const,
        data: data as NewModel,
        contentType,
      };

    case "application/xml":
      return {
        type: "xml" as const,
        data: data as NewModel,
        contentType,
      };

    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }
}

// Example usage
exampleWithForceValidation().catch(console.error);

export { exampleWithForceValidation, handleMultiContentResponse };
