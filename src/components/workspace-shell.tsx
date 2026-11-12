"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions";
import {
  Command,
  LayoutDashboard,
  Users,
  CheckSquare,
  Sparkles,
  Settings,
  Search,
  Menu,
  X,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/provider";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const {
    data,
    mode,
    t,
    language,
    setLanguage,
    error,
    notice,
    loading,
    dismiss,
  } = useWorkspace();
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const nodes = () =>
      Array.from(
        asideRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button, select, input",
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    const returnFocus = menuRef.current;
    nodes()[0]?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const list = nodes();
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      returnFocus?.focus();
    };
  }, [open]);
  const nav = [
    ["/dashboard", t.dashboard, LayoutDashboard],
    ["/leads", t.leads, Users],
    ["/ai-assistant", t.ai, Sparkles],
    ["/tasks", t.tasks, CheckSquare],
    ["/settings", t.settings, Settings],
  ] as const;
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-card focus:p-4"
      >
        {language === "tr" ? "İçeriğe geç" : "Skip to content"}
      </a>
      {open && (
        <button
          aria-label={t.close}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={asideRef}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-y-auto border-r bg-card px-5 py-7 ${open ? "flex" : "hidden lg:flex"}`}
        aria-label={language === "tr" ? "Ana navigasyon" : "Main navigation"}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <span className="rounded-lg bg-primary p-2 text-primary-foreground">
              <Command className="size-5" aria-hidden="true" />
            </span>
            LeadPilot <span className="font-normal text-primary">AI</span>
          </Link>
          <button
            className="lg:hidden"
            aria-label={t.close}
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <div className="mt-9 rounded-xl border bg-secondary/40 p-3">
          <p className="truncate text-sm font-semibold">
            {data.organization.name || "LeadPilot"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "demo" ? "DEMO" : data.role} · Workspace
          </p>
        </div>
        <nav className="mt-7 space-y-2">
          {nav.map(([href, title, Icon]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${path.startsWith(href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {title}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-10">
          {logoutError && (
            <p role="alert" className="mb-3 text-xs text-destructive">
              {t.error}
            </p>
          )}
          <div className="rounded-xl bg-secondary p-4">
            <Sparkles className="mb-3 size-5 text-primary" aria-hidden="true" />
            <p className="text-sm font-medium">
              {language === "tr"
                ? "Bir sonraki adım, daha net."
                : "Your next step, clearer."}
            </p>
            <Link
              href="/ai-assistant"
              onClick={() => setOpen(false)}
              className="mt-3 flex items-center justify-between text-xs text-primary"
            >
              {t.ai}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-3 border-t pt-5">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {data.profile.full_name.slice(0, 2).toUpperCase() || "LP"}
            </div>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="min-w-0 flex-1 truncate text-sm"
            >
              {data.profile.full_name || t.profile}
            </Link>
            <button
              aria-label={t.logout}
              onClick={async () => {
                try {
                  await signOutAction();
                } catch {
                  setLogoutError(true);
                }
              }}
            >
              <LogOut className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64" inert={open}>
        <header className="flex min-h-20 items-center justify-between gap-3 border-b bg-card px-4 sm:px-8">
          <button
            className="lg:hidden"
            ref={menuRef}
            aria-label={t.menu}
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <form
            className="flex min-w-0 max-w-md flex-1 items-center gap-2 text-muted-foreground"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q");
              router.push(`/leads?q=${encodeURIComponent(String(q || ""))}`);
            }}
          >
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <input
              name="q"
              aria-label={t.search}
              placeholder={t.search}
              className="w-full min-w-0 border-0 bg-transparent p-2 text-sm outline-none"
              maxLength={120}
            />
          </form>
          <select
            aria-label={t.language}
            className="rounded-md border bg-card p-2 text-xs"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
          <ThemeToggle language={language} />
        </header>
        <div className="border-b bg-secondary/40 px-4 py-2 text-xs text-muted-foreground sm:px-8">
          {mode === "demo" ? t.demo : t.live}
        </div>
        <main id="workspace-main" className="mx-auto max-w-7xl p-4 sm:p-8">
          {(error || notice) && (
            <div
              role={error ? "alert" : "status"}
              className={`mb-5 flex items-center justify-between rounded-xl border p-4 text-sm ${error ? "text-destructive" : "text-primary"}`}
            >
              <span>{error || notice}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t.close}
                onClick={dismiss}
              >
                <X className="size-4" />
              </Button>
            </div>
          )}
          {data.truncated && (
            <p
              role="status"
              className="mb-5 rounded-lg border p-4 text-sm text-muted-foreground"
            >
              {language === "tr"
                ? "Listeler en fazla 1.000 kayıt gösterir. Dashboard sayaçları tüm kayıtları kapsar. Tam veri için işletme dışa aktarımını kullanın."
                : "Lists show up to 1,000 records. Dashboard counts include all records. Use the business export for the complete dataset."}
            </p>
          )}
          {loading ? (
            <div role="status" className="space-y-5 py-12">
              <p className="text-muted-foreground">{t.loading}</p>
              <div className="h-32 rounded-xl bg-secondary" />
            </div>
          ) : error && mode === "live" && !data.organization.id ? (
            <Button onClick={() => window.location.reload()}>
              {language === "tr" ? "Tekrar dene" : "Retry"}
            </Button>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
