import { analysisInput } from "@/lib/domain";
import { aiRequest, parseAnalysis } from "@/lib/ai";
import { aiConfig } from "@/lib/env";
import { HttpError, readJson } from "@/lib/http";
import {
  checkOrigin,
  context,
  errorResponse,
  result,
} from "@/lib/server/security";
export const runtime = "nodejs";
export const maxDuration = 40;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = analysisInput.parse(await readJson(request, 18000));
    const { db, organizationId: org } = await context("ai");
    const config = aiConfig();
    const lead = result(
      await db
        .from("leads")
        .select("id")
        .eq("organization_id", org)
        .eq("id", input.lead_id)
        .maybeSingle(),
    );
    if (!lead) throw new HttpError(404, "not_found");
    // Reserve before the paid operation. Failed/aborted requests still consume quota, preventing retry cost amplification.
    const reservation = await db.rpc("reserve_ai", {
      p_org: org,
      p_lead: input.lead_id,
    });
    if (reservation.error)
      throw new HttpError(429, "ai_quota_or_reservation_unavailable");
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...aiRequest(input.message, input.language, config.model),
          store: false,
        }),
        signal: AbortSignal.timeout(25000),
        cache: "no-store",
      });
    } catch {
      throw new HttpError(504, "ai_timeout");
    }
    if (!response.ok)
      throw new HttpError(
        response.status === 429 ? 429 : 502,
        "ai_provider_unavailable",
      );
    const payload = await response.json();
    const choice = payload.choices?.[0];
    if (
      choice?.finish_reason !== "stop" ||
      choice.message?.refusal ||
      typeof choice.message?.content !== "string"
    )
      throw new HttpError(502, "ai_incomplete_or_refused");
    let analysis;
    try {
      analysis = parseAnalysis(choice.message.content, input.message);
    } catch {
      throw new HttpError(502, "ai_invalid_output");
    }
    result(
      await db.rpc("store_ai_analysis", {
        p_org: org,
        p_run: reservation.data,
        p_lead: input.lead_id,
        p_message: input.message,
        p_analysis: analysis,
      }),
    );
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
