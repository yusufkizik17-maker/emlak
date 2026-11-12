import { z } from "zod";

const modeSchema = z.enum(["demo", "live"]).default("demo");

// Explicit selection: unknown values must never silently enable demo or live mode.
export function parseAppMode(value: unknown) {
  return modeSchema.parse(value);
}
