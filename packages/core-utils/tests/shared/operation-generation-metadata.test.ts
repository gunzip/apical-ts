import type { OpenAPIObject } from "openapi3-ts/oas31";
import { describe, expect, it } from "vitest";

import {
  extractAllOperationGenerationMetadata,
  extractOperationGenerationMetadata,
} from "../../src/shared/operation-generation-metadata.js";

const doc: OpenAPIObject = {
  components: {
    schemas: {
      Widget: {
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
        required: ["id", "name"],
        type: "object",
      },
      WidgetInput: {
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
        type: "object",
      },
    },
    securitySchemes: {
      ApiKeyAuth: {
        in: "header",
        name: "X-API-Key",
        type: "apiKey",
      },
      BearerAuth: {
        scheme: "bearer",
        type: "http",
      },
    },
  },
  info: { title: "test", version: "1.0.0" },
  openapi: "3.1.0",
  paths: {
    "/admin": {
      get: {
        operationId: "getAdmin",
        responses: {
          "204": { description: "No Content" },
        },
        security: [{ BearerAuth: [] }],
      },
    },
    "/widgets/{widgetId}": {
      get: {
        operationId: "getWidget",
        parameters: [
          {
            in: "query",
            name: "includeDetails",
            required: true,
            schema: { type: "boolean" },
          },
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Widget" },
              },
            },
            description: "OK",
          },
        },
      },
      parameters: [
        {
          in: "path",
          name: "widgetId",
          required: true,
          schema: { type: "string" },
        },
      ],
      post: {
        operationId: "createWidget",
        parameters: [
          {
            in: "header",
            name: "x-trace-id",
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WidgetInput" },
            },
            "multipart/form-data": {
              schema: {
                properties: {
                  file: { type: "string" },
                },
                type: "object",
              },
            },
          },
          required: true,
        },
        responses: {
          "201": {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Widget" },
              },
            },
            description: "Created",
          },
          "400": { description: "Bad Request" },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

function getOperationInput(
  pathKey: "/admin" | "/widgets/{widgetId}",
  method: "get" | "post",
) {
  const pathItem = doc.paths?.[pathKey];

  if (!pathItem) {
    throw new Error(`Missing ${pathKey} path item`);
  }

  const operation = pathItem[method];

  if (!operation) {
    throw new Error(`Missing ${method.toUpperCase()} ${pathKey} operation`);
  }

  return {
    operation,
    pathLevelParameters: pathItem.parameters ?? [],
  };
}

describe("operation generation metadata", () => {
  it("extracts shared metadata and request or response map flags", () => {
    const metadata = extractAllOperationGenerationMetadata(doc);

    expect(metadata).toHaveLength(3);
    expect(metadata.map((item) => item.operationId)).toEqual(
      expect.arrayContaining(["getAdmin", "getWidget", "createWidget"]),
    );

    const createWidget = metadata.find(
      (item) => item.operationId === "createWidget",
    );
    const getAdmin = metadata.find((item) => item.operationId === "getAdmin");

    expect(createWidget).toBeDefined();
    expect(createWidget?.bodyInfo.hasRequestBody).toBe(true);
    expect(createWidget?.bodyInfo.requestContentTypes).toEqual([
      "application/json",
      "multipart/form-data",
    ]);
    expect(createWidget?.bodyInfo.shouldGenerateRequestMap).toBe(true);
    expect(createWidget?.bodyInfo.requestBodyMap.shouldGenerateRequestMap).toBe(
      true,
    );
    expect(createWidget?.bodyInfo.shouldGenerateResponseMap).toBe(true);
    expect(createWidget?.bodyInfo.responseMap.shouldGenerateResponseMap).toBe(
      true,
    );

    expect(getAdmin).toBeDefined();
    expect(getAdmin?.bodyInfo.hasRequestBody).toBe(false);
    expect(getAdmin?.bodyInfo.shouldGenerateRequestMap).toBe(false);
    expect(getAdmin?.bodyInfo.shouldGenerateResponseMap).toBe(false);
  });

  it("tracks parameter optionality alongside global security headers", () => {
    const { operation, pathLevelParameters } = getOperationInput(
      "/widgets/{widgetId}",
      "get",
    );
    const metadata = extractOperationGenerationMetadata({
      doc,
      method: "get",
      operation,
      pathKey: "/widgets/{widgetId}",
      pathLevelParameters,
    });

    expect(metadata.parameterInfo).toEqual({
      hasHeaders: true,
      hasPath: true,
      hasQuery: true,
      isHeadersOptional: true,
      isQueryOptional: false,
    });
    expect(metadata.operationSecurityHeaders).toEqual([
      {
        headerName: "X-API-Key",
        isOverride: false,
        isRequired: false,
        schemeName: "ApiKeyAuth",
      },
    ]);
  });

  it("marks operation-level security headers as required overrides", () => {
    const { operation, pathLevelParameters } = getOperationInput(
      "/admin",
      "get",
    );
    const metadata = extractOperationGenerationMetadata({
      doc,
      method: "get",
      operation,
      pathKey: "/admin",
      pathLevelParameters,
    });

    expect(metadata.overridesSecurity).toBe(true);
    expect(metadata.parameterInfo.hasHeaders).toBe(true);
    expect(metadata.parameterInfo.isHeadersOptional).toBe(false);
    expect(metadata.operationSecurityHeaders).toEqual([
      {
        headerName: "Authorization",
        isOverride: true,
        isRequired: true,
        schemeName: "BearerAuth",
      },
    ]);
  });
});
