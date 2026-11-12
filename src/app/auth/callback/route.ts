import { supabase } from "@/lib/server/supabase";
import {
  errorResponse,
  requireLive,
  result,
  selectOrganization,
} from "@/lib/server/security";
import { HttpError } from "@/lib/http";
import { z } from "zod";
import { siteOrigin } from "@/lib/env";
export async function GET(request: Request) {
  try {
    requireLive();
    const url = new URL(request.url);
    const db = await supabase();
    const code = url.searchParams.get("code");
    const token_hash = url.searchParams.get("token_hash");
    const type = z
      .enum(["email", "signup", "recovery"])
      .safeParse(url.searchParams.get("type"));
    if (code) {
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (error) throw new HttpError(400, "invalid_auth_link");
    } else if (token_hash && type.success) {
      const { error } = await db.auth.verifyOtp({
        token_hash,
        type: type.data,
      });
      if (error) throw new HttpError(400, "invalid_auth_link");
    } else throw new HttpError(400, "invalid_auth_link");
    await selectOrganization(result(await db.rpc("ensure_workspace")));
    const destination =
      url.searchParams.get("next") === "reset" ||
      (type.success && type.data === "recovery")
        ? "/reset-password"
        : "/dashboard";
    return Response.redirect(new URL(destination, siteOrigin()), 303);
  } catch (e) {
    return errorResponse(e);
  }
}
