import type { OpenAPIObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { resolveRequestBodies } from "../../src/core-generator/request-body-resolver.js";

describe("core-generator request-body-resolver", () => {
  it("ignores schema properties literally named $ref", () => {
    const openApiDoc: OpenAPIObject = {
      components: {
        requestBodies: {
          SchemaPayload: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/JsonSchemaProps",
                },
              },
            },
            required: true,
          },
        },
        schemas: {
          JsonSchemaProps: {
            properties: {
              $ref: {
                type: "string",
              },
            },
            type: "object",
          },
        },
      },
      info: {
        title: "Literal ref property",
        version: "1.0.0",
      },
      openapi: "3.1.0",
      paths: {
        "/schemas": {
          post: {
            operationId: "createSchema",
            requestBody: {
              $ref: "#/components/requestBodies/SchemaPayload",
            },
            responses: {
              "200": {
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/JsonSchemaProps",
                    },
                  },
                },
                description: "ok",
              },
            },
          },
        },
      },
    };

    expect(resolveRequestBodies(openApiDoc)).toBe(1);

    const operation = openApiDoc.paths?.["/schemas"]?.post;
    expect(operation).toBeDefined();
    if (!operation) {
      expect.fail("Expected the /schemas POST operation to exist");
    }

    const requestBody = operation.requestBody;
    expect(requestBody).toBeDefined();
    if (!requestBody || "$ref" in requestBody) {
      expect.fail("Expected the operation requestBody to be inlined");
    }

    expect(requestBody.content?.["application/json"]).toBeDefined();

    const schema = openApiDoc.components?.schemas?.JsonSchemaProps;
    expect(schema).toBeDefined();
    if (!schema || "$ref" in schema) {
      expect.fail("Expected JsonSchemaProps to remain a schema object");
    }

    expect(schema.properties?.$ref).toEqual({
      type: "string",
    });
  });
});
