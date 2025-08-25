/* Content type handler configurations and template functions */

export type ContentTypeHandler = {
  bodyContentCode: string;
  contentTypeHeaderCode: string;
};

/*
 * Configuration mapping for content type handlers.
 * Defines how to process request body and set Content-Type header for each supported content type.
 */
export const CONTENT_TYPE_HANDLERS: Record<string, ContentTypeHandler> = {
  "application/json": {
    bodyContentCode: "bodyContent = body ? JSON.stringify(body) : undefined;",
    contentTypeHeaderCode:
      'contentTypeHeader = { "Content-Type": "application/json" };',
  },
  "application/octet-stream": {
    bodyContentCode: "bodyContent = body;",
    contentTypeHeaderCode:
      'contentTypeHeader = { "Content-Type": "application/octet-stream" };',
  },
  "application/x-www-form-urlencoded": {
    bodyContentCode:
      "bodyContent = body ? new URLSearchParams(body as Record<string, string>).toString() : undefined;",
    contentTypeHeaderCode:
      'contentTypeHeader = { "Content-Type": "application/x-www-form-urlencoded" };',
  },
  "application/xml": {
    bodyContentCode:
      "bodyContent = typeof body === 'string' ? body : String(body);",
    contentTypeHeaderCode:
      'contentTypeHeader = { "Content-Type": "application/xml" };',
  },
  "multipart/form-data": {
    bodyContentCode: `if (body) {
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value);
          }
        });
        bodyContent = formData;
      }`,
    contentTypeHeaderCode:
      "contentTypeHeader = {}; // Don't set Content-Type for multipart/form-data",
  },
  "text/plain": {
    bodyContentCode:
      "bodyContent = typeof body === 'string' ? body : String(body);",
    contentTypeHeaderCode:
      'contentTypeHeader = { "Content-Type": "text/plain" };',
  },
};

/*
 * Determines which content type handlers are needed for the given content types.
 */
export function determineContentTypeHandlers(
  requestContentTypes: string[],
): Array<{ contentType: string; handler: ContentTypeHandler }> {
  return requestContentTypes.map((contentType) => ({
    contentType,
    handler: CONTENT_TYPE_HANDLERS[contentType] || {
      bodyContentCode:
        "bodyContent = typeof body === 'string' ? body : JSON.stringify(body);",
      contentTypeHeaderCode: `contentTypeHeader = { "Content-Type": "${contentType}" };`,
    },
  }));
}

/*
 * Renders a content type switch statement for handling multiple request content types.
 */
export function renderContentTypeSwitch(requestContentTypes: string[]): string {
  const handlers = determineContentTypeHandlers(requestContentTypes);

  const switchCases = handlers
    .map(({ contentType, handler }) => {
      return `    case "${contentType}":
      ${handler.bodyContentCode}
      ${handler.contentTypeHeaderCode}
      break;`;
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
