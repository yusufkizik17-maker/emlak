import { z } from "zod";
import { aiConfig } from "@/lib/env";
import { HttpError, readJson } from "@/lib/http";
import {
  checkOrigin,
  context,
  errorResponse,
  result,
} from "@/lib/server/security";
import { copilotRequest, parseCopilot } from "@/lib/copilot-ai";
export const runtime = "nodejs";
export const maxDuration = 40;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = z
      .object({ conversation_id: z.uuid(), language: z.enum(["tr", "en"]) })
      .strict()
      .parse(await readJson(request, 1000));
    const { db, organizationId: org } = await context("ai");
    const config = aiConfig();
    const conversation = result(
      await db
        .from("conversations")
        .select("lead_id")
        .eq("organization_id", org)
        .eq("id", input.conversation_id)
        .maybeSingle(),
    );
    if (!conversation) throw new HttpError(404, "not_found");
    const messages = result(
      await db
        .from("lead_messages")
        .select("id,content")
        .eq("organization_id", org)
        .eq("conversation_id", input.conversation_id)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(101),
    );
    if (!messages?.length) throw new HttpError(400, "no_incoming_messages");
    const source = [...messages]
      .reverse()
      .map((m) => m.content)
      .join("\n");
    // Reject oversized context rather than silently forgetting previously supplied needs.
    if (messages.length > 100 || source.length > 8000)
      throw new HttpError(413, "conversation_context_too_large");
    const reservation = await db.rpc("reserve_ai", {
      p_org: org,
      p_lead: conversation.lead_id,
    });
    if (reservation.error) throw new HttpError(429, "ai_quota");
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          copilotRequest(source, input.language, config.model),
        ),
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
      throw new HttpError(502, "ai_invalid_output");
    let analysis;
    try {
      analysis = parseCopilot(choice.message.content, source);
    } catch {
      throw new HttpError(502, "ai_invalid_output");
    }
    result(
      await db.rpc("save_copilot", {
        p_org: org,
        p_conversation: input.conversation_id,
        p_run: reservation.data,
        p_analysis: analysis,
        p_last_message: messages[0].id,
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
