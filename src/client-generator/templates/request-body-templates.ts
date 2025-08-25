import type {
  ContentTypeHandlerConfig,
  ContentTypeStrategy,
  RequestBodyRenderContext,
} from "../models/request-body-models.js";

/*
 * Template rendering functions for request body handling code generation
 */

/* Default content type handling strategies */
export const DEFAULT_CONTENT_TYPE_HANDLERS: ContentTypeHandlerConfig = {
  "application/json": {
    bodyProcessing: "body ? JSON.stringify(body) : undefined",
    contentTypeHeader: '"Content-Type": "application/json"',
    requiresFormData: false,
  },
  "application/octet-stream": {
    bodyProcessing: "body",
    contentTypeHeader: '"Content-Type": "application/octet-stream"',
    requiresFormData: false,
  },
  "application/x-www-form-urlencoded": {
    bodyProcessing:
      "body ? new URLSearchParams(body as Record<string, string>).toString() : undefined",
    contentTypeHeader: '"Content-Type": "application/x-www-form-urlencoded"',
    requiresFormData: false,
  },
  "application/xml": {
    bodyProcessing: "typeof body === 'string' ? body : String(body)",
    contentTypeHeader: '"Content-Type": "application/xml"',
    requiresFormData: false,
  },
  "multipart/form-data": {
    bodyProcessing: `(() => {
      const formData = new FormData();
      if (body) {
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value);
          }
        });
      }
      return formData;
    })()`,
    contentTypeHeader: "",
    requiresFormData: true,
  },
  "text/plain": {
    bodyProcessing: "typeof body === 'string' ? body : String(body)",
    contentTypeHeader: '"Content-Type": "text/plain"',
    requiresFormData: false,
  },
};

/*
 * Renders body handling code for a specific content type strategy
 */
export function renderBodyHandling(
  strategy: ContentTypeStrategy,
  indentation = "    ",
): string {
  return `${indentation}body: ${strategy.bodyProcessing},`;
}

/*
 * Renders content type header code for a specific strategy
 */
export function renderContentTypeHeaders(
  strategy: ContentTypeStrategy,
  indentation = "    ",
): string {
  if (!strategy.contentTypeHeader) {
    return "";
  }
  return `${indentation}${strategy.contentTypeHeader},`;
}

/*
 * Renders complete request body handling code using legacy format
 * for backward compatibility with existing generateRequestBodyHandling
 */
export function renderLegacyRequestBodyHandling(
  context: RequestBodyRenderContext,
  handlers: ContentTypeHandlerConfig = DEFAULT_CONTENT_TYPE_HANDLERS,
): { bodyContent: string; contentTypeHeader: string } {
  let bodyContent = "";
  let contentTypeHeader = "";

  if (context.hasBody && context.requestContentType) {
    const strategy = handlers[context.requestContentType];
    if (strategy) {
      bodyContent = renderBodyHandling(strategy);
      contentTypeHeader = renderContentTypeHeaders(strategy);
    } else {
      /* Fallback for unknown content types */
      const fallbackStrategy: ContentTypeStrategy = {
        bodyProcessing:
          "typeof body === 'string' ? body : JSON.stringify(body)",
        contentTypeHeader: `"Content-Type": "${context.requestContentType}"`,
        requiresFormData: false,
      };
      bodyContent = renderBodyHandling(fallbackStrategy);
      contentTypeHeader = renderContentTypeHeaders(fallbackStrategy);
    }
  }

  return { bodyContent, contentTypeHeader };
}

/*
 * Renders dynamic body content handling code for multiple content types
 * Used when generating switch statements for content type selection
 */
export function renderDynamicBodyHandling(
  requestContentTypes: string[],
  handlers: ContentTypeHandlerConfig = DEFAULT_CONTENT_TYPE_HANDLERS,
): string {
  const switchCases = requestContentTypes
    .map((contentType) => {
      const strategy = handlers[contentType];
      if (strategy) {
        const bodyProcessing = strategy.bodyProcessing;
        const headerCode = strategy.contentTypeHeader
          ? `{ ${strategy.contentTypeHeader} }`
          : "{}";
        return `    case "${contentType}":
      bodyContent = ${bodyProcessing};
      contentTypeHeader = ${headerCode};
      break;`;
      } else {
        /* Generic approach for unknown content types */
        return `    case "${contentType}":
      bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
      contentTypeHeader = { "Content-Type": "${contentType}" };
      break;`;
      }
    })
    .join("\n");

  const defaultCase = `    default:
      bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
      contentTypeHeader = { "Content-Type": finalRequestContentType };`;

  return `  let bodyContent: string | FormData | undefined = "";
  let contentTypeHeader = {};
  
  switch (finalRequestContentType) {
${switchCases}
${defaultCase}
  }`;
}
