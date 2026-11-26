import { describe, expect, it, vi } from "vitest";
import {
  configureOperations,
  globalConfig,
} from "./generated/client/runtime.ts";
import { testWithEmptyResponse } from "./generated/client/testWithEmptyResponse.ts";

describe("client AbortSignal and dynamic/custom headers", () => {
  it("forwards AbortSignal to fetch and omits signal when not configured", async () => {
    // Arrange
    const capturedInits: Array<RequestInit | undefined> = [];
    const okFetch: typeof fetch = vi.fn(async (_input, init) => {
      capturedInits.push(init);
      if (init?.signal?.aborted) {
        throw init.signal.reason ?? new Error("Aborted");
      }
      return new Response(undefined, { status: 200 });
    });

    // Act - without signal
    const okResult = await testWithEmptyResponse(
      {},
      {
        ...globalConfig,
        baseURL: "https://example.test",
        fetch: okFetch,
        headers: { "custom-token": "secret" },
      },
    );

    // Act - with aborted signal
    const controller = new AbortController();
    controller.abort(new Error("request aborted"));
    const abortedResult = await testWithEmptyResponse(
      {},
      {
        ...globalConfig,
        baseURL: "https://example.test",
        fetch: okFetch,
        headers: { "custom-token": "secret" },
        signal: controller.signal,
      },
    );

    // Assert
    expect(okResult.isValid).toBe(true);
    expect(capturedInits[0]).toBeDefined();
    expect("signal" in (capturedInits[0] ?? {})).toBe(false);

    expect(capturedInits[1]?.signal).toBe(controller.signal);
    expect(abortedResult.isValid).toBe(false);
    if (!abortedResult.isValid) {
      expect(abortedResult.kind).toBe("fetch-error");
    }
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
});
