import { describe, expect, it } from "vitest";

import { MappedCat } from "./generated/schemas/MappedCat.ts";
import { MappedDog } from "./generated/schemas/MappedDog.ts";
import { MappedPet } from "./generated/schemas/MappedPet.ts";

describe("Discriminator mapping without member const/enum (issue #194)", () => {
  it("should not throw while building the union", () => {
    expect(() =>
      MappedPet.safeParse({ petType: "cat", meow: true }),
    ).not.toThrow();
  });

  it("should accept payloads matching a mapping key", () => {
    expect(MappedPet.safeParse({ petType: "cat", meow: true }).success).toBe(
      true,
    );
    expect(MappedPet.safeParse({ petType: "dog", bark: true }).success).toBe(
      true,
    );
  });

  it("should reject payloads matching another mapping member", () => {
    const result = MappedPet.safeParse({ petType: "cat", bark: true });
    expect(result.success).toBe(false);
  });

  it("should reject payloads with an unmapped discriminator value", () => {
    const result = MappedPet.safeParse({ petType: "bird", meow: true });
    expect(result.success).toBe(false);
  });

  it("should validate through the standard schema interface", () => {
    const result = MappedPet["~standard"].validate({
      petType: "dog",
      bark: true,
    });
    expect(result).not.toBeInstanceOf(Promise);
    expect("issues" in result).toBe(false);
  });

  it("should keep mapped member schemas free of narrowing", () => {
    /* Component schemas keep their own discriminator type. */
    expect(MappedCat.safeParse({ petType: "dog", meow: true }).success).toBe(
      true,
    );
    expect(MappedDog.safeParse({ petType: "cat", bark: true }).success).toBe(
      true,
    );
  });
});
