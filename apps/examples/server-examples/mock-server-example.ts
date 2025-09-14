/* Mock Express server example using generated OpenAPI server wrappers with zocker */

import express from "express";
import { zocker } from "zocker";
import { createExpressAdapter } from "./express-adapter.js";
import { routes } from "../generated/server/index.js";

const app = express();
const PORT = 3001;

/* Setup middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Helper function to prettify validation errors */
const prettifyValidationError = (params: any): string => {
  if (params.error) {
    // If the validation error has structured information, format it nicely
    if (typeof params.error === "object" && params.error.issues) {
      return params.error.issues
        .map(
          (issue: any) =>
            `${issue.path?.join(".") || "root"}: ${issue.message}`,
        )
        .join("; ");
    }
    return String(params.error);
  }
  return "Invalid request parameters";
};

/* Helper function to generate mock data for a given schema */
const generateMockData = (schema: any, operationId: string): any => {
  try {
    return zocker(schema).setSeed(123).generate();
  } catch (error) {
    console.error(`Error generating mock for ${operationId}:`, error);
    return { error: `Mock generation failed for ${operationId}` };
  }
};

/* Helper function to select preferred content type */
const selectContentType = (statusResponseMap: any): string => {
  return statusResponseMap["application/json"]
    ? "application/json"
    : Object.keys(statusResponseMap)[0];
};

/* Generic mock handler factory - uses responseMap from route info
   The return type is inferred from the wrapper signature so that
   createExpressAdapter(routeInfo, handler)(app) works without casts. */
const createMockHandler = <
  R extends {
    wrapper: (handler: any) => (req: any) => Promise<any>;
    responseMap: any;
    operationId: string;
  },
>(
  routeInfo: R,
): Parameters<R["wrapper"]>[0] => {
  const handler: any = async (params: any) => {
    if (!params.isValid) {
      /* Return validation error with prettified message */
      const responseMap = routeInfo.responseMap;

      /* Check if we have a 400 response schema defined */
      if (responseMap && responseMap["400"]) {
        const statusResponseMap = responseMap["400"];
        const contentType = selectContentType(statusResponseMap);

        if (contentType && statusResponseMap[contentType]) {
          const schema = statusResponseMap[contentType];
          const mockData = generateMockData(schema, routeInfo.operationId);

          /* Override with actual validation error */
          const errorData = {
            ...mockData,
            message: prettifyValidationError(params),
            details: params.error || "Validation failed",
          };

          return {
            status: 400,
            contentType,
            data: errorData,
          };
        }
      }

      /* Fallback 400 response if no schema defined */
      return {
        status: 400,
        contentType: "application/json",
        data: {
          error: "Bad Request",
          message: prettifyValidationError(params),
          details: params.error || "Validation failed",
        },
      };
    }

    const responseMap = routeInfo.responseMap;

    if (responseMap) {
      /* Get all available status codes and pick one to mock */
      const statusCodes = Object.keys(responseMap);

      /* Prefer success status codes (2xx), then 3xx, then others */
      const successCodes = statusCodes.filter((code) => code.startsWith("2"));
      const redirectCodes = statusCodes.filter((code) => code.startsWith("3"));
      const preferredCodes =
        successCodes.length > 0
          ? successCodes
          : redirectCodes.length > 0
            ? redirectCodes
            : statusCodes;

      /* Use the first preferred status code (or first available) */
      const selectedStatus = preferredCodes[0] || statusCodes[0];

      if (selectedStatus) {
        const statusResponseMap = responseMap[selectedStatus];
        const contentType = selectContentType(statusResponseMap);

        if (contentType && statusResponseMap[contentType]) {
          const schema = statusResponseMap[contentType];
          const data = generateMockData(schema, routeInfo.operationId);

          return {
            status: parseInt(selectedStatus, 10),
            contentType,
            data,
          };
        }
      }
    }

    /* Fallback to no data response if no schema found */
    return { status: 204, contentType: "text/plain", data: null };
  };
  return handler;
};

/* Create handlers and setup routes for all operations */
const registerRoute = <
  R extends {
    path: string;
    method: string;
    wrapper: (handler: any) => (req: any) => Promise<any>;
    operationId: string;
    responseMap: any;
  },
>(
  routeInfo: R,
) => {
  const handler = createMockHandler(routeInfo);
  createExpressAdapter(routeInfo, handler)(app);
};

Object.values(routes).forEach((routeFn) => {
  registerRoute(routeFn());
});

/* Health check endpoint */
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

/* Start the server */
app.listen(PORT, () => {
  console.log(`🚀 Mock Express server running on http://localhost:${PORT}`);
  console.log(
    "📊 All OpenAPI operations are mocked with zocker-generated data for all status codes in responseMap",
  );
  console.log("🔍 Validation errors include detailed error messages");
  console.log(`  GET /health`);
  console.log("");
  console.log(
    "💡 Try any of the generated API endpoints to see mock responses!",
  );
});

export default app;
