import type { ParameterObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  analyzeParameters,
  determineParameterOptionalityRules,
  determineParameterStructure,
  processParameterGroups,
} from "../../src/client-generator/parameters.js";
import type { ParameterGroups } from "../../src/client-generator/models/parameter-models.js";

describe("parameter logic functions", () => {
  const samplePathParam: ParameterObject = {
    in: "path",
    name: "userId",
    required: true,
    schema: { type: "string" },
  };

  const sampleQueryParam: ParameterObject = {
    in: "query",
    name: "filter",
    required: false,
    schema: { type: "string" },
  };

  const sampleHeaderParam: ParameterObject = {
    in: "header",
    name: "X-API-Version",
    required: true,
    schema: { type: "string" },
  };

  const sampleParameterGroups: ParameterGroups = {
    pathParams: [samplePathParam],
    queryParams: [sampleQueryParam],
    headerParams: [sampleHeaderParam],
  };

  describe("processParameterGroups", () => {
    it("should determine query optionality correctly", () => {
      const result = processParameterGroups(sampleParameterGroups);
      expect(result.isQueryOptional).toBe(true); // all query params are optional
      
      const requiredQueryGroups: ParameterGroups = {
        ...sampleParameterGroups,
        queryParams: [{ ...sampleQueryParam, required: true }],
      };
      const resultRequired = processParameterGroups(requiredQueryGroups);
      expect(resultRequired.isQueryOptional).toBe(false);
    });

    it("should determine header optionality correctly", () => {
      const result = processParameterGroups(sampleParameterGroups);
      expect(result.isHeadersOptional).toBe(false); // header is required
      
      const optionalHeaderGroups: ParameterGroups = {
        ...sampleParameterGroups,
        headerParams: [{ ...sampleHeaderParam, required: false }],
      };
      const resultOptional = processParameterGroups(optionalHeaderGroups);
      expect(resultOptional.isHeadersOptional).toBe(true);
    });

    it("should include security headers in result", () => {
      const securityHeaders = [{
        headerName: "Authorization",
        isRequired: true,
        schemeName: "bearerAuth",
      }];
      
      const result = processParameterGroups(sampleParameterGroups, securityHeaders);
      expect(result.securityHeaders).toEqual(securityHeaders);
      expect(result.isHeadersOptional).toBe(false); // required security header
    });
  });

  describe("determineParameterStructure", () => {
    it("should create parameter structure correctly", () => {
      const result = determineParameterStructure(
        sampleParameterGroups,
        true,
        { typeName: "UserCreateRequest", isRequired: true },
        undefined,
        true,
        false,
        "RequestMap",
        undefined,
      );
      
      expect(result.hasBody).toBe(true);
      expect(result.hasRequestMap).toBe(true);
      expect(result.hasResponseMap).toBe(false);
      expect(result.requestMapTypeName).toBe("RequestMap");
      expect(result.bodyTypeInfo?.typeName).toBe("UserCreateRequest");
    });
  });

  describe("determineParameterOptionalityRules", () => {
    it("should determine optionality rules correctly", () => {
      const structure = determineParameterStructure(
        sampleParameterGroups,
        true,
        { typeName: "UserCreateRequest", isRequired: false },
      );
      
      const rules = determineParameterOptionalityRules(structure);
      
      expect(rules.isQueryOptional).toBe(true);
      expect(rules.isHeadersOptional).toBe(false);
      expect(rules.isBodyOptional).toBe(true); // body not required
    });
  });

  describe("analyzeParameters", () => {
    it("should analyze parameters comprehensively", () => {
      const analysis = analyzeParameters(
        sampleParameterGroups,
        true,
        { typeName: "UserCreateRequest", isRequired: true },
      );
      
      expect(analysis.pathProperties).toEqual(["userId"]);
      expect(analysis.queryProperties).toEqual([
        { name: "filter", isRequired: false },
      ]);
      expect(analysis.headerProperties).toEqual([
        { 
          name: "X-API-Version", 
          isRequired: true, 
          varName: "XAPIVersion", 
          needsQuoting: true 
        },
      ]);
      expect(analysis.securityHeaderProperties).toEqual([]);
    });

    it("should handle security headers correctly", () => {
      const securityHeaders = [{
        headerName: "Authorization",
        isRequired: true,
        schemeName: "bearerAuth",
      }];
      
      const analysis = analyzeParameters(
        sampleParameterGroups,
        false,
        undefined,
        securityHeaders,
      );
      
      expect(analysis.securityHeaderProperties).toEqual([
        { 
          headerName: "Authorization", 
          isRequired: true, 
          varName: "Authorization" 
        },
      ]);
    });

    it("should handle header names that need quoting", () => {
      const specialHeaderGroups: ParameterGroups = {
        pathParams: [],
        queryParams: [],
        headerParams: [
          {
            in: "header",
            name: "Content-Type",
            required: true,
            schema: { type: "string" },
          },
          {
            in: "header",
            name: "simpleheader",
            required: false,
            schema: { type: "string" },
          },
        ],
      };
      
      const analysis = analyzeParameters(specialHeaderGroups, false);
      
      expect(analysis.headerProperties).toEqual([
        { 
          name: "Content-Type", 
          isRequired: true, 
          varName: "ContentType", 
          needsQuoting: true 
        },
        { 
          name: "simpleheader", 
          isRequired: false, 
          varName: "simpleheader", 
          needsQuoting: false 
        },
      ]);
    });
  });
});