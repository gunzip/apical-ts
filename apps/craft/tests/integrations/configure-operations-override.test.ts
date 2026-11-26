import { describe, expect, it, vi } from "vitest";

import {
  configureOperations,
  globalConfig,
} from "./generated/client/runtime.ts";
import { testMultiContentTypes } from "./generated/client/testMultiContentTypes.ts";
import { testSimplePatch } from "./generated/client/testSimplePatch.ts";

describe("configureOperations per-call config overrides", () => {
  it("merges per-call header overrides without mutating bound config", async () => {
    const seenRequests: Array<{
      url: string;
      headers: HeadersInit | undefined;
    }> = [];
    const boundFetch: typeof fetch = vi.fn(async (input, init) => {
      seenRequests.push({
        url: String(input),
        headers: init?.headers,
      });
      return new Response(null, { status: 200 });
    });

    const boundHeaders = { "custom-token": "bound-token" };
    const api = configureOperations(
      { testSimplePatch },
      {
        ...globalConfig,
        baseURL: "https://bound.example.com",
        fetch: boundFetch,
        headers: boundHeaders,
        forceValidation: true,
      },
    );

    const first = await api.testSimplePatch(
      {},
      { headers: { "custom-token": "override-token" } },
    );
    const second = await api.testSimplePatch();

    expect(first.isValid).toBe(true);
    expect(second.isValid).toBe(true);
    expect(boundHeaders["custom-token"]).toBe("bound-token");
    expect(seenRequests[0]?.headers).toMatchObject({
      "custom-token": "override-token",
    });
    expect(seenRequests[1]?.headers).toMatchObject({
      "custom-token": "bound-token",
    });
  });

  it("overrides baseURL and fetch only for the single overridden call", async () => {
    const boundFetch: typeof fetch = vi.fn(
      async () => new Response(null, { status: 200 }),
    );
    const overrideFetch: typeof fetch = vi.fn(
      async () => new Response(null, { status: 200 }),
    );

    const api = configureOperations(
      { testSimplePatch },
      {
        ...globalConfig,
        baseURL: "https://bound.example.com",
        fetch: boundFetch,
        headers: { "custom-token": "bound-token" },
      },
    );

    await api.testSimplePatch(undefined, {
      baseURL: "https://override.example.com",
      fetch: overrideFetch,
    });
    await api.testSimplePatch();

    expect(overrideFetch).toHaveBeenCalledTimes(1);
    expect(overrideFetch).toHaveBeenCalledWith(
      "https://override.example.com/test-simple",
      expect.any(Object),
    );
    expect(boundFetch).toHaveBeenCalledTimes(1);
    expect(boundFetch).toHaveBeenCalledWith(
      "https://bound.example.com/test-simple",
      expect.any(Object),
    );
  });

  it("preserves forceValidation type narrowing and runtime behavior with overrides", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ id: "1", name: "Widget" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const forcedApi = configureOperations(
      { testMultiContentTypes },
      {
        ...globalConfig,
        baseURL: "https://bound.example.com",
        fetch: mockFetch,
        forceValidation: true,
      },
    );

    const forcedResp = await forcedApi.testMultiContentTypes(
      { body: { id: "1", name: "Widget" } },
      { baseURL: "https://override.example.com" },
    );

    expect(forcedResp.isValid).toBe(true);
    if (forcedResp.isValid && forcedResp.status === "200") {
      expect(forcedResp.parsed.data).toEqual({ id: "1", name: "Widget" });
    }

    const manualApi = configureOperations(
      { testMultiContentTypes },
      {
        ...globalConfig,
        baseURL: "https://bound.example.com",
        fetch: mockFetch,
        forceValidation: false,
      },
    );

    const manualResp = await manualApi.testMultiContentTypes(
      { body: { id: "1", name: "Widget" } },
      { baseURL: "https://override.example.com" },
    );

    expect(manualResp.isValid).toBe(true);
    if (manualResp.isValid && manualResp.status === "200") {
      expect(manualResp).toHaveProperty("parse");
      const parsed = await manualResp.parse();
      expect("parsed" in parsed && parsed.parsed).toEqual({
        id: "1",
        name: "Widget",
      });
    }
  });
});
