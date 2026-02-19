/**
 * Tests for API base URL selection in lib/api.ts.
 *
 * API_BASE is a module-level constant evaluated at import time, so each test
 * uses jest.resetModules() + dynamic import to get a fresh module instance
 * with the desired env var state.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("API_BASE selection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("uses NEXT_PUBLIC_API_URL when set", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api";

    const { fetchAgents } = await import("../lib/api");
    await fetchAgents();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/api/war-room/agents"
    );
  });

  it("falls back to localhost:8000 when NEXT_PUBLIC_API_URL is absent", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    const { fetchAgents } = await import("../lib/api");
    await fetchAgents();

    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/war-room/agents"
    );
  });
});
