import type { OpenAPIObject } from "openapi3-ts/oas31";

import { describe, expect, it, vi } from "vitest";

import { resolveDynamicReferences } from "../../src/core-generator/dynamic-ref-resolver.js";

function createOpenAPIDoc(schemas: Record<string, unknown>): OpenAPIObject {
  return {
    components: { schemas },
    info: { title: "Test", version: "1.0.0" },
    openapi: "3.1.0",
    paths: {},
  } as OpenAPIObject;
}

describe("resolveDynamicReferences", () => {
  it("returns 0 when document has no schemas", () => {
    const doc = createOpenAPIDoc({});
    expect(resolveDynamicReferences(doc)).toBe(0);
  });

  it("returns 0 when no schemas contain $dynamicRef", () => {
    const doc = createOpenAPIDoc({
      User: { type: "object", properties: { id: { type: "string" } } },
    });
    expect(resolveDynamicReferences(doc)).toBe(0);
  });

  describe("standalone template with root-level $dynamicAnchor (self-reference)", () => {
    it("resolves $dynamicRef to self-reference $ref", () => {
      const doc = createOpenAPIDoc({
        BaseCategory: {
          $dynamicAnchor: "category",
          properties: {
            children: {
              items: { $dynamicRef: "#category" },
              type: "array",
            },
            id: { type: "string" },
          },
          required: ["id", "children"],
          type: "object",
        },
      });

      const count = resolveDynamicReferences(doc);

      expect(count).toBe(1);

      const baseCategory = doc.components!.schemas!.BaseCategory as Record<
        string,
        unknown
      >;
      const children = (baseCategory.properties as Record<string, unknown>)
        .children as Record<string, unknown>;
      const items = children.items as Record<string, unknown>;

      expect(items.$ref).toBe("#/components/schemas/BaseCategory");
      expect(items.$dynamicRef).toBeUndefined();
    });

    it("cleans up $dynamicAnchor and $id after resolution", () => {
      const doc = createOpenAPIDoc({
        BaseCategory: {
          $dynamicAnchor: "category",
          $id: "https://example.com/BaseCategory",
          properties: {
            children: {
              items: { $dynamicRef: "#category" },
              type: "array",
            },
          },
          type: "object",
        },
      });

      resolveDynamicReferences(doc);

      const schema = doc.components!.schemas!.BaseCategory as Record<
        string,
        unknown
      >;
      expect(schema.$dynamicAnchor).toBeUndefined();
      expect(schema.$id).toBeUndefined();
    });
  });

  describe("standalone template with $defs default binding", () => {
    it("resolves $dynamicRef using $defs default", () => {
      const doc = createOpenAPIDoc({
        PaginatedTemplate: {
          $defs: {
            itemType: { $dynamicAnchor: "itemType", not: {} },
          },
          properties: {
            items: {
              items: { $dynamicRef: "#itemType" },
              type: "array",
            },
            total: { type: "integer" },
          },
          type: "object",
        },
      });

      const count = resolveDynamicReferences(doc);

      expect(count).toBe(1);

      const template = doc.components!.schemas!.PaginatedTemplate as Record<
        string,
        unknown
      >;
      const items = (
        (template.properties as Record<string, unknown>).items as Record<
          string,
          unknown
        >
      ).items as Record<string, unknown>;

      expect(items.not).toEqual({});
      expect(items.$dynamicRef).toBeUndefined();
    });

    it("cleans up $defs after resolution", () => {
      const doc = createOpenAPIDoc({
        PaginatedTemplate: {
          $defs: {
            itemType: { $dynamicAnchor: "itemType", not: {} },
          },
          properties: {
            items: {
              items: { $dynamicRef: "#itemType" },
              type: "array",
            },
          },
          type: "object",
        },
      });

      resolveDynamicReferences(doc);

      const schema = doc.components!.schemas!.PaginatedTemplate as Record<
        string,
        unknown
      >;
      expect(schema.$defs).toBeUndefined();
    });
  });

  describe("consumer with root-level $dynamicAnchor override (recursive)", () => {
    it("inlines template into allOf with consumer self-reference", () => {
      const doc = createOpenAPIDoc({
        BaseCategory: {
          $dynamicAnchor: "category",
          properties: {
            children: {
              items: { $dynamicRef: "#category" },
              type: "array",
            },
            id: { type: "string" },
          },
          required: ["id", "children"],
          type: "object",
        },
        LocalizedCategory: {
          $dynamicAnchor: "category",
          allOf: [
            { $ref: "#/components/schemas/BaseCategory" },
            {
              properties: {
                displayName: { type: "string" },
                locale: { type: "string" },
              },
              required: ["displayName", "locale"],
              type: "object",
            },
          ],
        },
      });

      const count = resolveDynamicReferences(doc);

      /* 2 total: 1 in consumer resolution + 1 in standalone template resolution */
      expect(count).toBe(2);

      const localized = doc.components!.schemas!.LocalizedCategory as Record<
        string,
        unknown
      >;
      const allOf = localized.allOf as Record<string, unknown>[];

      /* allOf[0] should be the inlined template with resolved dynamic ref */
      expect(allOf[0].$ref).toBeUndefined();
      expect(allOf[0].type).toBe("object");
      expect(allOf[0].required).toEqual(["id", "children"]);

      const inlinedChildren = (allOf[0].properties as Record<string, unknown>)
        .children as Record<string, unknown>;
      const inlinedItems = inlinedChildren.items as Record<string, unknown>;

      expect(inlinedItems.$ref).toBe("#/components/schemas/LocalizedCategory");
      expect(inlinedItems.$dynamicRef).toBeUndefined();

      /* allOf[1] should remain unchanged */
      expect(allOf[1].type).toBe("object");
      expect(allOf[1].required).toEqual(["displayName", "locale"]);
    });
  });

  describe("consumer with $defs binding override (pagination)", () => {
    it("inlines template with $defs binding resolved to $ref", () => {
      const doc = createOpenAPIDoc({
        PaginatedTemplate: {
          $defs: {
            itemType: { $dynamicAnchor: "itemType", not: {} },
          },
          properties: {
            items: {
              items: { $dynamicRef: "#itemType" },
              type: "array",
            },
            total: { minimum: 0, type: "integer" },
          },
          required: ["items", "total"],
          type: "object",
        },
        PaginatedUserResponse: {
          $defs: {
            itemType: {
              $dynamicAnchor: "itemType",
              $ref: "#/components/schemas/User",
            },
          },
          $ref: "#/components/schemas/PaginatedTemplate",
        },
        User: {
          properties: { id: { type: "string" } },
          type: "object",
        },
      });

      const count = resolveDynamicReferences(doc);

      /* 2 total: 1 consumer + 1 standalone template */
      expect(count).toBe(2);

      const userResponse = doc.components!.schemas!
        .PaginatedUserResponse as Record<string, unknown>;

      /* Should be inlined template content, not a $ref */
      expect(userResponse.$ref).toBeUndefined();
      expect(userResponse.type).toBe("object");
      expect(userResponse.required).toEqual(["items", "total"]);

      const items = (
        (userResponse.properties as Record<string, unknown>).items as Record<
          string,
          unknown
        >
      ).items as Record<string, unknown>;

      expect(items.$ref).toBe("#/components/schemas/User");
      expect(items.$dynamicRef).toBeUndefined();
    });

    it("handles multiple consumers of the same template", () => {
      const doc = createOpenAPIDoc({
        Group: {
          properties: { name: { type: "string" } },
          type: "object",
        },
        PaginatedGroupResponse: {
          $defs: {
            itemType: {
              $dynamicAnchor: "itemType",
              $ref: "#/components/schemas/Group",
            },
          },
          $ref: "#/components/schemas/PaginatedTemplate",
        },
        PaginatedTemplate: {
          $defs: {
            itemType: { $dynamicAnchor: "itemType", not: {} },
          },
          properties: {
            items: {
              items: { $dynamicRef: "#itemType" },
              type: "array",
            },
          },
          type: "object",
        },
        PaginatedUserResponse: {
          $defs: {
            itemType: {
              $dynamicAnchor: "itemType",
              $ref: "#/components/schemas/User",
            },
          },
          $ref: "#/components/schemas/PaginatedTemplate",
        },
        User: {
          properties: { id: { type: "string" } },
          type: "object",
        },
      });

      const count = resolveDynamicReferences(doc);

      /* 3 total: 2 consumers + 1 standalone */
      expect(count).toBe(3);

      const userItems = getNestedProp(
        doc.components!.schemas!.PaginatedUserResponse,
        "properties",
        "items",
        "items",
      );
      expect(userItems.$ref).toBe("#/components/schemas/User");

      const groupItems = getNestedProp(
        doc.components!.schemas!.PaginatedGroupResponse,
        "properties",
        "items",
        "items",
      );
      expect(groupItems.$ref).toBe("#/components/schemas/Group");
    });
  });

  describe("nested workspace with multiple dynamic anchors", () => {
    it("resolves multiple $dynamicRef in a single template", () => {
      const doc = createOpenAPIDoc({
        BaseFolder: {
          $dynamicAnchor: "folder",
          properties: {
            children: {
              items: {
                oneOf: [
                  { $ref: "#/components/schemas/Document" },
                  { $dynamicRef: "#folder" },
                ],
              },
              type: "array",
            },
          },
          type: "object",
        },
        Document: {
          properties: { title: { type: "string" } },
          type: "object",
        },
        WorkspaceFolder: {
          $dynamicAnchor: "folder",
          allOf: [
            { $ref: "#/components/schemas/BaseFolder" },
            {
              properties: {
                permissions: { items: { type: "string" }, type: "array" },
              },
              type: "object",
            },
          ],
        },
      });

      resolveDynamicReferences(doc);

      /* BaseFolder standalone: $dynamicRef resolved to self */
      const baseChildren = getNestedProp(
        doc.components!.schemas!.BaseFolder,
        "properties",
        "children",
        "items",
        "oneOf",
      );
      expect(baseChildren[1].$ref).toBe("#/components/schemas/BaseFolder");

      /* WorkspaceFolder consumer: allOf[0] inlined with consumer self-ref */
      const wsFolder = doc.components!.schemas!.WorkspaceFolder as Record<
        string,
        unknown
      >;
      const allOf = wsFolder.allOf as Record<string, unknown>[];
      const wsChildren = getNestedProp(
        allOf[0],
        "properties",
        "children",
        "items",
        "oneOf",
      );
      expect(wsChildren[1].$ref).toBe("#/components/schemas/WorkspaceFolder");
    });
  });

  describe("edge cases", () => {
    it("does not modify schemas without $dynamicRef", () => {
      const originalSchema = {
        properties: {
          name: { type: "string" },
        },
        type: "object",
      };

      const doc = createOpenAPIDoc({
        BaseCategory: {
          $dynamicAnchor: "category",
          properties: {
            children: { items: { $dynamicRef: "#category" }, type: "array" },
          },
          type: "object",
        },
        User: JSON.parse(JSON.stringify(originalSchema)),
      });

      resolveDynamicReferences(doc);

      const user = doc.components!.schemas!.User as Record<string, unknown>;
      expect(user.type).toBe("object");
      expect((user.properties as Record<string, unknown>).name).toEqual({
        type: "string",
      });
    });

    it("handles missing components gracefully", () => {
      const doc = {
        info: { title: "T", version: "1" },
        openapi: "3.1.0",
        paths: {},
      } as OpenAPIObject;
      expect(resolveDynamicReferences(doc)).toBe(0);
    });

    it("does not cross-contaminate cloned templates between consumers", () => {
      const doc = createOpenAPIDoc({
        PaginatedA: {
          $defs: {
            item: {
              $dynamicAnchor: "item",
              $ref: "#/components/schemas/TypeA",
            },
          },
          $ref: "#/components/schemas/Template",
        },
        PaginatedB: {
          $defs: {
            item: {
              $dynamicAnchor: "item",
              $ref: "#/components/schemas/TypeB",
            },
          },
          $ref: "#/components/schemas/Template",
        },
        Template: {
          $defs: { item: { $dynamicAnchor: "item", not: {} } },
          properties: {
            data: { $dynamicRef: "#item" },
          },
          type: "object",
        },
        TypeA: { type: "string" },
        TypeB: { type: "number" },
      });

      resolveDynamicReferences(doc);

      const aData = getNestedProp(
        doc.components!.schemas!.PaginatedA,
        "properties",
        "data",
      );
      expect(aData.$ref).toBe("#/components/schemas/TypeA");

      const bData = getNestedProp(
        doc.components!.schemas!.PaginatedB,
        "properties",
        "data",
      );
      expect(bData.$ref).toBe("#/components/schemas/TypeB");
    });

    it("warns explicitly when a $dynamicRef cannot be resolved", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      try {
        const doc = createOpenAPIDoc({
          Template: {
            properties: {
              data: { $dynamicRef: "#missingAnchor" },
            },
            type: "object",
          },
        });

        const count = resolveDynamicReferences(doc);

        expect(count).toBe(0);
        expect(warnSpy).toHaveBeenCalledWith(
          '⚠️ Could not resolve $dynamicRef "#missingAnchor" in schema "Template"',
        );
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});

/* Helper to traverse nested schema properties */
function getNestedProp(
  obj: unknown,
  ...keys: string[]
): Record<string, unknown> {
  let current = obj as Record<string, unknown>;
  for (const key of keys) {
    current = current[key] as Record<string, unknown>;
  }
  return current;
}
