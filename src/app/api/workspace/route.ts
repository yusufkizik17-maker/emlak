import { mutationSchema, workspaceSchema } from "@/lib/domain";
import { readJson, HttpError } from "@/lib/http";
import {
  checkOrigin,
  context,
  errorResponse,
  requireManager,
  result,
  selectOrganization,
} from "@/lib/server/security";
export const runtime = "nodejs";
const leadColumns =
  "id,name,email,phone,status,location,property_type,budget,notes,created_at";
export async function GET(request: Request) {
  try {
    const { db, user, organizationId: org, role } = await context("read");
    const exporting = new URL(request.url).searchParams.get("export") === "1";
    if (exporting) requireManager(role);
    const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
    const dayStart = new Date(
      Date.parse(`${today}T00:00:00Z`) - 3 * 3600000,
    ).toISOString();
    const queries = await Promise.all([
      db
        .from("leads")
        .select(leadColumns)
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("tasks")
        .select("id,title,lead_id,due_at,completed,created_at")
        .eq("organization_id", org)
        .order("due_at")
        .limit(1000),
      db
        .from("ai_suggestions")
        .select("id,lead_id,analysis,approved_at,created_at")
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("audit_logs")
        .select("id,action,created_at")
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("organizations")
        .select("id,name,retention_days")
        .eq("id", org)
        .single(),
      db
        .from("profiles")
        .select("full_name,language")
        .eq("id", user.id)
        .single(),
      db
        .from("memberships")
        .select("organization_id,role,organizations(name)")
        .eq("user_id", user.id),
      db.rpc("list_members", { p_org: org }),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org),
      db
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org)
        .eq("status", "new"),
      db
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org)
        .eq("completed", false),
      db
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org)
        .eq("completed", true),
      db
        .from("conversations")
        .select(
          "id,lead_id,assignee_id,unread_count,awaiting_reply,state,updated_at,analysis",
        )
        .eq("organization_id", org)
        .order("updated_at", { ascending: false })
        .limit(1000),
      db
        .from("lead_messages")
        .select("id,lead_id,conversation_id,content,direction,state,created_at")
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("properties")
        .select(
          "id,title,city,district,price,currency,rooms,property_type,listing_type,elevator,floor,active",
        )
        .eq("organization_id", org)
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("lead_messages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org)
        .eq("direction", "inbound")
        .gte("created_at", dayStart),
      db
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org)
        .eq("awaiting_reply", true)
        .eq("state", "open"),
      db
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org)
        .not("analysis", "is", null),
      db
        .from("ai_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org),
      db
        .from("leads")
        .select("id,tasks!inner(id)", { count: "exact", head: true })
        .eq("organization_id", org)
        .eq("tasks.completed", false),
    ]);
    const values = queries.map((q) => result<unknown>(q));
    const payload = workspaceSchema.parse({
      leads: values[0],
      tasks: values[1],
      suggestions: values[2],
      activities: values[3],
      organization: values[4],
      profile: values[5],
      memberships: values[6],
      members: values[7],
      role,
      inbox_version: 1,
      communication_metrics: {
        today: queries[15].count || 0,
        waiting: queries[16].count || 0,
        drafts: (queries[17].count || 0) + (queries[18].count || 0),
        new_leads: queries[9].count || 0,
        follow_up: queries[19].count || 0,
      },
      conversations: values[12],
      messages: values[13],
      properties: values[14],
      metrics: {
        total: queries[8].count || 0,
        fresh: queries[9].count || 0,
        pending: queries[10].count || 0,
        completed: queries[11].count || 0,
      },
      truncated:
        (queries[8].count || 0) > 1000 ||
        (queries[10].count || 0) + (queries[11].count || 0) > 1000,
    });
    if (exporting) {
      // Page through all personal records instead of silently truncating privacy exports.
      const tables = [
        "leads",
        "tasks",
        "lead_messages",
        "ai_suggestions",
        "audit_logs",
        "conversations",
        "properties",
      ] as const;
      const records: Record<string, unknown[]> = {};
      for (const table of tables) {
        records[table] = [];
        let start = 0;
        while (true) {
          const rows = result(
            await db
              .from(table)
              .select("*")
              .eq("organization_id", org)
              .order("id")
              .range(start, start + 499),
          );
          records[table].push(...(rows || []));
          if (!rows || rows.length < 500) break;
          start += 500;
          if (start >= 50000)
            throw new HttpError(413, "export_too_large_contact_operator");
        }
      }
      return Response.json(
        { organization: payload.organization, records },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = mutationSchema.parse(await readJson(request));
    const { db, user, organizationId: org, role } = await context("write");
    switch (input.action) {
      case "conversation.read":
        result(
          await db
            .from("conversations")
            .update({ unread_count: 0 })
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      case "conversation.assign": {
        if (input.user_id) {
          const member = result(
            await db
              .from("memberships")
              .select("user_id")
              .eq("organization_id", org)
              .eq("user_id", input.user_id)
              .maybeSingle(),
          );
          if (!member) throw new HttpError(403, "assignee_not_member");
        }
        result(
          await db
            .from("conversations")
            .update({ assignee_id: input.user_id })
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      }
      case "conversation.state":
        result(
          await db
            .from("conversations")
            .update({ state: input.state })
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      case "message.approve":
        result(
          await db.rpc("record_approved_reply", {
            p_org: org,
            p_conversation: input.id,
            p_content: input.content,
            p_request: input.request_id,
          }),
        );
        break;
      case "message.receive":
        throw new HttpError(409, "demo_action_only");
      case "property.create":
        result(
          await db
            .from("properties")
            .insert({ ...input.data, organization_id: org }),
        );
        break;
      case "property.toggle":
        result(
          await db
            .from("properties")
            .update({ active: input.active })
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      case "lead.create":
        result(
          await db
            .from("leads")
            .insert({ ...input.data, organization_id: org }),
        );
        break;
      case "lead.update": {
        const rows = result(
          await db
            .from("leads")
            .update(input.data)
            .eq("organization_id", org)
            .eq("id", input.id)
            .select("id"),
        );
        if (!rows?.length) throw new HttpError(404, "not_found");
        break;
      }
      case "lead.delete":
        result(
          await db
            .from("leads")
            .delete()
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      case "task.create":
        result(
          await db
            .from("tasks")
            .insert({ ...input.data, organization_id: org }),
        );
        break;
      case "task.toggle":
        result(
          await db
            .from("tasks")
            .update({ completed: input.completed })
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      case "task.delete":
        result(
          await db
            .from("tasks")
            .delete()
            .eq("organization_id", org)
            .eq("id", input.id),
        );
        break;
      case "profile.update":
        result(
          await db
            .from("profiles")
            .update({ full_name: input.full_name, language: input.language })
            .eq("id", user.id),
        );
        break;
      case "organization.create": {
        const id = result(
          await db.rpc("create_organization", { p_name: input.name }),
        );
        await selectOrganization(id);
        break;
      }
      case "organization.switch": {
        const membership = result(
          await db
            .from("memberships")
            .select("organization_id")
            .eq("user_id", user.id)
            .eq("organization_id", input.id)
            .maybeSingle(),
        );
        if (!membership) throw new HttpError(403, "membership_required");
        await selectOrganization(input.id);
        break;
      }
      case "organization.update":
        requireManager(role);
        result(
          await db
            .from("organizations")
            .update({ name: input.name, retention_days: input.retention_days })
            .eq("id", org),
        );
        break;
      case "member.set":
        requireManager(role);
        result(
          await db.rpc("set_member", {
            p_org: org,
            p_email: input.email,
            p_role: input.role,
          }),
        );
        break;
      case "member.remove":
        requireManager(role);
        result(
          await db.rpc("remove_member", { p_org: org, p_user: input.user_id }),
        );
        break;
      case "suggestion.approve":
        result(
          await db.rpc("approve_suggestion", {
            p_org: org,
            p_id: input.id,
            p_reply: input.reply,
            p_create_task: input.create_task,
          }),
        );
        break;
      case "retention.purge":
        requireManager(role, true);
        result(await db.rpc("purge_expired", { p_org: org }));
        break;
    }
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
