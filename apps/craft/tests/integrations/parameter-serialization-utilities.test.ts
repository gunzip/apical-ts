import { describe, it, expect } from "vitest";
import {
  serializeQueryParam,
  serializePathParam,
  serializeHeaderParam,
} from "./generated/client/runtime.js";

describe("Parameter Serialization Utilities", () => {
  describe("serializeQueryParam", () => {
    describe("form style (default)", () => {
      it("should serialize primitive values", () => {
        expect(serializeQueryParam("param", "value")).toEqual([
          ["param", "value"],
        ]);
        expect(serializeQueryParam("param", 123)).toEqual([["param", "123"]]);
        expect(serializeQueryParam("param", true)).toEqual([["param", "true"]]);
      });

      it("should handle null and undefined values", () => {
        expect(serializeQueryParam("param", null)).toEqual([]);
        expect(serializeQueryParam("param", undefined)).toEqual([]);
      });

      it("should serialize arrays with explode=true (default)", () => {
        expect(serializeQueryParam("tags", ["red", "green", "blue"])).toEqual([
          ["tags", "red"],
          ["tags", "green"],
          ["tags", "blue"],
        ]);
      });

      it("should serialize arrays with explode=false", () => {
        expect(
          serializeQueryParam("tags", ["red", "green", "blue"], {
            explode: false,
          }),
        ).toEqual([["tags", "red,green,blue"]]);
      });

      it("should serialize objects with explode=true (default)", () => {
        expect(serializeQueryParam("user", { name: "John", age: 30 })).toEqual([
          ["name", "John"],
          ["age", "30"],
        ]);
      });

      it("should serialize objects with explode=false", () => {
        expect(
          serializeQueryParam(
            "user",
            { name: "John", age: 30 },
            {
              explode: false,
            },
          ),
        ).toEqual([["user", "name,John,age,30"]]);
      });

      it("should filter out null and undefined values from arrays", () => {
        expect(
          serializeQueryParam("tags", ["red", null, "blue", undefined]),
        ).toEqual([
          ["tags", "red"],
          ["tags", "blue"],
        ]);
      });

      it("should filter out null and undefined values from objects", () => {
        expect(
          serializeQueryParam("user", {
            name: "John",
            age: null,
            city: undefined,
          }),
        ).toEqual([["name", "John"]]);
      });

      it("should handle empty arrays", () => {
        expect(serializeQueryParam("tags", [])).toEqual([]);
      });

      it("should handle empty objects", () => {
        expect(serializeQueryParam("user", {})).toEqual([]);
      });
    });

    describe("spaceDelimited style", () => {
      it("should serialize arrays with space delimiter and explode=false", () => {
        expect(
          serializeQueryParam("tags", ["red", "green", "blue"], {
            style: "spaceDelimited",
            explode: false,
          }),
        ).toEqual([["tags", "red green blue"]]);
      });

      it("should serialize arrays with explode=true (same as form)", () => {
        expect(
          serializeQueryParam("tags", ["red", "green", "blue"], {
            style: "spaceDelimited",
            explode: true,
          }),
        ).toEqual([
          ["tags", "red"],
          ["tags", "green"],
          ["tags", "blue"],
        ]);
      });

      it("should serialize objects with space delimiter and explode=false", () => {
        expect(
          serializeQueryParam(
            "user",
            { name: "John", age: 30 },
            {
              style: "spaceDelimited",
              explode: false,
            },
          ),
        ).toEqual([["user", "name John age 30"]]);
      });
    });

    describe("pipeDelimited style", () => {
      it("should serialize arrays with pipe delimiter and explode=false", () => {
        expect(
          serializeQueryParam("tags", ["red", "green", "blue"], {
            style: "pipeDelimited",
            explode: false,
          }),
        ).toEqual([["tags", "red|green|blue"]]);
      });

      it("should serialize arrays with explode=true (same as form)", () => {
        expect(
          serializeQueryParam("tags", ["red", "green", "blue"], {
            style: "pipeDelimited",
            explode: true,
          }),
        ).toEqual([
          ["tags", "red"],
          ["tags", "green"],
          ["tags", "blue"],
        ]);
      });

      it("should serialize objects with pipe delimiter and explode=false", () => {
        expect(
          serializeQueryParam(
            "user",
            { name: "John", age: 30 },
            {
              style: "pipeDelimited",
              explode: false,
            },
          ),
        ).toEqual([["user", "name|John|age|30"]]);
      });
    });

    describe("deepObject style", () => {
      it("should serialize objects in deepObject format", () => {
        expect(
          serializeQueryParam(
            "filter",
            { type: "active", status: "published" },
            {
              style: "deepObject",
            },
          ),
        ).toEqual([
          ["filter[type]", "active"],
          ["filter[status]", "published"],
        ]);
      });

      it("should handle nested object keys with special characters", () => {
        expect(
          serializeQueryParam(
            "filter",
            { "user-id": "123", "created-at": "2023" },
            {
              style: "deepObject",
            },
          ),
        ).toEqual([
          ["filter[user-id]", "123"],
          ["filter[created-at]", "2023"],
        ]);
      });

      it("should handle empty objects", () => {
        expect(
          serializeQueryParam("filter", {}, { style: "deepObject" }),
        ).toEqual([]);
      });

      it("should filter null and undefined values", () => {
        expect(
          serializeQueryParam(
            "filter",
            {
              type: "active",
              status: null,
              category: undefined,
            },
            {
              style: "deepObject",
            },
          ),
        ).toEqual([["filter[type]", "active"]]);
      });
    });
  });

  describe("serializePathParam", () => {
    describe("simple style (default)", () => {
      it("should serialize primitive values", () => {
        expect(serializePathParam("id", "123")).toBe("123");
        expect(serializePathParam("count", 42)).toBe("42");
        expect(serializePathParam("active", true)).toBe("true");
      });

      it("should handle null and undefined values", () => {
        expect(serializePathParam("id", null)).toBe("");
        expect(serializePathParam("id", undefined)).toBe("");
      });

      it("should serialize arrays with comma delimiter", () => {
        expect(serializePathParam("tags", ["red", "green", "blue"])).toBe(
          "red,green,blue",
        );
      });

      it("should serialize objects with explode=false", () => {
        expect(serializePathParam("user", { name: "John", age: 30 })).toBe(
          "name,John,age,30",
        );
      });

      it("should serialize objects with explode=true", () => {
        expect(
          serializePathParam(
            "user",
            { name: "John", age: 30 },
            {
              explode: true,
            },
          ),
        ).toBe("name=John,age=30");
      });

      it("should handle empty arrays", () => {
        expect(serializePathParam("tags", [])).toBe("");
      });

      it("should handle empty objects", () => {
        expect(serializePathParam("user", {})).toBe("");
      });
    });

    describe("label style", () => {
      it("should serialize primitive values with dot prefix", () => {
        expect(serializePathParam("id", "123", { style: "label" })).toBe(
          ".123",
        );
      });

      it("should serialize arrays with explode=false", () => {
        expect(
          serializePathParam("tags", ["red", "green", "blue"], {
            style: "label",
            explode: false,
          }),
        ).toBe(".red,green,blue");
      });

      it("should serialize arrays with explode=true", () => {
        expect(
          serializePathParam("tags", ["red", "green", "blue"], {
            style: "label",
            explode: true,
          }),
        ).toBe(".red.green.blue");
      });

      it("should serialize objects with explode=false", () => {
        expect(
          serializePathParam(
            "user",
            { name: "John", age: 30 },
            {
              style: "label",
              explode: false,
            },
          ),
        ).toBe(".name,John,age,30");
      });

      it("should serialize objects with explode=true", () => {
        expect(
          serializePathParam(
            "user",
            { name: "John", age: 30 },
            {
              style: "label",
              explode: true,
            },
          ),
        ).toBe(".name=John.age=30");
      });
    });

    describe("matrix style", () => {
      it("should serialize primitive values with semicolon and parameter name", () => {
        expect(serializePathParam("id", "123", { style: "matrix" })).toBe(
          ";id=123",
        );
      });

      it("should serialize arrays with explode=false", () => {
        expect(
          serializePathParam("tags", ["red", "green", "blue"], {
            style: "matrix",
            explode: false,
          }),
        ).toBe(";tags=red,green,blue");
      });

      it("should serialize arrays with explode=true", () => {
        expect(
          serializePathParam("tags", ["red", "green", "blue"], {
            style: "matrix",
            explode: true,
          }),
        ).toBe(";tags=red;tags=green;tags=blue");
      });

      it("should serialize objects with explode=false", () => {
        expect(
          serializePathParam(
            "user",
            { name: "John", age: 30 },
            {
              style: "matrix",
              explode: false,
            },
          ),
        ).toBe(";user=name,John,age,30");
      });

      it("should serialize objects with explode=true", () => {
        expect(
          serializePathParam(
            "user",
            { name: "John", age: 30 },
            {
              style: "matrix",
              explode: true,
            },
          ),
        ).toBe(";name=John;age=30");
      });
    });
  });

  describe("serializeHeaderParam", () => {
    describe("simple style (only supported style)", () => {
      it("should serialize primitive values", () => {
        expect(serializeHeaderParam("X-Custom", "value")).toBe("value");
        expect(serializeHeaderParam("X-Count", 42)).toBe("42");
        expect(serializeHeaderParam("X-Active", true)).toBe("true");
      });

      it("should handle null and undefined values", () => {
        expect(serializeHeaderParam("X-Custom", null)).toBe("");
        expect(serializeHeaderParam("X-Custom", undefined)).toBe("");
      });

      it("should serialize arrays with comma delimiter", () => {
        expect(serializeHeaderParam("X-Tags", ["red", "green", "blue"])).toBe(
          "red,green,blue",
        );
      });

      it("should serialize objects with explode=false (default)", () => {
        expect(serializeHeaderParam("X-User", { name: "John", age: 30 })).toBe(
          "name,John,age,30",
        );
      });

      it("should serialize objects with explode=true", () => {
        expect(
          serializeHeaderParam(
            "X-User",
            { name: "John", age: 30 },
            {
              explode: true,
            },
          ),
        ).toBe("name=John,age=30");
      });

      it("should handle empty arrays", () => {
        expect(serializeHeaderParam("X-Tags", [])).toBe("");
      });

      it("should handle empty objects", () => {
        expect(serializeHeaderParam("X-User", {})).toBe("");
      });

      it("should filter out null and undefined values from arrays", () => {
        expect(
          serializeHeaderParam("X-Tags", ["red", null, "blue", undefined]),
        ).toBe("red,blue");
      });

      it("should filter out null and undefined values from objects", () => {
        expect(
          serializeHeaderParam("X-User", {
            name: "John",
            age: null,
            city: undefined,
          }),
        ).toBe("name,John");
      });
    });
  });

  describe("edge cases and type conversion", () => {
    it("should convert numbers to strings consistently", () => {
      expect(serializeQueryParam("num", 0)).toEqual([["num", "0"]]);
      expect(serializeQueryParam("num", -1)).toEqual([["num", "-1"]]);
      expect(serializeQueryParam("num", 3.14)).toEqual([["num", "3.14"]]);
      expect(serializePathParam("num", 0)).toBe("0");
      expect(serializeHeaderParam("X-Num", 0)).toBe("0");
    });

    it("should convert booleans to strings consistently", () => {
      expect(serializeQueryParam("bool", false)).toEqual([["bool", "false"]]);
      expect(serializePathParam("bool", false)).toBe("false");
      expect(serializeHeaderParam("X-Bool", false)).toBe("false");
    });

    it("should handle complex nested structures", () => {
      const complexObject = {
        user: {
          name: "John",
          settings: { theme: "dark", notifications: true },
        },
        tags: ["work", "important"],
        count: 42,
      };

      // For deepObject style, only the top level should be serialized
      expect(
        serializeQueryParam("data", complexObject, { style: "deepObject" }),
      ).toEqual([
        ["data[user]", "[object Object]"],
        ["data[tags]", "work,important"],
        ["data[count]", "42"],
      ]);
    });

    it("should handle arrays of objects", () => {
      const arrayOfObjects = [
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ];

      expect(serializeQueryParam("users", arrayOfObjects)).toEqual([
        ["users", "[object Object]"],
        ["users", "[object Object]"],
      ]);
    });

    it("should handle special characters in values", () => {
      expect(serializeQueryParam("query", "hello world & more")).toEqual([
        ["query", "hello world & more"],
      ]);
      expect(serializePathParam("path", "hello/world")).toBe("hello/world");
      expect(serializeHeaderParam("X-Header", "value with spaces")).toBe(
        "value with spaces",
      );
    });
  });
});
