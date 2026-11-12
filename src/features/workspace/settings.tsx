"use client";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Field, inputClass, PageHeading } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { canManage, type Mutation } from "@/lib/domain";
export function SettingsPage() {
  const { data, mode, t, language, setLanguage, mutate, reset } =
    useWorkspace();
  const [busy, setBusy] = useState(false);
  const [exportError, setExportError] = useState(false);
  const manager = canManage(data.role);
  async function save(input: Mutation) {
    setBusy(true);
    try {
      await mutate(input);
    } catch {
      /* Shell error. */
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading title={t.settings} />
      <div
        key={data.organization.id}
        className="grid items-start gap-6 xl:grid-cols-2"
      >
        <form
          className="space-y-5 rounded-2xl border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await save({
              action: "profile.update",
              full_name: String(f.get("full_name")),
              language,
            });
          }}
        >
          <h2 className="text-lg font-semibold">{t.profile}</h2>
          <Field label={t.name}>
            <input
              name="full_name"
              minLength={2}
              maxLength={120}
              required
              defaultValue={data.profile.full_name}
              className={inputClass}
            />
          </Field>
          <div className="flex items-center justify-between">
            <Field label={t.language}>
              <select
                className={inputClass}
                value={language}
                onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </Field>
            <ThemeToggle language={language} />
          </div>
          <Button disabled={busy}>{t.save}</Button>
        </form>
        <form
          className="space-y-5 rounded-2xl border bg-card p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            await save({
              action: "organization.update",
              name: String(f.get("name")),
              retention_days: Number(f.get("retention_days")),
            });
          }}
        >
          <h2 className="text-lg font-semibold">{t.business}</h2>
          <Field label={t.business}>
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              disabled={!manager}
              defaultValue={data.organization.name}
              className={inputClass}
            />
          </Field>
          <Field label={t.retention}>
            <input
              name="retention_days"
              type="number"
              min={30}
              max={730}
              required
              disabled={!manager}
              defaultValue={data.organization.retention_days}
              className={inputClass}
            />
          </Field>
          <Button disabled={busy || !manager}>{t.save}</Button>
        </form>
        <section className="space-y-5 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">{t.team}</h2>
          <ul className="divide-y">
            {data.members.map((m) => (
              <li
                className="flex items-center justify-between gap-2 py-3 text-xs"
                key={m.user_id}
              >
                <span className="truncate font-mono" title={m.user_id}>
                  {m.full_name || m.user_id}
                  {m.email && (
                    <span className="block text-muted-foreground">
                      {m.email}
                    </span>
                  )}
                </span>
                <span>{m.role}</span>
                {manager && m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(t.confirmDelete))
                        void save({
                          action: "member.remove",
                          user_id: m.user_id,
                        });
                    }}
                  >
                    {t.delete}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {mode === "live" && manager && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                await save({
                  action: "member.set",
                  email: String(f.get("email")),
                  role: String(f.get("role")) as "admin" | "member",
                });
              }}
            >
              <p className="text-xs text-muted-foreground">
                {language === "tr"
                  ? "Kullanıcı önce kendi hesabını oluşturmalıdır. E-posta gönderilmez."
                  : "The user must register first. No invitation email is sent."}
              </p>
              <Field label={t.email}>
                <input
                  name="email"
                  type="email"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label={t.role}>
                <select name="role" className={inputClass}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Button disabled={busy}>{t.addMember}</Button>
            </form>
          )}
        </section>
        <section className="space-y-5 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">
            {t.business} / {t.settings}
          </h2>
          {mode === "live" && (
            <>
              <form
                className="flex flex-wrap gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await save({
                    action: "organization.switch",
                    id: String(
                      new FormData(e.currentTarget).get("organization"),
                    ),
                  });
                }}
              >
                <select
                  name="organization"
                  aria-label={t.switchOrg}
                  defaultValue={data.organization.id}
                  className={inputClass}
                >
                  {data.memberships.map((m) => (
                    <option value={m.organization_id} key={m.organization_id}>
                      {m.organizations.name}
                    </option>
                  ))}
                </select>
                <Button disabled={busy}>{t.switchOrg}</Button>
              </form>
              <form
                className="flex flex-wrap gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await save({
                    action: "organization.create",
                    name: String(new FormData(e.currentTarget).get("name")),
                  });
                }}
              >
                <input
                  name="name"
                  aria-label={t.business}
                  placeholder={t.business}
                  minLength={2}
                  maxLength={120}
                  required
                  className={inputClass}
                />
                <Button variant="outline" disabled={busy}>
                  {t.createOrg}
                </Button>
              </form>
            </>
          )}
          {manager && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setExportError(false);
                try {
                  let payload: unknown = data;
                  if (mode === "live") {
                    const r = await fetch("/api/workspace?export=1");
                    if (!r.ok) throw new Error("Export unavailable");
                    payload = await r.json();
                  }
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(payload, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `leadpilot-${mode}-export.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  setExportError(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t.export}
            </Button>
          )}
          {exportError && (
            <p role="alert" className="text-sm text-destructive">
              {t.error}
            </p>
          )}
          {data.role === "owner" && (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (
                  confirm(
                    language === "tr"
                      ? "Saklama süresi dolan tüm müşteri verileri ve ilişkili kayıtlar kalıcı olarak silinsin mi?"
                      : "Permanently delete all expired customer data and related records?",
                  )
                )
                  void save({ action: "retention.purge" });
              }}
            >
              {t.purge}
            </Button>
          )}
          {mode === "demo" && (
            <Button
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    language === "tr"
                      ? "Bu sekmedeki demo değişiklikleri silinip örnek veriler yüklensin mi?"
                      : "Discard changes in this demo session and restore sample data?",
                  )
                )
                  reset();
              }}
            >
              {t.reset}
            </Button>
          )}
        </section>
      </div>
    </>
  );
}
