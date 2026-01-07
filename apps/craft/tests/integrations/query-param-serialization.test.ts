import { describe, it, expect } from "vitest";
import { serializeQueryParam } from "./generated/client/config.js";

describe("Query Parameter Serialization", () => {
  describe("serializeQueryParam", () => {
    it("should handle primitive values", () => {
      const result = serializeQueryParam("name", "John");
      expect(result).toEqual([["name", "John"]]);
    });

    it("should handle number values", () => {
      const result = serializeQueryParam("age", 25);
      expect(result).toEqual([["age", "25"]]);
    });

    it("should handle boolean values", () => {
      const result = serializeQueryParam("active", true);
      expect(result).toEqual([["active", "true"]]);
    });

    it("should handle undefined values", () => {
      const result = serializeQueryParam("name", undefined);
      expect(result).toEqual([]);
    });

    it("should handle null values", () => {
      const result = serializeQueryParam("name", null);
      expect(result).toEqual([]);
    });

    describe("arrays with explode=true (default)", () => {
      it("should serialize array with explode=true", () => {
        const result = serializeQueryParam("tags", ["red", "blue", "green"]);
        expect(result).toEqual([
          ["tags", "red"],
          ["tags", "blue"],
          ["tags", "green"],
        ]);
      });

      it("should filter undefined/null items from arrays", () => {
        const result = serializeQueryParam("tags", [
          "red",
          null,
          "blue",
          undefined,
          "green",
        ]);
        expect(result).toEqual([
          ["tags", "red"],
          ["tags", "blue"],
          ["tags", "green"],
        ]);
      });

      it("should handle empty arrays", () => {
        const result = serializeQueryParam("tags", []);
        expect(result).toEqual([]);
      });
    });

    describe("arrays with explode=false", () => {
      it("should serialize array with explode=false (form style)", () => {
        const result = serializeQueryParam("tags", ["red", "blue", "green"], {
          explode: false,
        });
        expect(result).toEqual([["tags", "red,blue,green"]]);
      });

      it("should serialize array with explode=false (spaceDelimited style)", () => {
        const result = serializeQueryParam("tags", ["red", "blue", "green"], {
          explode: false,
          style: "spaceDelimited",
        });
        expect(result).toEqual([["tags", "red blue green"]]);
      });

      it("should serialize array with explode=false (pipeDelimited style)", () => {
        const result = serializeQueryParam("tags", ["red", "blue", "green"], {
          explode: false,
          style: "pipeDelimited",
        });
        expect(result).toEqual([["tags", "red|blue|green"]]);
      });

      it("should handle empty arrays with explode=false", () => {
        const result = serializeQueryParam("tags", [], { explode: false });
        expect(result).toEqual([]);
      });
    });

    describe("objects with explode=true (default)", () => {
      it("should serialize object with explode=true", () => {
        const result = serializeQueryParam("filter", {
          name: "John",
          age: "25",
        });
        expect(result).toEqual([
          ["name", "John"],
          ["age", "25"],
        ]);
      });

      it("should filter undefined/null values from objects", () => {
        const result = serializeQueryParam("filter", {
          name: "John",
          age: null,
          city: undefined,
          country: "USA",
        });
        expect(result).toEqual([
          ["name", "John"],
          ["country", "USA"],
        ]);
      });

      it("should handle empty objects", () => {
        const result = serializeQueryParam("filter", {});
        expect(result).toEqual([]);
      });
    });

    describe("objects with explode=false", () => {
      it("should serialize object with explode=false", () => {
        const result = serializeQueryParam(
          "filter",
          { name: "John", age: "25" },
          { explode: false },
        );
        expect(result).toEqual([["filter", "name,John,age,25"]]);
      });

      it("should filter undefined/null values from objects with explode=false", () => {
        const result = serializeQueryParam(
          "filter",
          {
            name: "John",
            age: null,
            city: undefined,
            country: "USA",
          },
          { explode: false },
        );
        expect(result).toEqual([["filter", "name,John,country,USA"]]);
      });

      it("should handle empty objects with explode=false", () => {
        const result = serializeQueryParam("filter", {}, { explode: false });
        expect(result).toEqual([]);
      });
    });

    describe("OpenAPI 3.x spec examples", () => {
      it("should handle enum array like fields[catalog-item-bulk-create-job] with explode=true", () => {
        const result = serializeQueryParam(
          "fields[catalog-item-bulk-create-job]",
          ["status", "created_at", "total_count"],
          { explode: true },
        );
        expect(result).toEqual([
          ["fields[catalog-item-bulk-create-job]", "status"],
          ["fields[catalog-item-bulk-create-job]", "created_at"],
          ["fields[catalog-item-bulk-create-job]", "total_count"],
        ]);
      });

      it("should handle complex parameter names", () => {
        const result = serializeQueryParam("fields[user][profile]", [
          "name",
          "email",
        ]);
        expect(result).toEqual([
          ["fields[user][profile]", "name"],
          ["fields[user][profile]", "email"],
        ]);
      });
    });
  });
});
