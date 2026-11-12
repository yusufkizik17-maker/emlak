"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Inbox,
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  ChartNoAxesCombined,
  Settings,
  Search,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  LogOut,
  X,
  Plus,
  Command,
} from "lucide-react";
import { signOutAction } from "@/app/actions";
import { useWorkspace } from "@/features/workspace/provider";
import { useSidebarPreference } from "@/hooks/use-media-query";
import { Drawer } from "./drawer";
import { ThemeToggle } from "./theme-toggle";
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
  const tr = language === "tr";
  const [collapsed, toggle] = useSidebarPreference();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const inbox = path.startsWith("/inbox");
  const nav = [
    ["/inbox", "Inbox", Inbox],
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/leads", tr ? "Müşteriler" : "Customers", Users],
    ["/properties", tr ? "İlanlar" : "Properties", Building2],
    ["/tasks", t.tasks, CheckSquare],
    ["/analytics", tr ? "Analitik" : "Analytics", ChartNoAxesCombined],
    ["/settings", t.settings, Settings],
  ] as const;
  function renderNavigation({ compact = false }: { compact?: boolean }) {
    return (
      <div className="flex h-full flex-col gap-4 p-3">
        <Link
          href="/inbox"
          onClick={() => setMobileOpen(false)}
          className={`flex h-10 items-center gap-2.5 rounded-md ${compact ? "justify-center" : "px-2"}`}
          aria-label="LeadPilot AI"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-card">
            <Command className="size-4" aria-hidden="true" />
          </span>
          {!compact && (
            <span className="text-[15px] font-semibold tracking-tight">
              LeadPilot{" "}
              <span className="font-normal text-muted-foreground">AI</span>
            </span>
          )}
        </Link>
        {!compact && (
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-2 text-xs"
          >
            <span className="truncate font-medium">
              {data.organization.name || "Workspace"}
            </span>
            <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
          </Link>
        )}
        <nav
          aria-label={tr ? "Ana navigasyon" : "Main navigation"}
          className="space-y-1"
        >
          {nav.map(([href, title, Icon]) => (
            <Link
              key={href}
              href={href}
              title={compact ? title : undefined}
              aria-label={title}
              aria-current={path.startsWith(href) ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex h-9 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors ${compact ? "justify-center" : "px-2.5"} ${path.startsWith(href) ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
            >
              <Icon
                className={`size-4 shrink-0 ${href === "/inbox" && inbox ? "text-primary" : ""}`}
                aria-hidden="true"
              />
              {!compact && (
                <>
                  <span className="flex-1">{title}</span>
                  {href === "/inbox" &&
                    data.conversations.some((c) => c.unread_count) && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {
                          data.conversations.filter((c) => c.unread_count > 0)
                            .length
                        }
                      </span>
                    )}
                </>
              )}
            </Link>
          ))}
        </nav>
        {!compact && (
          <div className="mt-3 border-t pt-4">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {tr ? "ÇALIŞMA ALANI" : "WORKSPACE"}
            </p>
            <Link
              href="/leads?new=1"
              className="mt-2 flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <Plus className="size-3.5" />
              {t.newLead}
            </Link>
          </div>
        )}
        <div className="mt-auto border-t pt-3">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-md p-1.5 ${compact ? "justify-center" : ""}`}
            title={data.profile.full_name || t.profile}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-secondary text-[10px] font-semibold">
              {data.profile.full_name.slice(0, 2).toUpperCase() || "LP"}
            </span>
            {!compact && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">
                  {data.profile.full_name || t.profile}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {mode === "demo" ? "Demo workspace" : data.role}
                </p>
              </div>
            )}
          </Link>
          <div
            className={`mt-3 flex items-center ${compact ? "justify-center" : "justify-between px-2"}`}
          >
            <button
              onClick={toggle}
              className="hidden rounded p-1 text-muted-foreground hover:bg-secondary md:block"
              aria-label={
                tr
                  ? collapsed
                    ? "Menüyü genişlet"
                    : "Menüyü daralt"
                  : collapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
            {!compact && (
              <button
                aria-label={t.logout}
                className="rounded p-1 text-muted-foreground hover:bg-secondary"
                onClick={async () => {
                  try {
                    await signOutAction();
                  } catch {
                    setLogoutError(true);
                  }
                }}
              >
                <LogOut className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="workspace h-dvh overflow-hidden bg-background">
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:bg-card focus:p-3"
      >
        {tr ? "İçeriğe geç" : "Skip to content"}
      </a>
      <aside
        className={`fixed inset-y-0 left-0 hidden border-r bg-card md:block ${collapsed ? "w-16" : "w-[216px]"}`}
      >
        {renderNavigation({ compact: collapsed })}
      </aside>
      <Drawer
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        title="LeadPilot AI"
        description={tr ? "Çalışma alanı navigasyonu" : "Workspace navigation"}
      >
        {renderNavigation({})}
      </Drawer>
      <div
        className={`flex h-dvh min-w-0 flex-col ${collapsed ? "md:pl-16" : "md:pl-[216px]"}`}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
          <button
            className="rounded p-1 text-muted-foreground md:hidden"
            aria-label={t.menu}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Workspace <span className="px-2 text-border">/</span>
            <span className="text-foreground">
              {nav.find(([href]) => path.startsWith(href))?.[1] || t.ai}
            </span>
          </span>
          <form
            className="ml-auto flex min-w-0 max-w-52 items-center gap-2 rounded-md border bg-background px-2.5 py-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                `/leads?q=${encodeURIComponent(String(new FormData(e.currentTarget).get("q") || ""))}`,
              );
            }}
          >
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              name="q"
              aria-label={t.search}
              placeholder={t.search}
              maxLength={120}
              className="w-full min-w-0 bg-transparent text-xs outline-none"
            />
          </form>
          <select
            aria-label={t.language}
            value={language}
            onChange={(e) => setLanguage(e.target.value as "tr" | "en")}
            className="h-8 rounded-md border bg-card px-1 text-xs"
          >
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
          <div className="hidden sm:block">
            <ThemeToggle language={language} />
          </div>
        </header>
        <div className="flex min-h-7 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${mode === "demo" ? "bg-warning" : "bg-success"}`}
            />
            {mode === "demo"
              ? tr
                ? "Demo çalışma alanı · Örnek veriler · Harici mesaj gönderimi yok"
                : "Demo workspace · Sample data · No external delivery"
              : tr
                ? "Canlı veriler · Harici gönderim bağlı değil"
                : "Live data · External delivery not connected"}
          </span>
          <span className="hidden sm:inline">AI Communication Workspace</span>
        </div>
        {(error || notice || logoutError) && (
          <div
            role={error || logoutError ? "alert" : "status"}
            className={`fixed bottom-5 right-4 z-40 flex max-w-[calc(100%-2rem)] items-center gap-4 rounded-lg border bg-card px-4 py-3 text-xs shadow-lg ${error || logoutError ? "text-destructive" : "text-foreground"}`}
          >
            <span>{logoutError ? t.error : error || notice}</span>
            <button
              aria-label={t.close}
              onClick={() => {
                dismiss();
                setLogoutError(false);
              }}
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <main
          id="workspace-main"
          className={`min-h-0 flex-1 ${inbox ? "overflow-hidden" : "overflow-y-auto p-4 lg:p-6"}`}
        >
          {loading ? (
            <div
              role="status"
              className="grid h-full grid-cols-1 gap-4 p-5 sm:grid-cols-3"
            >
              <span className="sr-only">{t.loading}</span>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="skeleton h-full min-h-40 rounded-lg bg-secondary"
                />
              ))}
            </div>
          ) : error && mode === "live" && !data.organization.id ? (
            <div className="p-6">
              <p className="mb-3 text-sm">{t.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-primary"
              >
                {tr ? "Tekrar dene" : "Retry"}
              </button>
            </div>
          ) : (
            <>
              <div className={inbox ? "hidden" : ""}>
                {data.truncated && (
                  <p className="mb-4 text-xs text-warning">
                    {tr
                      ? "Listeler ilk 1.000 kayıtla sınırlıdır. Tam veriyi ayarlardan dışa aktarabilirsiniz."
                      : "Lists are limited to 1,000 records. Export the complete data in settings."}
                  </p>
                )}
              </div>
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
