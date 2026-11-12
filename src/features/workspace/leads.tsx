"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "./provider";
import { leadInput, statuses, type Lead } from "@/lib/domain";
import { Field, inputClass, PageHeading } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
export function LeadForm({
  lead,
  onDone,
}: {
  lead?: Lead;
  onDone: () => void;
}) {
  const { mutate, t } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="mb-7 rounded-2xl border bg-card p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const form = new FormData(e.currentTarget);
        const parsed = leadInput.safeParse(Object.fromEntries(form));
        if (!parsed.success) {
          setError(parsed.error.issues.map((v) => v.path.join(".")).join(", "));
          return;
        }
        setBusy(true);
        try {
          await mutate(
            lead
              ? { action: "lead.update", id: lead.id, data: parsed.data }
              : { action: "lead.create", data: parsed.data },
          );
          onDone();
        } catch {
          /* Provider displays the error. */
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="mb-5 text-lg font-semibold">
        {lead ? t.edit : t.newLead}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["name", t.name, 120],
            ["email", t.email, 254],
            ["phone", t.phone, 30],
            ["location", t.location, 160],
            ["budget", t.budget, 100],
            ["property_type", t.property, 80],
          ] as const
        ).map(([key, label, max]) => (
          <Field key={key} label={label}>
            <input
              name={key}
              type={
                key === "email" ? "email" : key === "phone" ? "tel" : "text"
              }
              required={key === "name"}
              minLength={key === "name" ? 2 : undefined}
              maxLength={max}
              defaultValue={lead?.[key] || ""}
              className={inputClass}
            />
          </Field>
        ))}
        <Field label={t.status}>
          <select
            name="status"
            defaultValue={lead?.status || "new"}
            className={inputClass}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.notes} className="sm:col-span-2">
          <textarea
            name="notes"
            maxLength={4000}
            rows={3}
            defaultValue={lead?.notes || ""}
            className={inputClass}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {t.error} ({error})
        </p>
      )}
      <div className="mt-5 flex gap-3">
        <Button disabled={busy}>{busy ? t.loading : t.save}</Button>
        <Button type="button" variant="outline" onClick={onDone}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
export function Leads() {
  const params = useSearchParams();
  return (
    <LeadList
      key={params.get("q") || "default"}
      initialQuery={params.get("q") || ""}
      initialNew={params.get("new") === "1"}
    />
  );
}
function LeadList({
  initialQuery,
  initialNew,
}: {
  initialQuery: string;
  initialNew: boolean;
}) {
  const { data, t } = useWorkspace();
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState("");
  const [show, setShow] = useState(initialNew);
  const effectiveQ = q;
  const filtered = data.leads.filter(
    (l) =>
      (!status || l.status === status) &&
      [l.name, l.email, l.location]
        .join(" ")
        .toLocaleLowerCase()
        .includes(effectiveQ.toLocaleLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={t.leads}
        description={t.featureText}
        action={
          <Button onClick={() => setShow(true)}>
            <Plus className="size-4" />
            {t.newLead}
          </Button>
        }
      />
      {show && <LeadForm onDone={() => setShow(false)} />}
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex flex-wrap gap-3 border-b p-5">
          <input
            value={effectiveQ}
            onChange={(e) => setQ(e.target.value)}
            aria-label={`${t.leads}: ${t.search}`}
            placeholder={t.search}
            className={`${inputClass} max-w-sm`}
          />
          <select
            aria-label={t.status}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`${inputClass} sm:max-w-44`}
          >
            <option value="">{t.all}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-secondary/30 text-xs text-muted-foreground">
              <tr>
                {[t.name, t.status, t.location, t.budget, t.details].map(
                  (v) => (
                    <th key={v} className="px-5 py-4 font-medium">
                      {v}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-secondary/20">
                  <td className="px-5 py-5">
                    <Link href={`/leads/${l.id}`} className="font-semibold">
                      {l.name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {l.email || "—"}
                    </p>
                  </td>
                  <td className="px-5 py-5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${l.status === "won" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-primary/10 text-primary"}`}
                    >
                      {t[l.status]}
                    </span>
                  </td>
                  <td className="px-5 py-5 text-muted-foreground">
                    {l.location || "—"}
                  </td>
                  <td className="px-5 py-5 text-muted-foreground">
                    {l.budget || "—"}
                  </td>
                  <td className="px-5 py-5">
                    <Link
                      href={`/leads/${l.id}`}
                      aria-label={`${t.details}: ${l.name}`}
                    >
                      <ArrowUpRight className="size-4 text-primary" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {t.empty}
          </p>
        )}
      </section>
    </>
  );
}
export function LeadDetails({ id }: { id: string }) {
  const { data, mutate, t } = useWorkspace();
  const lead = data.leads.find((l) => l.id === id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!lead)
    return (
      <>
        <PageHeading title={t.empty} />
        <Link href="/leads" className="text-primary">
          {t.back}
        </Link>
      </>
    );
  return (
    <>
      <Link href="/leads" className="mb-5 inline-block text-sm text-primary">
        ← {t.leads}
      </Link>
      <PageHeading
        title={lead.name}
        description={lead.email}
        action={
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {t.edit}
          </Button>
        }
      />
      {editing ? (
        <LeadForm lead={lead} onDone={() => setEditing(false)} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <section className="rounded-2xl border bg-card p-6">
            <dl className="grid gap-6 sm:grid-cols-2">
              {[
                [t.phone, lead.phone],
                [t.location, lead.location],
                [t.budget, lead.budget],
                [t.property, lead.property_type],
                [t.status, t[lead.status]],
                [t.notes, lead.notes],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm">
                    {value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/ai-assistant?lead=${id}`}>{t.ai}</Link>
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  if (!confirm(t.confirmDelete)) return;
                  setBusy(true);
                  try {
                    await mutate({ action: "lead.delete", id });
                  } catch {
                    /* Error visible in shell. */
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t.delete}
              </Button>
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold">{t.tasks}</h2>
            {data.tasks
              .filter((task) => task.lead_id === id)
              .map((task) => (
                <div className="mt-4 border-t pt-4 text-sm" key={task.id}>
                  <Link href="/tasks">{task.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.completed ? t.done : t.open}
                  </p>
                </div>
              ))}
            {!data.tasks.some((task) => task.lead_id === id) && (
              <p className="mt-5 text-sm text-muted-foreground">{t.empty}</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
