"use client";
import Link from "next/link";
import { useState } from "react";
import { useBrowserLanguage } from "@/hooks/use-browser-language";
import { useRouter } from "next/navigation";
import { Command } from "lucide-react";
import { Button } from "./ui/button";
import { Field, inputClass } from "./form-fields";
export function AuthForm({
  kind,
  mode,
}: {
  kind: "login" | "register" | "forgot" | "reset";
  mode: "demo" | "live";
}) {
  const router = useRouter();
  const [language, setLanguage] = useBrowserLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const tr = language === "tr";
  const title = {
    login: tr ? "Tekrar hoş geldiniz." : "Welcome back.",
    register: tr ? "Yeni bir başlangıç." : "A fresh start.",
    forgot: tr ? "Şifrenizi sıfırlayın." : "Reset your password.",
    reset: tr ? "Yeni şifrenizi belirleyin." : "Choose a new password.",
  }[kind];
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-9 flex items-center justify-center gap-2 text-xl font-semibold"
        >
          <Command className="size-7 text-primary" />
          LeadPilot AI
        </Link>
        <section className="rounded-2xl border bg-card p-7 sm:p-9">
          <div className="mb-7 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <select
              aria-label="Language / Dil"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
              className="rounded border bg-card p-1 text-xs"
            >
              <option value="tr">TR</option>
              <option value="en">EN</option>
            </select>
          </div>
          {mode === "demo" ? (
            <div>
              <p className="mb-6 text-sm leading-7 text-muted-foreground">
                {tr
                  ? "Demo modunda hesap oluşturulmaz ve kimlik bilgileri toplanmaz. Örnek çalışma alanını doğrudan keşfedebilirsiniz."
                  : "Demo mode does not create accounts or collect credentials. Explore the sample workspace directly."}
              </p>
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  {tr ? "Demoya devam et" : "Continue to demo"}
                </Link>
              </Button>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                setSuccess(false);
                const f = new FormData(e.currentTarget);
                const payload: Record<string, string> = { action: kind };
                if (kind !== "reset") payload.email = String(f.get("email"));
                if (kind !== "forgot")
                  payload.password = String(f.get("password"));
                if (kind === "register")
                  payload.full_name = String(f.get("full_name"));
                try {
                  const r = await fetch("/api/auth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!r.ok) throw new Error();
                  if (kind === "login") {
                    router.push("/dashboard");
                    router.refresh();
                  } else setSuccess(true);
                } catch {
                  setError(
                    tr
                      ? "İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin."
                      : "Could not complete your request. Check your details and try again.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {kind === "register" && (
                <Field label={tr ? "Ad soyad" : "Full name"}>
                  <input
                    name="full_name"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    className={inputClass}
                  />
                </Field>
              )}
              {kind !== "reset" && (
                <Field label={tr ? "E-posta" : "Email"}>
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={254}
                    autoComplete="email"
                    className={inputClass}
                  />
                </Field>
              )}
              {kind !== "forgot" && (
                <Field label={tr ? "Şifre" : "Password"}>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={kind === "login" ? 1 : 12}
                    maxLength={128}
                    autoComplete={
                      kind === "login" ? "current-password" : "new-password"
                    }
                    className={inputClass}
                  />
                  {kind !== "login" && (
                    <span className="text-xs text-muted-foreground">
                      {tr ? "En az 12 karakter." : "At least 12 characters."}
                    </span>
                  )}
                </Field>
              )}
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {success && (
                <p role="status" className="text-sm text-primary">
                  {kind === "reset"
                    ? tr
                      ? "Şifre güncellendi. Yeniden giriş yapın."
                      : "Password updated. Please sign in again."
                    : tr
                      ? "İşlem alındı. Uygunsa e-posta adresinize bir bağlantı gönderilecek."
                      : "Request received. If applicable, a link will be sent to your email."}
                </p>
              )}
              <Button disabled={busy} className="w-full">
                {busy
                  ? tr
                    ? "Bekleyin…"
                    : "Please wait…"
                  : kind === "login"
                    ? tr
                      ? "Giriş yap"
                      : "Sign in"
                    : tr
                      ? "Devam et"
                      : "Continue"}
              </Button>
            </form>
          )}
          <div className="mt-6 flex flex-wrap justify-between gap-4 text-xs text-primary">
            <Link href="/login">{tr ? "Giriş yap" : "Sign in"}</Link>
            <Link href="/register">
              {tr ? "Hesap oluştur" : "Create account"}
            </Link>
            <Link href="/forgot-password">
              {tr ? "Şifremi unuttum" : "Forgot password"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
