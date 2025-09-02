import { describe, it, expect } from "vitest";
import {
  configureOperations,
  globalConfig,
  type ApiResponseWithParse,
  type ApiResponseWithForcedParse,
} from "../integrations/generated/client/config.js";
import { testMultiContentTypes } from "../integrations/generated/client/testMultiContentTypes.js";

// These tests rely on TypeScript compile-time; runtime just sanity checks functions exist.
describe("configureOperations typing", () => {
  it("binds operations without parsed when forceValidation omitted (default false)", () => {
    const { forceValidation, ...cfg } = globalConfig; // strip optional prop to avoid matching literal overloads
    const api = configureOperations({ testMultiContentTypes }, cfg);
    expect(typeof api.testMultiContentTypes).toBe("function");
    type Resp = Awaited<ReturnType<typeof api.testMultiContentTypes>>;
    type HasParsed<T> = T extends { parsed: any } ? true : false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type _ExpectNoParsed =
      HasParsed<Extract<Resp, { success: true }>> extends false ? true : never;
  });

  it("binds operations with parse() when forceValidation=false literal", () => {
    const api = configureOperations(
      { testMultiContentTypes },
      { ...globalConfig, forceValidation: false },
    );
    expect(typeof api.testMultiContentTypes).toBe("function");
    type Resp = Awaited<ReturnType<typeof api.testMultiContentTypes>>;
    type HasTopLevelParsed<T> = T extends { parsed: any } ? true : false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type _ExpectNoParsed =
      HasTopLevelParsed<Extract<Resp, { success: true }>> extends false
        ? true
        : never;
  });

  it("binds operations with parsed when forceValidation=true literal", () => {
    const api = configureOperations(
      { testMultiContentTypes },
      { ...globalConfig, forceValidation: true },
    );
    expect(typeof api.testMultiContentTypes).toBe("function");
    type Resp = Awaited<ReturnType<typeof api.testMultiContentTypes>>;
    type HasTopLevelParsed<T> = T extends { parsed: any } ? true : false;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type _ExpectParsed =
      HasTopLevelParsed<Extract<Resp, { success: true }>> extends true
        ? true
        : never;
  });
});
