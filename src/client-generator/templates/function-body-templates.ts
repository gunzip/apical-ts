import type { ContentTypeMaps } from "../responses.js";

/* Function body structure analysis and template rendering */

export interface FunctionBodyStructure {
  acceptHeaderLogic: string;
  bodyContentCode: string;
  contentTypeHeaderCode: string;
  contentTypeLogic: string;
  headersContent: string;
}

export interface HeaderConfiguration {
  acceptHeaderLogic: string;
  authHeaders?: string[];
  contentTypeHeaderCode: string;
  overridesSecurity?: boolean;
  shouldGenerateRequestMap: boolean;
  shouldGenerateResponseMap: boolean;
}

/*
 * Determines the structure and components needed for the function body.
 */
export function determineFunctionBodyStructure(
  contentTypeMaps: ContentTypeMaps,
  hasBody: boolean,
  requestContentTypes: string[] | undefined,
  shouldGenerateRequestMap: boolean,
  shouldGenerateResponseMap: boolean,
): Pick<
  FunctionBodyStructure,
  "acceptHeaderLogic" | "contentTypeHeaderCode" | "contentTypeLogic"
> {
  let contentTypeLogic = "";
  let acceptHeaderLogic = "";
  const contentTypeHeaderCode = "";

  if (shouldGenerateRequestMap) {
    const defaultReq =
      contentTypeMaps.defaultRequestContentType || "application/json";
    contentTypeLogic += `  const finalRequestContentType = contentType?.request || "${defaultReq}";\n`;
  }

  if (shouldGenerateResponseMap) {
    const defaultRespValue =
      contentTypeMaps.defaultResponseContentType || "application/json";
    acceptHeaderLogic = `    "Accept": contentType?.response || "${defaultRespValue}",`;
  }

  return {
    acceptHeaderLogic,
    contentTypeHeaderCode,
    contentTypeLogic,
  };
}

/*
 * Determines the header configuration needed for the request.
 */
export function determineHeaderConfiguration(
  shouldGenerateRequestMap: boolean,
  overridesSecurity?: boolean,
  authHeaders?: string[],
  shouldGenerateResponseMap?: boolean,
  acceptHeaderLogic?: string,
  contentTypeHeaderCode?: string,
): HeaderConfiguration {
  return {
    acceptHeaderLogic: acceptHeaderLogic || "",
    authHeaders,
    contentTypeHeaderCode: contentTypeHeaderCode || "",
    overridesSecurity,
    shouldGenerateRequestMap,
    shouldGenerateResponseMap: shouldGenerateResponseMap || false,
  };
}

/*
 * Renders the complete function body template.
 */
export function renderFunctionBody(
  contentTypeLogic: string,
  bodyContentCode: string,
  headersContent: string,
  finalPath: string,
  method: string,
  hasBody: boolean,
  responseHandlers: string[],
  headerParamLines?: string,
  securityHeaderLines?: string,
  queryParamLines?: string,
): string {
  return `${contentTypeLogic}${bodyContentCode}

  const finalHeaders: Record<string, string> = {
${headersContent}
  };
  ${headerParamLines ? `  ${headerParamLines}` : ""}${securityHeaderLines ? `  ${securityHeaderLines}` : ""}

  const url = new URL(\`${finalPath}\`, config.baseURL);
  ${queryParamLines ? `  ${queryParamLines}` : ""}

  const response = await config.fetch(url.toString(), {
    method: "${method.toUpperCase()}",
    headers: finalHeaders,${
      hasBody
        ? `
    body: bodyContent,`
        : ""
    }
  });

  /*
   * The response body is consumed immediately to prevent holding onto the raw
   * response stream. A new, lightweight response object is created with only
   * the necessary properties, and headers are copied to a Map to break the
   * reference to the original response object.
   */
  const data = await parseResponseBody(response);
  const minimalResponse = {
    status: response.status,
    headers: new Map(response.headers.entries()),
  };

  switch (response.status) {
${responseHandlers.join("\n")}
    default: {
      // Throw UnexpectedResponseError for undefined status codes
      throw new UnexpectedResponseError(response.status, data, response);
    }
  }`;
}

/*
 * Renders the headers object construction code.
 */
export function renderHeadersObject(config: HeaderConfiguration): string {
  if (config.shouldGenerateRequestMap) {
    return `    ${
      config.overridesSecurity &&
      config.authHeaders &&
      config.authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${config.authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${
      config.shouldGenerateResponseMap
        ? `
${config.acceptHeaderLogic}`
        : ""
    }
    ...contentTypeHeader,`;
  } else {
    return `    ${
      config.overridesSecurity &&
      config.authHeaders &&
      config.authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${config.authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${
      config.shouldGenerateResponseMap
        ? `
${config.acceptHeaderLogic}`
        : ""
    }${config.contentTypeHeaderCode}`;
  }
}
