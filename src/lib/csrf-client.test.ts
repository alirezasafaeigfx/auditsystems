import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchCSRFHeaders, resetCSRFToken } from "./csrf-client";

const originalFetch = global.fetch;

beforeEach(() => {
  resetCSRFToken();
});

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchCSRFHeaders", () => {
  it("returns headers with token and headerName from API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ token: "abc123", headerName: "x-csrf-token" }),
    });

    const headers = await fetchCSRFHeaders();
    expect(headers).toEqual({ "x-csrf-token": "abc123" });
  });

  it("returns fallback header on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    const headers = await fetchCSRFHeaders();
    expect(headers).toEqual({ "x-csrf-token": "" });
  });

  it("caches the token across multiple calls", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ token: "cached-token", headerName: "x-csrf-token" }),
    });
    global.fetch = mockFetch;

    await fetchCSRFHeaders();
    await fetchCSRFHeaders();

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches a new token after reset", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ token: "fresh-token", headerName: "x-csrf-token" }),
    });
    global.fetch = mockFetch;

    await fetchCSRFHeaders();
    resetCSRFToken();
    await fetchCSRFHeaders();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns fallback header when API returns non-JSON response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.reject(new Error("invalid json")),
    });

    const headers = await fetchCSRFHeaders();
    expect(headers).toEqual({ "x-csrf-token": "" });
  });
});

describe("resetCSRFToken", () => {
  it("clears the cached promise", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ token: "token1", headerName: "x-csrf-token" }),
    });
    global.fetch = mockFetch;

    await fetchCSRFHeaders();
    resetCSRFToken();
    await fetchCSRFHeaders();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
