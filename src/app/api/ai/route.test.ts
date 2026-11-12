import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  rpc: vi.fn(),
  selectLead: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/security", () => ({
  checkOrigin: () => {},
  context: mocks.context,
  result: (r: { data: unknown; error: unknown }) => {
    if (r.error) throw new Error("db_failed");
    return r.data;
  },
  errorResponse: (e: { status?: number; code?: string }) =>
    Response.json({ error: e.code || "error" }, { status: e.status || 503 }),
}));
import { POST } from "./route";
import { demoAnalysis } from "@/lib/demo";
const lead_id = "10000000-0000-4000-8000-000000000001";
const makeRequest = () =>
  new Request("https://leadpilot.example/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lead_id,
      message: "I am looking for a home",
      language: "en",
    }),
  });
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-placeholder-not-a-real-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mocks.selectLead,
  };
  mocks.selectLead.mockResolvedValue({ data: { id: lead_id }, error: null });
  mocks.rpc.mockResolvedValue({ data: "reservation-id", error: null });
  mocks.context.mockResolvedValue({
    db: { from: () => chain, rpc: mocks.rpc },
    organizationId: "verified-org",
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
describe("AI route with mocked provider (no billable calls)", () => {
  it("reserves quota before the provider and stores only validated output", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      expect(mocks.rpc).toHaveBeenCalledWith("reserve_ai", expect.anything());
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(demoAnalysis("en")) },
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(makeRequest())).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "store_ai_analysis",
      expect.objectContaining({ p_org: "verified-org", p_lead: lead_id }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.max_completion_tokens).toBe(1200);
  });
  it("does not call the paid provider when quota is unavailable", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "quota" },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(makeRequest())).status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects tenant-mismatched leads before calling the provider", async () => {
    mocks.selectLead.mockResolvedValueOnce({ data: null, error: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(makeRequest())).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("handles refusal, truncated output, invalid JSON and provider errors without saving suggestions", async () => {
    for (const response of [
      Response.json({
        choices: [{ finish_reason: "length", message: { content: "{}" } }],
      }),
      Response.json({
        choices: [{ finish_reason: "stop", message: { refusal: "no" } }],
      }),
      Response.json({
        choices: [{ finish_reason: "stop", message: { content: "{}" } }],
      }),
      new Response("provider error", { status: 500 }),
    ]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response));
      expect((await POST(makeRequest())).status).toBe(502);
    }
    expect(mocks.rpc.mock.calls.every(([name]) => name === "reserve_ai")).toBe(
      true,
    );
  });
  it("handles timeouts without retrying the paid request", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new DOMException("Timeout", "TimeoutError"));
    vi.stubGlobal("fetch", fetchMock);
    expect((await POST(makeRequest())).status).toBe(504);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
