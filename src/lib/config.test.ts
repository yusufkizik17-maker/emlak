import { describe, expect, it } from "vitest";
import { parseAppMode } from "./config";

describe("explicit application mode", () => {
  it("defaults to demo when unconfigured", () =>
    expect(parseAppMode(undefined)).toBe("demo"));
  it("accepts explicit modes", () => {
    expect(parseAppMode("demo")).toBe("demo");
    expect(parseAppMode("live")).toBe("live");
  });
  it("rejects invalid configuration instead of falling back", () => {
    for (const value of ["", "production", "DEMO", null]) {
      expect(() => parseAppMode(value)).toThrow();
    }
  });
});
