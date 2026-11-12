import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import { getAppMode, siteOrigin } from "@/lib/env";
import { HttpError, verifyOrigin } from "@/lib/http";
import { supabase } from "./supabase";
export function requireLive() {
  if (getAppMode() !== "live")
    throw new HttpError(409, "demo_has_no_remote_storage");
}
export function checkOrigin(request: Request) {
  verifyOrigin(request.headers.get("origin"), siteOrigin());
}
export function result<T>(response: { data: T; error: unknown }): T {
  if (response.error) throw new HttpError(400, "database_operation_failed");
  return response.data;
}
export async function context(bucket: "read" | "write" | "ai") {
  requireLive();
  const db = await supabase();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new HttpError(401, "authentication_required");
  const allowed = result(await db.rpc("take_rate_limit", { p_bucket: bucket }));
  if (!allowed) throw new HttpError(429, "rate_limit");
  const selected = (await cookies()).get("leadpilot.organization")?.value;
  let q = db
    .from("memberships")
    .select("organization_id, role")
    .eq("user_id", user.id);
  if (selected && z.uuid().safeParse(selected).success)
    q = q.eq("organization_id", selected);
  const memberships = result(await q.order("created_at").limit(1));
  const membership = memberships?.[0];
  if (!membership) throw new HttpError(403, "membership_required");
  return {
    db,
    user,
    organizationId: membership.organization_id as string,
    role: membership.role as "owner" | "admin" | "member",
  };
}
export function requireManager(role: string, ownerOnly = false) {
  if (role !== "owner" && (ownerOnly || role !== "admin"))
    throw new HttpError(403, "role_required");
}
export function errorResponse(error: unknown) {
  const status =
    error instanceof HttpError
      ? error.status
      : error instanceof z.ZodError
        ? 400
        : 503;
  const code =
    error instanceof HttpError
      ? error.code
      : error instanceof z.ZodError
        ? "invalid_input_or_configuration"
        : "service_unavailable";
  // Deliberately exclude raw error objects, database details and user content.
  if (status >= 500)
    console.error(JSON.stringify({ event: "request_failed", code, status }));
  return Response.json(
    { error: code },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
export async function selectOrganization(id: string) {
  (await cookies()).set("leadpilot.organization", id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
