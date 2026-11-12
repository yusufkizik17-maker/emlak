import { z } from "zod";
import { siteOrigin } from "@/lib/env";
import { cookies } from "next/headers";
import { supabase } from "@/lib/server/supabase";
import {
  checkOrigin,
  errorResponse,
  requireLive,
  result,
  selectOrganization,
} from "@/lib/server/security";
import { HttpError, readJson } from "@/lib/http";
const email = z.email().max(254);
const password = z.string().min(12).max(128);
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("login"),
      email,
      password: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      action: z.literal("register"),
      email,
      password,
      full_name: z.string().trim().min(2).max(120),
    })
    .strict(),
  z.object({ action: z.literal("forgot"), email }).strict(),
  z.object({ action: z.literal("reset"), password }).strict(),
  z.object({ action: z.literal("logout") }).strict(),
]);
export async function POST(request: Request) {
  try {
    requireLive();
    checkOrigin(request);
    const input = schema.parse(await readJson(request, 4000));
    const db = await supabase();
    const origin = siteOrigin();
    if (input.action === "login") {
      const response = await db.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (response.error || !response.data.user)
        throw new HttpError(400, "authentication_failed");
      await selectOrganization(result(await db.rpc("ensure_workspace")));
    } else if (input.action === "register") {
      const response = await db.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.full_name },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });
      if (response.error) throw new HttpError(400, "registration_unavailable");
      if (response.data.session)
        await selectOrganization(result(await db.rpc("ensure_workspace")));
    } else if (input.action === "forgot") {
      // Supabase enforces public Auth rate limits; always return a neutral response.
      await db.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${origin}/auth/callback?next=reset`,
      });
    } else if (input.action === "reset") {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new HttpError(401, "authentication_required");
      const { error } = await db.auth.updateUser({ password: input.password });
      if (error) throw new HttpError(400, "password_update_failed");
      await db.auth.signOut();
    } else {
      await db.auth.signOut();
      (await cookies()).delete("leadpilot.organization");
    }
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
