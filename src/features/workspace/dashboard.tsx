"use client";
import Link from "next/link";
import { useState } from "react";
import {
  MessageSquare,
  Clock3,
  Sparkles,
  Users,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "./provider";
import { PageHeading } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { activityLabel } from "@/lib/activity";
export function Dashboard() {
  const { data, language, t, mode } = useWorkspace();
  const tr = language === "tr";
  const [today] = useState(() =>
    new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" }),
  );
  const metrics = [
    [
      tr ? "Bugün gelen mesajlar" : "Incoming messages today",
      data.communication_metrics?.today ??
        data.messages.filter(
          (m) =>
            m.direction === "inbound" &&
            new Date(m.created_at).toLocaleDateString("en-CA", {
              timeZone: "Europe/Istanbul",
            }) === today,
        ).length,
      MessageSquare,
      "/inbox",
    ],
    [
      tr ? "Yanıt bekleyen konuşmalar" : "Awaiting reply",
      data.communication_metrics?.waiting ??
        data.conversations.filter((c) => c.awaiting_reply && c.state === "open")
          .length,
      Clock3,
      "/inbox",
    ],
    [
      tr ? "AI tarafından hazırlanan taslaklar" : "AI prepared drafts",
      data.communication_metrics?.drafts ??
        data.conversations.filter((c) => c.analysis).length +
          data.suggestions.length,
      Sparkles,
      "/inbox",
    ],
    [
      tr ? "Yeni müşteri talepleri" : "New customer enquiries",
      data.metrics?.fresh ??
        data.leads.filter((l) => l.status === "new").length,
      Users,
      "/leads",
    ],
    [
      tr ? "Takip gereken müşteriler" : "Customers needing follow-up",
      data.communication_metrics?.follow_up ??
        new Set(
          data.tasks
            .filter((v) => !v.completed && v.lead_id)
            .map((v) => v.lead_id),
        ).size,
      ClipboardList,
      "/tasks",
    ],
  ] as const;
  return (
    <>
      <PageHeading
        title={
          tr ? "İletişiminize genel bakış" : "Your communication at a glance"
        }
        description={
          tr
            ? "Konuşmalardan takip adımlarına. Bugün: Europe/Istanbul."
            : "From conversations to follow-ups. Today: Europe/Istanbul."
        }
        action={
          <Button asChild size="sm">
            <Link href="/inbox">
              Inbox
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        }
      />
      {mode === "demo" && (
        <p className="mb-5 text-xs text-muted-foreground">
          {tr
            ? "Demo verilerinden hesaplanır. Gerçek işletme performansı değildir."
            : "Calculated from demo records. Not real business performance."}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon, href]) => (
          <Link
            href={href}
            key={label}
            className="rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-h-8 text-[11px] leading-4 text-muted-foreground">
                {label}
              </p>
              <Icon className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {value}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 text-sm font-semibold">
            {t.pending}
          </div>
          <div className="divide-y">
            {data.tasks
              .filter((v) => !v.completed)
              .slice(0, 6)
              .map((task) => (
                <Link
                  href="/tasks"
                  key={task.id}
                  className="flex items-center justify-between gap-4 px-4 py-4 text-xs hover:bg-background"
                >
                  <span>{task.title}</span>
                  <time className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(task.due_at).toLocaleDateString(
                      tr ? "tr-TR" : "en-GB",
                    )}
                  </time>
                </Link>
              ))}
            {!data.tasks.some((v) => !v.completed) && (
              <p className="p-6 text-xs text-muted-foreground">{t.empty}</p>
            )}
          </div>
        </section>
        <section className="rounded-lg border bg-card">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">
            {t.recent}
          </h2>
          <div className="divide-y">
            {data.activities.slice(0, 6).map((a) => (
              <div
                key={a.id}
                className="flex justify-between gap-3 px-4 py-4 text-xs"
              >
                <span>{activityLabel(a.action, language)}</span>
                <time className="text-[10px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleDateString(
                    tr ? "tr-TR" : "en-GB",
                  )}
                </time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
