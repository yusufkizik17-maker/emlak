import { describe, expect, it } from "vitest";
import { readJson, verifyOrigin } from "./http";
describe("HTTP request boundary", () => {
  it("rejects missing and cross-site origins", () => {
    expect(() => verifyOrigin(null, "https://leadpilot.example")).toThrow();
    expect(() =>
      verifyOrigin("https://attacker.example", "https://leadpilot.example"),
    ).toThrow();
    expect(() =>
      verifyOrigin("https://leadpilot.example", "https://leadpilot.example"),
    ).not.toThrow();
  });
  it("enforces content type, byte limit and JSON validity", async () => {
    await expect(
      readJson(new Request("https://test", { method: "POST", body: "test" })),
    ).rejects.toThrow("json_required");
    await expect(
      readJson(
        new Request("https://test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '"1234567890"',
        }),
        5,
      ),
    ).rejects.toThrow("body_too_large");
    await expect(
      readJson(
        new Request("https://test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toThrow("invalid_json");
    await expect(
      readJson(
        new Request("https://test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: '{"ok":true}',
        }),
      ),
    ).resolves.toEqual({ ok: true });
  });
});
