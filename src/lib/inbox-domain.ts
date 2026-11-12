import { z } from "zod";
export const requirementsSchema = z
  .object({
    intent: z.enum([
      "buy_property",
      "rent_property",
      "sell_property",
      "unknown",
    ]),
    city: z.string().max(100).nullable(),
    district: z.string().max(100).nullable(),
    budget_max: z.number().nonnegative().max(1e12).nullable(),
    currency: z.enum(["TRY", "USD", "EUR"]).nullable(),
    rooms: z.string().max(20).nullable(),
    property_type: z.enum(["apartment", "villa", "office", "land"]).nullable(),
    listing_type: z.enum(["sale", "rent"]).nullable(),
    elevator_required: z.boolean().nullable(),
    floor_preference: z
      .enum(["middle_floor", "ground_floor", "top_floor"])
      .nullable(),
  })
  .strict();
export const copilotSchema = z
  .object({
    summary: z.string().max(800),
    requirements: requirementsSchema,
    missing_information: z.array(z.string().max(160)).max(8),
    reply: z.string().min(10).max(2400),
    follow_up: z.string().min(2).max(200),
  })
  .strict();
export const conversationSchema = z.object({
  id: z.uuid(),
  lead_id: z.uuid(),
  assignee_id: z.uuid().nullable(),
  unread_count: z.number().int().nonnegative(),
  awaiting_reply: z.boolean(),
  state: z.enum(["open", "closed"]),
  updated_at: z.string(),
  analysis: copilotSchema.nullable(),
});
export const messageSchema = z.object({
  id: z.uuid(),
  lead_id: z.uuid(),
  conversation_id: z.uuid(),
  content: z.string().min(1).max(4000),
  direction: z.enum(["inbound", "outbound"]),
  state: z.enum(["received", "approved"]),
  created_at: z.string(),
});
export const propertyInput = z
  .object({
    title: z.string().trim().min(3).max(160),
    city: z.string().trim().min(2).max(100),
    district: z.string().trim().max(100),
    price: z.number().positive().max(1e12),
    currency: z.enum(["TRY", "USD", "EUR"]),
    rooms: z.string().trim().max(20),
    property_type: z.enum(["apartment", "villa", "office", "land"]),
    listing_type: z.enum(["sale", "rent"]),
    elevator: z.boolean(),
    floor: z.enum(["middle_floor", "ground_floor", "top_floor"]),
    active: z.boolean().default(true),
  })
  .strict();
export const propertySchema = propertyInput.extend({ id: z.uuid() });
export const inboxMutations = [
  z.object({ action: z.literal("conversation.read"), id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("conversation.assign"),
      id: z.uuid(),
      user_id: z.uuid().nullable(),
    })
    .strict(),
  z
    .object({
      action: z.literal("conversation.state"),
      id: z.uuid(),
      state: z.enum(["open", "closed"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("message.approve"),
      id: z.uuid(),
      content: z.string().trim().min(1).max(2400),
      request_id: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("message.receive"),
      id: z.uuid(),
      content: z.string().trim().min(1).max(4000),
    })
    .strict(),
  z
    .object({ action: z.literal("property.create"), data: propertyInput })
    .strict(),
  z
    .object({
      action: z.literal("property.toggle"),
      id: z.uuid(),
      active: z.boolean(),
    })
    .strict(),
] as const;
export type Requirements = z.infer<typeof requirementsSchema>;
export type Copilot = z.infer<typeof copilotSchema>;
export type Property = z.infer<typeof propertySchema>;
