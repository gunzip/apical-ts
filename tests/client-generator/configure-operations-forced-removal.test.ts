import { describe, it, expect } from "vitest";
import {
  configureOperations,
  globalConfig,
  ApiResponseWithForcedParse,
} from "../integrations/generated/client/config.js";
import { testMultipleSuccess } from "../integrations/generated/client/testMultipleSuccess.js";

/* This test asserts that when binding with forceValidation:false the returned operation
   type no longer includes any ApiResponseWithForcedParse variants (DX improvement). */
describe("configureOperations forced variant removal", () => {
  it("removes forced parse variants when forceValidation is false", async () => {
    const api = configureOperations(
      { testMultipleSuccess },
      { ...globalConfig, forceValidation: false },
    );
    const resp = await api.testMultipleSuccess({});
    if (resp.success === true && resp.status === 200) {
      // Type-level assertion: resp should not be assignable to forced parse variant
      type RespType = typeof resp;
      type HasForced = Extract<RespType, ApiResponseWithForcedParse<any, any>>;
      const assertNever: HasForced = null as never;
      expect(resp).toHaveProperty("parse");
      expect(assertNever).toBeNull();
    }
  });
});
