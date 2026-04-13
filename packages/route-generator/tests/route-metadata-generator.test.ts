import { describe, expect, it } from "vitest";

import { generateRouteMetadata } from "../src/index.js";

describe("route metadata generator", () => {
  it("avoids response type name collisions with imported schemas", () => {
    const result = generateRouteMetadata(
      "/pets/{petId}",
      "get",
      {
        operationId: "petFindByStatus",
        parameters: [
          {
            in: "path",
            name: "petId",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/petFindByStatusResponse",
                },
              },
            },
            description: "Success",
          },
        },
      },
      [],
      {
        components: {
          schemas: {
            petFindByStatusResponse: {
              properties: {
                id: { type: "string" },
              },
              type: "object",
            },
          },
        },
        openapi: "3.1.0",
        paths: {},
      },
    );

    expect(result.routeCode).toContain("petFindByStatusResponseMap");
    expect(result.routeCode).toContain(
      "export type petFindByStatusRouteResponse =",
    );
    expect(result.routeCode).not.toContain(
      "export type petFindByStatusResponse =",
    );
  });
});
