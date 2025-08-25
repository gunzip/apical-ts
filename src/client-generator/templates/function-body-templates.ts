import type { ContentTypeMaps } from "../responses.js";
import type { ParameterGroups } from "../parameters.js";
import type { SecurityHeader } from "../security.js";

/* Function body structure analysis and template rendering */

export type FunctionBodyStructure = {
  contentTypeLogic: string;
  bodyContentCode: string;
  acceptHeaderLogic: string;
  contentTypeHeaderCode: string;
  headersContent: string;
};

export type HeaderConfiguration = {
  shouldGenerateRequestMap: boolean;
  overridesSecurity?: boolean;
  authHeaders?: string[];
  shouldGenerateResponseMap: boolean;
  acceptHeaderLogic: string;
  contentTypeHeaderCode: string;
};

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
  "contentTypeLogic" | "acceptHeaderLogic" | "contentTypeHeaderCode"
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
    contentTypeLogic += `  const finalResponseContentType = contentType?.response || "${defaultRespValue}";\n`;
  } else {
    contentTypeLogic += `  const finalResponseContentType = "";\n`;
  }

  return {
    contentTypeLogic,
    acceptHeaderLogic,
    contentTypeHeaderCode,
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
    shouldGenerateRequestMap,
    overridesSecurity,
    authHeaders,
    shouldGenerateResponseMap: shouldGenerateResponseMap || false,
    acceptHeaderLogic: acceptHeaderLogic || "",
    contentTypeHeaderCode: contentTypeHeaderCode || "",
  };
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

  switch (response.status) {
${responseHandlers.join("\n")}
    default: {
      // Throw UnexpectedResponseError for undefined status codes
      const data = await parseResponseBody(response);
      throw new UnexpectedResponseError(response.status, data, response);
    }
  }`;
}
