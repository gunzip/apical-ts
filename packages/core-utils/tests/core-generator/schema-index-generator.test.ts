import type { ParameterObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import type { OperationParameterMetadata } from "../../src/core-generator/parameter-extractor.js";
import {
  buildParameterSchemaIndexEntry,
  buildSchemaFileIndexEntry,
  buildSchemaIndexContent,
} from "../../src/core-generator/schema-index-generator.js";
import type { SecurityHeader } from "../../src/shared/models/security-models.js";

function createOperationParameterMetadata(
  overrides: Partial<OperationParameterMetadata> = {},
): OperationParameterMetadata {
  return {
    operationId: "listPets",
    parameterGroups: {
      headerParams: [],
      pathParams: [],
      queryParams: [],
    },
    securityHeaders: [],
    ...overrides,
  };
}

describe("core-generator schema-index-generator", () => {
  it("builds schema index content from known entries without rediscovering files", () => {
    const content = buildSchemaIndexContent([
      buildSchemaFileIndexEntry("Pet.ts"),
      buildSchemaFileIndexEntry("PetRequest.ts"),
      {
        exportNames: ["listPetsQuerySchema", "listPetsHeadersSchema"],
        fileName: "listPetsParameters.ts",
      },
      {
        exportNames: [],
        fileName: "emptyParameters.ts",
      },
    ]);

    expect(content).toContain(`import { Pet } from "./Pet.js";`);
    expect(content).toContain(`import { PetRequest } from "./PetRequest.js";`);
    expect(content).toContain(
      [
        "import {",
        "  listPetsQuerySchema,",
        "  listPetsHeadersSchema,",
        '} from "./listPetsParameters.js";',
      ].join("\n"),
    );
    expect(content).not.toContain("emptyParameters");
    expect(content).toContain(
      [
        "export {",
        "  Pet,",
        "  PetRequest,",
        "  listPetsHeadersSchema,",
        "  listPetsQuerySchema,",
        "};",
      ].join("\n"),
    );
  });

  it("derives query and security header exports from parameter metadata", () => {
    const queryParam = {
      in: "query",
      name: "limit",
      required: false,
      schema: { type: "integer" },
    } satisfies ParameterObject;
    const securityHeader: SecurityHeader = {
      headerName: "x-api-key",
      isOverride: true,
      isRequired: true,
      schemeName: "apiKey",
    };

    const entry = buildParameterSchemaIndexEntry(
      createOperationParameterMetadata({
        parameterGroups: {
          headerParams: [],
          pathParams: [],
          queryParams: [queryParam],
        },
        securityHeaders: [securityHeader],
      }),
    );

    expect(entry).toEqual({
      exportNames: ["listPetsQuerySchema", "listPetsHeadersSchema"],
      fileName: "listPetsParameters.ts",
    });
  });

  it("skips parameter imports when no client parameter schemas exist", () => {
    const entry = buildParameterSchemaIndexEntry(
      createOperationParameterMetadata(),
    );

    expect(entry).toEqual({
      exportNames: [],
      fileName: "listPetsParameters.ts",
    });
  });
});
