import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  getCookie: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.getCookie }),
}));
vi.mock("./supabase", () => ({
  supabase: async () => ({
    auth: { getUser: mocks.getUser },
    rpc: mocks.rpc,
    from: mocks.from,
  }),
}));
import { context, checkOrigin, requireManager } from "./security";
beforeEach(() => {
  vi.stubEnv("APP_MODE", "live");
  vi.stubEnv("APP_URL", "https://leadpilot.example");
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-a" } },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.getCookie.mockReturnValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("server authorisation", () => {
  it("requires a verified user before any database access", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(context("read")).rejects.toMatchObject({ status: 401 });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rechecks selected organization membership with the authenticated user", async () => {
    const org = "10000000-0000-4000-8000-000000000001";
    mocks.getCookie.mockReturnValue({ value: org });
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(chain);
    await expect(context("write")).rejects.toMatchObject({ status: 403 });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(chain.eq).toHaveBeenCalledWith("organization_id", org);
  });
  it("fails closed if the rate-limit database is unavailable or exhausted", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(context("ai")).rejects.toMatchObject({ status: 429 });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "unavailable" },
    });
    await expect(context("write")).rejects.toMatchObject({ status: 400 });
  });
  it("does not permit remote persistence in demo mode", async () => {
    vi.stubEnv("APP_MODE", "demo");
    await expect(context("write")).rejects.toMatchObject({ status: 409 });
  });
  it("checks origin against configured application origin, not client-selected organization", () => {
    expect(() =>
      checkOrigin(
        new Request("https://internal/api", {
          headers: { Origin: "https://attacker.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      checkOrigin(
        new Request("https://internal/api", {
          headers: { Origin: "https://leadpilot.example" },
        }),
      ),
    ).not.toThrow();
    expect(() => requireManager("member")).toThrow();
    expect(() => requireManager("admin", true)).toThrow();
    expect(() => requireManager("owner", true)).not.toThrow();
  });
});
