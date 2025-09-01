import { describe, it, expect } from "vitest";
import { formUrlEncode } from "./generated/client/config.js";

describe("formUrlEncode", () => {
  it("encodes arrays with repeat format by default", () => {
    const input = { tags: ["a", "b"], name: "john" };
    const result = formUrlEncode(input);
    // order is not guaranteed, so check both substrings
    expect(result).toContain("tags=a");
    expect(result).toContain("tags=b");
    expect(result).toContain("name=john");
  });

  it("encodes arrays with brackets when requested", () => {
    const input = { tags: ["x", "y"], age: 30 };
    const result = formUrlEncode(input, { arrayFormat: "brackets" });
    expect(result).toContain("tags%5B%5D=x"); // tags[]=x url-encoded
    expect(result).toContain("tags%5B%5D=y");
    expect(result).toContain("age=30");
  });

  it("stringifies nested objects", () => {
    const input = { meta: { a: 1 }, title: "t" };
    const result = formUrlEncode(input);
    expect(result).toContain("meta=");
    expect(result).toContain("title=t");
  });
});
