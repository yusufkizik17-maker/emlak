import { z } from "zod";
export const statuses = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
] as const;
export const leadInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.union([z.email().max(254), z.literal("")]).default(""),
    phone: z.string().trim().max(30).default(""),
    status: z.enum(statuses).default("new"),
    location: z.string().trim().max(160).default(""),
    property_type: z.string().trim().max(80).default(""),
    budget: z.string().trim().max(100).default(""),
    notes: z.string().trim().max(4000).default(""),
  })
  .strict();
export const taskInput = z
  .object({
    title: z.string().trim().min(2).max(200),
    lead_id: z.uuid().nullable().default(null),
    due_at: z.iso.datetime({ offset: true }),
    completed: z.boolean().default(false),
  })
  .strict();
export const analysisSchema = z
  .object({
    summary: z.string().max(800),
    intent: z.string().max(400),
    budget: z.string().max(100).nullable(),
    location: z.string().max(160).nullable(),
    property_type: z.string().max(80).nullable(),
    missing_information: z.array(z.string().max(120)).max(8),
    follow_up: z.string().min(2).max(200),
    reply: z.string().min(10).max(2400),
  })
  .strict();
export const analysisInput = z
  .object({
    lead_id: z.uuid(),
    message: z.string().trim().min(10).max(4000),
    language: z.enum(["tr", "en"]),
  })
  .strict();
export type Analysis = z.infer<typeof analysisSchema>;
export type Lead = z.infer<typeof leadInput> & {
  id: string;
  created_at: string;
};
export type Task = z.infer<typeof taskInput> & {
  id: string;
  created_at: string;
};
export type Member = {
  full_name?: string;
  email?: string | null;
  user_id: string;
  role: "owner" | "admin" | "member";
};
export type Suggestion = {
  id: string;
  lead_id: string;
  analysis: Analysis;
  approved_at: string | null;
  created_at: string;
};
export const workspaceSchema = z.object({
  leads: z.array(leadInput.extend({ id: z.uuid(), created_at: z.string() })),
  tasks: z.array(taskInput.extend({ id: z.uuid(), created_at: z.string() })),
  suggestions: z.array(
    z.object({
      id: z.uuid(),
      lead_id: z.uuid(),
      analysis: analysisSchema,
      approved_at: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
  activities: z.array(
    z.object({ id: z.string(), action: z.string(), created_at: z.string() }),
  ),
  organization: z.object({
    id: z.uuid(),
    name: z.string(),
    retention_days: z.number().int(),
  }),
  profile: z.object({ full_name: z.string(), language: z.enum(["tr", "en"]) }),
  memberships: z.array(
    z.object({
      organization_id: z.uuid(),
      role: z.enum(["owner", "admin", "member"]),
      organizations: z.object({ name: z.string() }),
    }),
  ),
  members: z.array(
    z.object({
      user_id: z.uuid(),
      role: z.enum(["owner", "admin", "member"]),
      full_name: z.string().optional(),
      email: z.string().nullable().optional(),
    }),
  ),
  role: z.enum(["owner", "admin", "member"]),
  metrics: z
    .object({
      total: z.number(),
      fresh: z.number(),
      pending: z.number(),
      completed: z.number(),
    })
    .optional(),
  truncated: z.boolean().optional(),
});
export type WorkspaceData = z.infer<typeof workspaceSchema>;
export const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("lead.create"), data: leadInput }).strict(),
  z
    .object({ action: z.literal("lead.update"), id: z.uuid(), data: leadInput })
    .strict(),
  z.object({ action: z.literal("lead.delete"), id: z.uuid() }).strict(),
  z.object({ action: z.literal("task.create"), data: taskInput }).strict(),
  z
    .object({
      action: z.literal("task.toggle"),
      id: z.uuid(),
      completed: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("task.delete"), id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("profile.update"),
      full_name: z.string().trim().min(2).max(120),
      language: z.enum(["tr", "en"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("organization.create"),
      name: z.string().trim().min(2).max(120),
    })
    .strict(),
  z.object({ action: z.literal("organization.switch"), id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("organization.update"),
      name: z.string().trim().min(2).max(120),
      retention_days: z.number().int().min(30).max(730),
    })
    .strict(),
  z
    .object({
      action: z.literal("member.set"),
      email: z.email(),
      role: z.enum(["admin", "member"]),
    })
    .strict(),
  z.object({ action: z.literal("member.remove"), user_id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("suggestion.approve"),
      id: z.uuid(),
      reply: z.string().trim().min(10).max(2400),
      create_task: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("retention.purge") }).strict(),
]);
export type Mutation = z.infer<typeof mutationSchema>;
export function canManage(role: Member["role"]) {
  return role === "owner" || role === "admin";
}
