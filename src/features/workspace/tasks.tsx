"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "./provider";
import { Field, inputClass, PageHeading } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
export function Tasks() {
  const { data, mutate, t, language } = useWorkspace();
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("open");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const tasks = data.tasks.filter(
    (task) =>
      filter === "all" ||
      (filter === "done" ? task.completed : !task.completed),
  );
  return (
    <>
      <PageHeading
        title={t.tasks}
        description={t.overview}
        action={
          <Button onClick={() => setShow(true)}>
            <Plus className="size-4" />
            {t.newTask}
          </Button>
        }
      />
      {show && (
        <form
          className="mb-6 rounded-2xl border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            try {
              await mutate({
                action: "task.create",
                data: {
                  title: String(f.get("title")),
                  lead_id: String(f.get("lead_id")) || null,
                  due_at: new Date(String(f.get("due_at"))).toISOString(),
                  completed: false,
                },
              });
              setShow(false);
            } catch {
              /* Shell shows errors. */
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={t.title}>
              <input
                name="title"
                required
                minLength={2}
                maxLength={200}
                className={inputClass}
              />
            </Field>
            <Field label={t.customer}>
              <select name="lead_id" className={inputClass}>
                <option value="">{t.noCustomer}</option>
                {data.leads.map((l) => (
                  <option value={l.id} key={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.due}>
              <input
                type="datetime-local"
                name="due_at"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <div className="mt-5 flex gap-3">
            <Button disabled={busy}>{busy ? t.loading : t.save}</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShow(false)}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      )}
      <div className="mb-5 flex gap-2" role="group" aria-label={t.status}>
        {[
          ["open", t.open],
          ["done", t.done],
          ["all", t.all],
        ].map(([key, title]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {title}
          </Button>
        ))}
      </div>
      <section className="divide-y rounded-2xl border bg-card">
        {tasks.map((task) => (
          <article key={task.id} className="flex items-start gap-4 p-5">
            <input
              type="checkbox"
              aria-label={`${t.done}: ${task.title}`}
              checked={task.completed}
              disabled={busy}
              className="mt-1 size-5 accent-[var(--primary)]"
              onChange={async (e) => {
                setBusy(true);
                try {
                  await mutate({
                    action: "task.toggle",
                    id: task.id,
                    completed: e.target.checked,
                  });
                } catch {
                  /* Shell error. */
                } finally {
                  setBusy(false);
                }
              }}
            />
            <div className="min-w-0 flex-1">
              <h2
                className={`break-words text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}
              >
                {task.title}
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.leads.find((l) => l.id === task.lead_id)?.name ||
                  t.noCustomer}{" "}
                ·{" "}
                {new Date(task.due_at).toLocaleString(
                  language === "tr" ? "tr-TR" : "en-GB",
                )}
              </p>
              {!task.completed && Date.parse(task.due_at) < now && (
                <span className="mt-2 inline-block text-xs text-destructive">
                  {t.overdue}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              aria-label={`${t.delete}: ${task.title}`}
              onClick={async () => {
                if (!confirm(t.confirmDelete)) return;
                setBusy(true);
                try {
                  await mutate({ action: "task.delete", id: task.id });
                } catch {
                  /* Shell error. */
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </article>
        ))}
        {!tasks.length && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {t.empty}
          </p>
        )}
      </section>
    </>
  );
}
