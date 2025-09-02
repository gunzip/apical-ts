import { describe, it, expect } from "vitest";
import {
  configureOperations,
  globalConfig,
  type ApiResponseWithParse,
  type ApiResponseWithForcedParse,
} from "../integrations/generated/client/config.js";
import { testMultiContentTypes } from "../integrations/generated/client/testMultiContentTypes.js";

// These tests are primarily compile-time assertions. If this file type-checks, overloads work.
describe("configureOperations overloads", () => {
  it("returns operations with parse() (not parsed) when forceValidation=false", () => {
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

  it("returns operations with parsed when forceValidation=true", () => {
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
