import "server-only";
import { z } from "zod";
import { parseAppMode } from "./config";
export function getAppMode() {
  return parseAppMode(process.env.APP_MODE);
}
export function supabaseConfig() {
  return z
    .object({ url: z.url().startsWith("https://"), key: z.string().min(20) })
    .parse({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
}
export function aiConfig() {
  return z
    .object({
      key: z.string().min(10),
      model: z.enum(["gpt-4.1-mini", "gpt-4.1-nano"]).default("gpt-4.1-mini"),
    })
    .parse({
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || undefined,
    });
}

export function siteOrigin() {
  const value = z
    .url()
    .refine((raw) => {
      const url = new URL(raw);
      return (
        (url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    })
    .parse(process.env.APP_URL);
  return new URL(value).origin;
}
