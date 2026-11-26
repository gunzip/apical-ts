import { describe, expect, it, vi } from "vitest";
import {
  configureOperations,
  globalConfig,
  type GlobalConfig,
} from "./generated/client/runtime.ts";
import { testWithEmptyResponse } from "./generated/client/testWithEmptyResponse.ts";

describe("client custom and dynamic headers", () => {
  it("enforces required auth headers at compile time while allowing custom headers", () => {
    // @ts-expect-error required auth header "custom-token" must not be omitted
    const missingStaticAuth: GlobalConfig["headers"] = {
      "x-correlation-id": "corr-1",
    };

    const undefinedStaticAuth: GlobalConfig["headers"] = {
      // @ts-expect-error required auth header "custom-token" cannot be undefined
      "custom-token": undefined,
    };

    // @ts-expect-error required auth header "custom-token" must be returned by sync resolver
    const missingSyncAuth: GlobalConfig["headers"] = () => ({
      "x-correlation-id": "corr-2",
    });

    // @ts-expect-error required auth header "custom-token" must be returned by async resolver
    const missingAsyncAuth: GlobalConfig["headers"] = async () => ({
      "x-correlation-id": "corr-3",
    });

    const validStaticAuth: GlobalConfig["headers"] = {
      "custom-token": "secret",
      "x-correlation-id": "corr-4",
      "x-optional": undefined,
    };

    expect([
      missingStaticAuth,
      undefinedStaticAuth,
      missingSyncAuth,
      missingAsyncAuth,
      validStaticAuth,
    ]).toHaveLength(5);
  });

  it("forwards arbitrary custom headers alongside required auth headers and skips undefined values", async () => {
    // Arrange
    let capturedHeaders: Record<string, string> = {};
    const mockFetch: typeof fetch = vi.fn(async (_input, init) => {
      capturedHeaders = Object.fromEntries(
        new Headers(init?.headers).entries(),
      );
      return new Response(undefined, { status: 200 });
    });

    // Act
    const result = await testWithEmptyResponse(
      {},
      {
        ...globalConfig,
        baseURL: "https://example.test",
        fetch: mockFetch,
        headers: {
          "custom-token": "token-value",
          "x-correlation-id": "corr-123",
          "x-optional-omitted": undefined,
        },
      },
    );

    // Assert
    expect(result.isValid).toBe(true);
    expect(capturedHeaders["custom-token"]).toBe("token-value");
    expect(capturedHeaders["x-correlation-id"]).toBe("corr-123");
    expect("x-optional-omitted" in capturedHeaders).toBe(false);
  });

  it("invokes synchronous headers resolver fresh on every call", async () => {
    // Arrange
    const sentHeaders: Array<Record<string, string>> = [];
    const mockFetch: typeof fetch = vi.fn(async (_input, init) => {
      sentHeaders.push(
        Object.fromEntries(new Headers(init?.headers).entries()),
      );
      return new Response(undefined, { status: 200 });
    });
    let sequence = 0;
    const headerResolver = vi.fn(() => {
      sequence += 1;
      return {
        "custom-token": `sync-token-${sequence}`,
        "x-request-seq": String(sequence),
      };
    });

    const config = {
      ...globalConfig,
      baseURL: "https://example.test",
      fetch: mockFetch,
      headers: headerResolver,
    };

    // Act
    const first = await testWithEmptyResponse({}, config);
    const second = await testWithEmptyResponse({}, config);

    // Assert
    expect(first.isValid).toBe(true);
    expect(second.isValid).toBe(true);
    expect(headerResolver).toHaveBeenCalledTimes(2);
    expect(sentHeaders[0]?.["custom-token"]).toBe("sync-token-1");
    expect(sentHeaders[0]?.["x-request-seq"]).toBe("1");
    expect(sentHeaders[1]?.["custom-token"]).toBe("sync-token-2");
    expect(sentHeaders[1]?.["x-request-seq"]).toBe("2");
  });

  it("awaits async headers resolver on every call through configureOperations", async () => {
    // Arrange
    const sentHeaders: Array<Record<string, string>> = [];
    const mockFetch: typeof fetch = vi.fn(async (_input, init) => {
      sentHeaders.push(
        Object.fromEntries(new Headers(init?.headers).entries()),
      );
      return new Response(undefined, { status: 200 });
    });
    let sequence = 0;
    const asyncHeaderResolver = vi.fn(async () => {
      sequence += 1;
      await Promise.resolve();
      return {
        "custom-token": `async-token-${sequence}`,
        "x-tenant-id": `tenant-${sequence}`,
      };
    });

    const api = configureOperations(
      { testWithEmptyResponse },
      {
        baseURL: "https://example.test",
        fetch: mockFetch,
        headers: asyncHeaderResolver,
        forceValidation: true,
      },
    );

    // Act
    const first = await api.testWithEmptyResponse({});
    const second = await api.testWithEmptyResponse({});

    // Assert
    expect(first.isValid).toBe(true);
    expect(second.isValid).toBe(true);
    expect(asyncHeaderResolver).toHaveBeenCalledTimes(2);
    expect(sentHeaders[0]?.["custom-token"]).toBe("async-token-1");
    expect(sentHeaders[0]?.["x-tenant-id"]).toBe("tenant-1");
    expect(sentHeaders[1]?.["custom-token"]).toBe("async-token-2");
    expect(sentHeaders[1]?.["x-tenant-id"]).toBe("tenant-2");
  });

  it("merges async GlobalConfig.headers with static and dynamic per-call overrides", async () => {
    // Arrange
    const sentHeaders: Array<Record<string, string>> = [];
    const mockFetch: typeof fetch = vi.fn(async (_input, init) => {
      sentHeaders.push(
        Object.fromEntries(new Headers(init?.headers).entries()),
      );
      return new Response(undefined, { status: 200 });
    });
    let baseSeq = 0;

    const api = configureOperations(
      { testWithEmptyResponse },
      {
        baseURL: "https://example.test",
        fetch: mockFetch,
        headers: async () => {
          baseSeq += 1;
          return {
            "custom-token": `base-${baseSeq}`,
            "x-base": "from-base",
            "x-shared": "from-base",
          };
        },
        forceValidation: true,
      },
    );

    // Act
    await api.testWithEmptyResponse(
      {},
      {
        headers: {
          "x-shared": "from-static-override",
          "x-base": undefined,
        },
      },
    );
    await api.testWithEmptyResponse(
      {},
      {
        headers: async () => ({
          "custom-token": "override-token",
          "x-override": "dyn",
        }),
      },
    );
    await api.testWithEmptyResponse({});

    // Assert
    expect(sentHeaders[0]?.["custom-token"]).toBe("base-1");
    expect(sentHeaders[0]?.["x-shared"]).toBe("from-static-override");
    expect(sentHeaders[0]?.["x-base"]).toBe("from-base");

    expect(sentHeaders[1]?.["custom-token"]).toBe("override-token");
    expect(sentHeaders[1]?.["x-base"]).toBe("from-base");
    expect(sentHeaders[1]?.["x-shared"]).toBe("from-base");
    expect(sentHeaders[1]?.["x-override"]).toBe("dyn");

    expect(sentHeaders[2]?.["custom-token"]).toBe("base-3");
    expect(sentHeaders[2]?.["x-shared"]).toBe("from-base");
    expect("x-override" in (sentHeaders[2] ?? {})).toBe(false);
  });

  it("returns unexpected-error when a dynamic headers resolver throws or rejects", async () => {
    // Arrange
    const mockFetch: typeof fetch = vi.fn();
    const resolverError = new Error("token refresh failed");

    // Act
    const result = await testWithEmptyResponse(
      {},
      {
        ...globalConfig,
        baseURL: "https://example.test",
        fetch: mockFetch,
        headers: async () => {
          throw resolverError;
        },
      },
    );

    // Assert
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.kind).toBe("unexpected-error");
      expect(result.error).toBe(resolverError);
    }
  });
});
