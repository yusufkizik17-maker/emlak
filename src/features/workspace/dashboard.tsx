"use client";
import Link from "next/link";
import { activityLabel } from "@/lib/activity";
import {
  Users,
  Inbox,
  Clock3,
  CheckCircle2,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { useWorkspace } from "./provider";
import { PageHeading } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { statuses } from "@/lib/domain";
export function Dashboard() {
  const { data, t, language } = useWorkspace();
  const metrics = [
    [t.total, data.metrics?.total ?? data.leads.length, Users],
    [
      t.fresh,
      data.metrics?.fresh ??
        data.leads.filter((l) => l.status === "new").length,
      Inbox,
    ],
    [
      t.pending,
      data.metrics?.pending ?? data.tasks.filter((v) => !v.completed).length,
      Clock3,
    ],
    [
      t.completed,
      data.metrics?.completed ?? data.tasks.filter((v) => v.completed).length,
      CheckCircle2,
    ],
  ] as const;
  return (
    <>
      <PageHeading
        title={t.greeting}
        description={t.overview}
        action={
          <Button asChild>
            <Link href="/leads?new=1">
              <Plus className="size-4" />
              {t.newLead}
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, count, Icon]) => (
          <article key={label} className="rounded-2xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className="size-5 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-5 text-4xl font-semibold tracking-tight">
              {count}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              {data.organization.name}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">{t.pipeline}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {language === "tr"
              ? "Müşterilerinizin güncel durumu"
              : "Your current customer pipeline"}
          </p>
          <div className="mt-7 space-y-5">
            {statuses.map((s) => {
              const count = data.leads.filter((l) => l.status === s).length;
              return (
                <div key={s}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{t[s]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${(count / Math.max(data.leads.length, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t.pending}</h2>
            <Link href="/tasks" aria-label={t.tasks}>
              <ArrowUpRight className="size-5 text-primary" />
            </Link>
          </div>
          <div className="mt-5 divide-y">
            {data.tasks
              .filter((v) => !v.completed)
              .slice(0, 5)
              .map((task) => (
                <div key={task.id} className="flex gap-3 py-4">
                  <Clock3 className="mt-1 size-4 shrink-0 text-primary" />
                  <div>
                    <Link href="/tasks" className="text-sm font-medium">
                      {task.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(task.due_at).toLocaleString(
                        language === "tr" ? "tr-TR" : "en-GB",
                      )}
                    </p>
                  </div>
                </div>
              ))}
            {!data.tasks.some((v) => !v.completed) && (
              <p className="py-8 text-sm text-muted-foreground">{t.empty}</p>
            )}
          </div>
        </section>
      </div>
      <section className="mt-7 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">{t.recent}</h2>
        <div className="mt-4 divide-y">
          {data.activities.slice(0, 6).map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap justify-between gap-2 py-3 text-sm"
            >
              <span>{activityLabel(a.action, language)}</span>
              <time className="text-xs text-muted-foreground">
                {new Date(a.created_at).toLocaleString(
                  language === "tr" ? "tr-TR" : "en-GB",
                )}
              </time>
            </div>
          ))}
          {!data.activities.length && (
            <p className="text-sm text-muted-foreground">{t.empty}</p>
          )}
        </div>
      </section>
    </>
  );
}
