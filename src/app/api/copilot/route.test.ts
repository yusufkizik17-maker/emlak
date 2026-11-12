import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { demoCopilot } from "@/lib/inbox";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  rpc: vi.fn(),
  conversation: vi.fn(),
  messages: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/security", () => ({
  checkOrigin: () => {},
  context: mocks.context,
  result: (r: { data: unknown; error: unknown }) => {
    if (r.error) throw new Error("db");
    return r.data;
  },
  errorResponse: (e: { status?: number }) =>
    Response.json({ error: true }, { status: e.status || 503 }),
}));
import { POST } from "./route";
const conversation_id = "50000000-0000-4000-8000-000000000001";
const source = "Çanakkale merkezde 3 milyon TL 2+1 satılık daire arıyorum.";
const req = () =>
  new Request("https://test/api/copilot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id, language: "tr" }),
  });
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-placeholder-not-a-real-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-4.1-mini");
  mocks.conversation.mockResolvedValue({
    data: { lead_id: "verified-lead" },
    error: null,
  });
  mocks.messages.mockResolvedValue({
    data: [{ id: "latest-message", content: source }],
    error: null,
  });
  mocks.rpc.mockResolvedValue({ data: "reserved-id", error: null });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: mocks.conversation,
    limit: mocks.messages,
  };
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
it("reserves shared quota and saves the validated analysis with message version", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(demoCopilot(source, "tr")) },
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetchMock);
  expect((await POST(req())).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith("reserve_ai", {
    p_org: "verified-org",
    p_lead: "verified-lead",
  });
  expect(mocks.rpc).toHaveBeenCalledWith(
    "save_copilot",
    expect.objectContaining({
      p_org: "verified-org",
      p_conversation: conversation_id,
      p_last_message: "latest-message",
    }),
  );
});
it("does not call the provider for an inaccessible conversation", async () => {
  mocks.conversation.mockResolvedValueOnce({ data: null, error: null });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await POST(req())).status).toBe(404);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("rejects oversized history rather than silently forgetting known preferences", async () => {
  mocks.messages.mockResolvedValueOnce({
    data: [{ id: "last", content: "a".repeat(8001) }],
    error: null,
  });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await POST(req())).status).toBe(413);
  expect(fetchMock).not.toHaveBeenCalled();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("fails closed when quota reservation is unavailable", async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "quota" } });
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  expect((await POST(req())).status).toBe(429);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("does not save refused or invalid provider output", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({
          choices: [{ finish_reason: "stop", message: { refusal: "refused" } }],
        }),
      ),
  );
  expect((await POST(req())).status).toBe(502);
  expect(mocks.rpc.mock.calls.every(([name]) => name === "reserve_ai")).toBe(
    true,
  );
});
