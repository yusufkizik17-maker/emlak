"use client";
import Link from "next/link";
import { useBrowserLanguage } from "@/hooks/use-browser-language";
import {
  ArrowRight,
  Check,
  Command,
  Users,
  Sparkles,
  CheckSquare,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { dictionaries, type Language } from "@/lib/i18n";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
export function Landing({ mode }: { mode: "demo" | "live" }) {
  const [language, setLanguage] = useBrowserLanguage();
  const t = dictionaries[language];
  const tr = language === "tr";
  return (
    <>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <span className="rounded-xl bg-primary p-2 text-primary-foreground">
            <Command className="size-5" />
          </span>
          LeadPilot <span className="font-normal text-primary">AI</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#features">{tr ? "Özellikler" : "Features"}</a>
          <a href="#how">{t.how}</a>
          <a href="#pricing">{t.pricing}</a>
        </nav>
        <div className="flex items-center gap-3">
          <select
            aria-label={t.language}
            value={language}
            onChange={(e) => {
              const lang = e.target.value as Language;
              setLanguage(lang);
            }}
            className="rounded-md border bg-card p-2 text-xs"
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
          <ThemeToggle language={language} />
          <Link href="/login" className="text-sm font-medium">
            {t.login}
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-6">
        <section className="grid items-center gap-14 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" />
              {tr
                ? "Emlak ofisleri için AI destekli çalışma alanı"
                : "An AI workspace for real estate teams"}
            </p>
            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">
              {t.hero}
              <br />
              <span className="text-primary">{t.heroAccent}</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              {t.heroText}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={mode === "demo" ? "/dashboard" : "/register"}>
                  {mode === "demo" ? t.tryDemo : t.register}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">{t.how}</a>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              {mode === "demo"
                ? tr
                  ? "Demo ortamı · Kredi kartı gerekmez · Örnek veriler"
                  : "Demo workspace · No card required · Sample data"
                : tr
                  ? "Güvenli çalışma alanı · İnsan onaylı AI"
                  : "Secure workspace · Human-reviewed AI"}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-xl shadow-primary/10">
            <div className="flex items-center justify-between border-b p-5">
              <p className="text-sm font-semibold">
                Nova Emlak{" "}
                <span className="ml-2 rounded bg-secondary px-2 py-1 text-[10px] font-normal text-primary">
                  {tr ? "ÖRNEK" : "SAMPLE"}
                </span>
              </p>
              <span className="text-xs text-muted-foreground">Workspace</span>
            </div>
            <div className="p-6">
              <p className="text-xs text-muted-foreground">{t.dashboard}</p>
              <h2 className="mt-2 text-xl font-semibold">
                {tr
                  ? "Her ilişki, bir adım ileri."
                  : "Every relationship, a step forward."}
              </h2>
              <div className="my-6 grid grid-cols-2 gap-3">
                {[
                  [t.fresh, "12"],
                  [t.pending, "8"],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-xl bg-secondary/60 p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-3 text-3xl font-semibold">{count}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Sparkles className="size-4" />
                  {t.ai}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {tr
                    ? "Müşterinin bütçe ve konum tercihlerini netleştirin. Görüntüleme için uygun zamanını sorun."
                    : "Clarify the customer’s budget and location preferences. Ask about a suitable time for a viewing."}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs">
                  <Check className="size-3.5 text-primary" />
                  {tr ? "İncelemeniz için hazır" : "Ready for your review"}
                </div>
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="scroll-mt-8 border-t py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {tr ? "DAHA FAZLA ODAK" : "MORE FOCUS"}
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight">
            {t.featureTitle}
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {[
              [
                Users,
                t.leads,
                tr
                  ? "Müşteri bilgilerini ve satış fırsatlarını tek yerde yönetin. Durum filtreleriyle önceliğinizi görün."
                  : "Manage customer details and sales opportunities in one place. Find priorities with status filters.",
              ],
              [
                Sparkles,
                t.ai,
                tr
                  ? "Mesajlardan ihtiyaçları çıkarın. Eksik bilgileri görün, kişiselleştirilmiş yanıt taslağını düzenleyin."
                  : "Extract needs from enquiries. Identify missing details and edit a personalised reply draft.",
              ],
              [
                CheckSquare,
                t.tasks,
                tr
                  ? "Takiplerinizi planlayın. Bekleyen işleri görün ve tamamlanan adımları işaretleyin."
                  : "Schedule follow-ups, see pending work, and mark completed steps.",
              ],
            ].map(([Icon, title, text]) => {
              const I = Icon as typeof Users;
              return (
                <article
                  key={String(title)}
                  className="rounded-2xl border bg-card p-6"
                >
                  <I className="mb-6 size-6 text-primary" />
                  <h3 className="font-semibold">{String(title)}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {String(text)}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
        <section
          id="how"
          className="scroll-mt-8 rounded-2xl border bg-card p-8 sm:p-10"
        >
          <h2 className="text-3xl font-semibold tracking-tight">{t.how}</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {(tr
              ? [
                  [
                    "Talepleri kaydedin",
                    "Müşteriyi ve ihtiyacını çalışma alanınıza ekleyin.",
                  ],
                  [
                    "AI ile anlamlandırın",
                    "Mesajı analiz edin, önerilen yanıtı inceleyin.",
                  ],
                  [
                    "Takibi siz yönetin",
                    "Taslağı onaylayın ve bir sonraki görevi planlayın.",
                  ],
                ]
              : [
                  [
                    "Capture enquiries",
                    "Add the customer and their needs to your workspace.",
                  ],
                  [
                    "Understand with AI",
                    "Analyse the message and review the suggested reply.",
                  ],
                  [
                    "Own the follow-up",
                    "Approve the draft and plan your next task.",
                  ],
                ]
            ).map(([title, text], i) => (
              <div key={title}>
                <span className="font-mono text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-8 flex gap-2 border-t pt-5 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0 text-primary" />
            {tr
              ? "AI müşterilere otomatik mesaj göndermez. Son karar her zaman ekibinizindir."
              : "AI never sends messages automatically. Your team always makes the final decision."}
          </p>
        </section>
        <section id="pricing" className="scroll-mt-8 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">{t.pricing}</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            {tr
              ? "Planlar ürün vizyonunu gösterir. Abonelik ve ödeme sistemi henüz aktif değildir."
              : "Plans illustrate the product direction. Subscriptions and payments are not active yet."}
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {["Starter", "Growth", "Business"].map((plan, i) => (
              <article
                key={plan}
                className={`rounded-2xl border bg-card p-7 ${i === 1 ? "ring-2 ring-primary" : ""}`}
              >
                <p className="font-semibold">{plan}</p>
                <p className="mt-5 text-2xl font-semibold">
                  {tr ? "Yakında" : "Coming soon"}
                </p>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {
                    [
                      tr
                        ? "Temel CRM ve takip yönetimi"
                        : "Core CRM and follow-up management",
                      tr
                        ? "CRM, AI taslakları ve ekip çalışması"
                        : "CRM, AI drafts, and team collaboration",
                      tr
                        ? "Genişleyen ekipler için işletme yönetimi"
                        : "Business management for growing teams",
                    ][i]
                  }
                </p>
                <Button
                  asChild
                  variant={i === 1 ? "default" : "outline"}
                  className="mt-6 w-full"
                >
                  <Link href={mode === "demo" ? "/dashboard" : "/register"}>
                    {mode === "demo" ? t.tryDemo : t.register}
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-3xl pb-20">
          <h2 className="mb-7 text-3xl font-semibold tracking-tight">
            {t.faq}
          </h2>
          {(tr
            ? [
                [
                  "Demo ile canlı veriler nasıl ayrılıyor?",
                  "Demo kayıtları yalnızca tarayıcı oturumunda saklanır ve Supabase’e gönderilmez. Canlı mod gerçek oturum ve işletme üyeliği gerektirir.",
                ],
                [
                  "AI müşterilere mesaj gönderir mi?",
                  "Hayır. AI yalnızca taslak ve takip önerisi üretir. Yanıtı siz düzenleyip onaylarsınız; bu sürüm mesaj göndermez.",
                ],
                [
                  "Sadece emlak için mi?",
                  "İlk iş akışları emlak ofisleri içindir. CRM ve işletme mimarisi farklı sektörlere genişleyebilir.",
                ],
                [
                  "Verilerim nasıl korunur?",
                  "Canlı modda sunucu yetkilendirmesi ve PostgreSQL RLS işletme sınırlarını korur. Canlıya geçişten önce servis ayarları ve güvenlik kontrolleri yapılmalıdır.",
                ],
              ]
            : [
                [
                  "How is demo data separated?",
                  "Demo records remain in your browser session and are never sent to Supabase. Live mode requires authentication and business membership.",
                ],
                [
                  "Does AI send customer messages?",
                  "No. AI creates drafts and follow-up suggestions. You edit and approve them; this version does not send messages.",
                ],
                [
                  "Is this only for real estate?",
                  "Initial workflows target real estate offices. The CRM and business architecture can expand to other sectors.",
                ],
                [
                  "How is data protected?",
                  "In live mode, server authorisation and PostgreSQL RLS enforce business boundaries. Service configuration and security checks are required before launch.",
                ],
              ]
          ).map(([q, a]) => (
            <details key={q} className="border-b py-5">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {a}
              </p>
            </details>
          ))}
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-6 py-7 text-xs text-muted-foreground">
          <span>LeadPilot AI © 2026</span>
          <span>
            {tr ? "İnsan odaklı otomasyon." : "Human-centred automation."}
          </span>
        </div>
      </footer>
    </>
  );
}
