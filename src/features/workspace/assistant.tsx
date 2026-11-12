"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useWorkspace } from "./provider";
import { Field, inputClass, PageHeading } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import type { Suggestion } from "@/lib/domain";
function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const { t, mutate } = useWorkspace();
  const [reply, setReply] = useState(suggestion.analysis.reply);
  const [createTask, setCreateTask] = useState(true);
  const [busy, setBusy] = useState(false);
  const a = suggestion.analysis;
  return (
    <article className="rounded-2xl border bg-card p-6">
      <div className="mb-5 flex items-center gap-2 font-semibold text-primary">
        <Sparkles className="size-4" />
        {t.ai}
      </div>
      <dl className="grid gap-5 sm:grid-cols-2">
        {[
          [t.summary, a.summary],
          [t.intent, a.intent],
          [t.budget, a.budget],
          [t.location, a.location],
          [t.property, a.property_type],
          [t.missing, a.missing_information.join(", ")],
          [t.followUp, a.follow_up],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm leading-6">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">
        <Field label={t.reply}>
          <textarea
            rows={6}
            minLength={10}
            maxLength={2400}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={!!suggestion.approved_at}
            className={inputClass}
          />
        </Field>
      </div>
      {suggestion.approved_at ? (
        <p role="status" className="mt-5 text-sm text-primary">
          {t.approved}
        </p>
      ) : (
        <>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createTask}
              onChange={(e) => setCreateTask(e.target.checked)}
            />
            {t.createTask}
          </label>
          <Button
            className="mt-5"
            disabled={busy || reply.trim().length < 10}
            onClick={async () => {
              setBusy(true);
              try {
                await mutate({
                  action: "suggestion.approve",
                  id: suggestion.id,
                  reply,
                  create_task: createTask,
                });
              } catch {
                /* Shell error. */
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t.loading : t.approve}
          </Button>
        </>
      )}
    </article>
  );
}
export function Assistant() {
  const { data, t, analyze, mode } = useWorkspace();
  const params = useSearchParams();
  const [lead, setLead] = useState(
    params.get("lead") || data.leads[0]?.id || "",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeading
        title={t.assistantTitle}
        description={t.assistantDescription}
      />
      {mode === "demo" && (
        <p className="mb-5 rounded-xl border bg-secondary p-4 text-sm text-primary">
          {t.sample}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form
          className="space-y-5 rounded-2xl border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await analyze(lead, message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={t.customer}>
            <select
              required
              value={lead}
              onChange={(e) => setLead(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {data.leads.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.message}>
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-muted-foreground">{message.length}/4000</p>
          <Button disabled={busy || !lead}>
            <Sparkles className="size-4" />
            {busy ? t.loading : t.analyze}
          </Button>
        </form>
        <div className="space-y-5">
          {data.suggestions
            .filter((s) => s.lead_id === lead)
            .map((s) => (
              <SuggestionCard key={s.id} suggestion={s} />
            ))}
          {!data.suggestions.some((s) => s.lead_id === lead) && (
            <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              <Sparkles className="mx-auto mb-4 size-8 text-primary" />
              {t.empty}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
