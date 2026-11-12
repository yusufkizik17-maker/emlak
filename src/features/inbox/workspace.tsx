"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Search,
  ArrowLeft,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  CheckCheck,
  Plus,
  MessageSquare,
  Clock3,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { useWorkspace } from "@/features/workspace/provider";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Drawer } from "@/components/drawer";
import { Button } from "@/components/ui/button";
import { CopilotPanel } from "./copilot";
import { LeadForm } from "@/features/workspace/leads";
export function InboxWorkspace({ initialLeadId }: { initialLeadId?: string }) {
  const { data, mutate, language, mode, t } = useWorkspace();
  const tr = language === "tr";
  const tablet = useMediaQuery("(min-width: 768px)");
  const desktop = useMediaQuery("(min-width: 1280px)");
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      data.conversations.find((c) => c.lead_id === initialLeadId)?.id || null,
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [panel, setPanel] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [customerDialog, setCustomerDialog] = useState<"new" | "edit" | null>(
    null,
  );
  const [demoInput, setDemoInput] = useState(false);
  const [message, setMessage] = useState("");
  const approvalIds = useRef<Record<string, { content: string; id: string }>>(
    {},
  );
  const bottom = useRef<HTMLDivElement>(null);
  const readRef = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = data.conversations.find(
    (c) => c.id === (selectedId || (tablet ? data.conversations[0]?.id : null)),
  );
  const lead = data.leads.find((l) => l.id === selected?.lead_id);
  const messages = data.messages
    .filter((m) => m.conversation_id === selected?.id)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const draft = selected ? drafts[selected.id] || "" : "";
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [selected?.id, messages.length]);
  useEffect(() => {
    if (selected && readRef.current !== selected.id) {
      readRef.current = selected.id;
      if (selected.unread_count)
        void mutate({ action: "conversation.read", id: selected.id }).catch(
          () => {},
        );
    }
  }, [selected, mutate]);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  function select(id: string) {
    setSelectedId(id);
    setApproved(false);
    setDrawer(false);
  }
  function insert(text: string) {
    if (!selected) return;
    if (
      draft.trim() &&
      !confirm(
        tr
          ? "Mevcut taslağın yerine AI önerisi alınsın mı?"
          : "Replace the current draft with the AI suggestion?",
      )
    )
      return;
    setDrafts((d) => ({ ...d, [selected.id]: text }));
    setApproved(false);
    setDrawer(false);
  }
  const filtered = data.conversations.filter((c) => {
    const l = data.leads.find((l) => l.id === c.lead_id);
    return (
      c.state === "open" &&
      (!search ||
        [
          l?.name,
          ...data.messages
            .filter((m) => m.conversation_id === c.id)
            .map((m) => m.content),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())) &&
      (filter === "all" ||
        (filter === "unread" && c.unread_count > 0) ||
        (filter === "waiting" && c.awaiting_reply) ||
        (filter === "assigned" && c.assignee_id !== null))
    );
  });
  const time = (value: string) =>
    new Date(value).toLocaleTimeString(tr ? "tr-TR" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return (
    <div className="flex h-full min-w-0 bg-card">
      <section
        aria-label={tr ? "Konuşmalar" : "Conversations"}
        className={`w-full shrink-0 flex-col border-r md:w-[280px] xl:w-[296px] ${selected && !tablet ? "hidden" : "flex"}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <h1
            aria-label="Inbox"
            className="flex items-center gap-2 text-[15px] font-semibold"
          >
            Inbox{" "}
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              {data.conversations.filter((c) => c.state === "open").length}
            </span>
          </h1>
          <button
            type="button"
            onClick={() => setCustomerDialog("new")}
            aria-label={t.newLead}
            className="rounded p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="space-y-3 border-b px-3 pb-3">
          <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? "Konuşma ara…" : "Search conversations…"}
              aria-label={tr ? "Konuşma ara" : "Search conversations"}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
            <kbd className="rounded border px-1 text-[10px] text-muted-foreground">
              /
            </kbd>
          </div>
          <div className="flex gap-1.5">
            <select
              aria-label={tr ? "Konuşma filtresi" : "Conversation filter"}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-w-0 flex-1 rounded-md bg-secondary/60 px-2 py-1.5 text-[11px]"
            >
              <option value="all">
                {tr ? "Tüm konuşmalar" : "All conversations"}
              </option>
              <option value="unread">{tr ? "Okunmamış" : "Unread"}</option>
              <option value="waiting">
                {tr ? "Yanıt bekleyen" : "Awaiting reply"}
              </option>
              <option value="assigned">{tr ? "Atanmış" : "Assigned"}</option>
            </select>
            <span className="flex items-center px-1 text-[10px] text-muted-foreground">
              {tr ? "En yeni" : "Newest"}
            </span>
          </div>
        </div>
        <div
          role="listbox"
          aria-label={tr ? "Müşteri konuşmaları" : "Customer conversations"}
          className="min-h-0 flex-1 overflow-y-auto p-2"
        >
          {[...filtered]
            .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
            .map((c, i) => {
              const l = data.leads.find((l) => l.id === c.lead_id);
              const last = data.messages
                .filter((m) => m.conversation_id === c.id)
                .sort(
                  (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
                )[0];
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected?.id === c.id}
                  key={c.id}
                  onClick={() => select(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      const opts =
                        e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="option"]',
                        );
                      opts?.[
                        (i +
                          (e.key === "ArrowDown" ? 1 : -1) +
                          filtered.length) %
                          filtered.length
                      ]?.focus();
                    }
                  }}
                  className={`mb-1 flex w-full gap-2.5 rounded-md border p-3 text-left transition-colors ${selected?.id === c.id ? "border-border bg-secondary/65" : "border-transparent hover:bg-background"}`}
                >
                  <span className="relative mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-[10px] font-semibold">
                    {l?.name.slice(0, 2).toLocaleUpperCase() || "LP"}
                    {c.unread_count > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-card bg-primary" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold">
                        {l?.name || "—"}
                      </span>
                      <time className="shrink-0 text-[9px] text-muted-foreground">
                        {time(c.updated_at)}
                      </time>
                    </div>
                    <p className="mt-1.5 line-clamp-2 min-h-8 text-[11px] leading-4 text-muted-foreground">
                      {last?.direction === "outbound"
                        ? tr
                          ? "Taslak: "
                          : "Draft: "
                        : ""}
                      {last?.content ||
                        (tr ? "Henüz mesaj yok" : "No messages yet")}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                      {c.awaiting_reply ? (
                        <>
                          <Clock3 className="size-3 text-warning" />
                          <span>
                            {tr ? "Yanıt bekliyor" : "Awaiting reply"}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="size-3" />
                          <span>{tr ? "İncelendi" : "Reviewed"}</span>
                        </>
                      )}
                      {c.assignee_id && (
                        <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-secondary text-[8px]">
                          {data.members
                            .find((m) => m.user_id === c.assignee_id)
                            ?.full_name?.slice(0, 1) || "•"}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          {!filtered.length && (
            <div className="px-4 py-12 text-center text-xs text-muted-foreground">
              <Inbox className="mx-auto mb-3 size-6" />
              <p>
                {tr
                  ? "Bu görünümde konuşma yok."
                  : "No conversations in this view."}
              </p>
              <button
                className="mt-3 text-primary"
                onClick={() => {
                  setFilter("all");
                  setSearch("");
                }}
              >
                {tr ? "Filtreleri temizle" : "Clear filters"}
              </button>
            </div>
          )}
        </div>
        <p className="border-t px-4 py-3 text-[10px] leading-4 text-muted-foreground">
          {mode === "demo"
            ? tr
              ? "Demo konuşmaları · Gerçek kanal bağlı değil"
              : "Demo conversations · No channel connected"
            : tr
              ? "Kaydedilmiş mesajlar · Gönderim kanalı bağlı değil"
              : "Saved messages · No delivery channel connected"}
        </p>
      </section>
      <section
        aria-label={tr ? "Sohbet" : "Chat"}
        className={`${!selected && !tablet ? "hidden" : "flex"} min-w-0 flex-1 flex-col bg-background/70`}
      >
        {selected && lead ? (
          <>
            <header className="flex min-h-16 shrink-0 items-center gap-2 border-b bg-card px-3 lg:px-5">
              <button
                className="rounded p-1 md:hidden"
                aria-label={tr ? "Konuşmalara dön" : "Back to conversations"}
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeft className="size-4" />
              </button>
              <span className="hidden size-8 shrink-0 items-center justify-center rounded-full border bg-secondary text-xs font-semibold sm:flex">
                {lead.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[13px] font-semibold">
                  <button
                    onClick={() => setCustomerDialog("edit")}
                    title={t.edit}
                  >
                    {lead.name}
                  </button>
                </h2>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-success" />
                  {tr ? "Açık konuşma" : "Open conversation"}
                </span>
              </div>
              <select
                aria-label={tr ? "Danışmana ata" : "Assign advisor"}
                value={selected.assignee_id || ""}
                disabled={busy}
                onChange={async (e) => {
                  setBusy(true);
                  try {
                    await mutate({
                      action: "conversation.assign",
                      id: selected.id,
                      user_id: e.target.value || null,
                    });
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
                className="max-w-28 rounded-md border bg-card px-1 py-1.5 text-[10px]"
              >
                <option value="">{tr ? "Atanmamış" : "Unassigned"}</option>
                {data.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || m.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <button
                aria-label={
                  tr ? "AI Copilot panelini aç/kapat" : "Toggle AI Copilot"
                }
                aria-expanded={desktop ? panel : drawer}
                onClick={() => (desktop ? setPanel(!panel) : setDrawer(true))}
                className={`rounded-md p-2 ${desktop && panel ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
              >
                {desktop && panel ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </button>
            </header>
            <div className="flex items-center gap-2 border-b px-4 py-2 text-[10px] text-muted-foreground">
              <MessageSquare className="size-3" />
              {mode === "demo" ? "Demo" : tr ? "Manuel kayıt" : "Manual record"}
              <span className="mx-1 text-border">|</span>
              {tr ? "Konuşma geçmişi" : "Conversation history"}
              {mode === "demo" && (
                <button
                  className="ml-auto flex items-center gap-1 hover:text-foreground"
                  onClick={() => setDemoInput(true)}
                >
                  <Plus className="size-3" />
                  {tr ? "Demo mesajı ekle" : "Add demo message"}
                </button>
              )}
            </div>
            <div
              role="log"
              aria-label={tr ? "Mesaj geçmişi" : "Message history"}
              aria-live="polite"
              className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 lg:px-6"
            >
              <p className="text-center text-[10px] text-muted-foreground">
                {messages[0]
                  ? new Date(messages[0].created_at).toLocaleDateString(
                      tr ? "tr-TR" : "en-GB",
                      { day: "numeric", month: "long", year: "numeric" },
                    )
                  : tr
                    ? "Yeni konuşma"
                    : "New conversation"}
              </p>
              {messages.map((m) => (
                <article
                  key={m.id}
                  className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-lg border px-3.5 py-3 sm:max-w-[82%] ${m.direction === "outbound" ? "border-primary/15 bg-outgoing" : "border-border bg-card"}`}
                  >
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-6">
                      {m.content}
                    </p>
                    <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] text-muted-foreground">
                      <time>{time(m.created_at)}</time>
                      {m.direction === "outbound" && (
                        <>
                          <Check className="size-3" />
                          <span>
                            {tr
                              ? "Onaylandı · Gönderilmedi"
                              : "Approved · Not sent"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {!messages.length && (
                <p className="py-12 text-center text-xs text-muted-foreground">
                  {tr
                    ? "Henüz mesaj yok. Konuşma başlatmak için demo mesajı ekleyebilirsiniz."
                    : "No messages yet. Add a demo message to begin."}
                </p>
              )}
              <div ref={bottom} />
            </div>
            <form
              className="shrink-0 border-t bg-card p-3 lg:p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!approved || !draft.trim()) return;
                setBusy(true);
                try {
                  const previous = approvalIds.current[selected.id];
                  const requestId =
                    previous?.content === draft
                      ? previous.id
                      : crypto.randomUUID();
                  approvalIds.current[selected.id] = {
                    content: draft,
                    id: requestId,
                  };
                  await mutate({
                    action: "message.approve",
                    id: selected.id,
                    content: draft,
                    request_id: requestId,
                  });
                  delete approvalIds.current[selected.id];
                  setDrafts((d) => ({ ...d, [selected.id]: "" }));
                  setApproved(false);
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
                <div className="flex items-center justify-between border-b px-3 py-2 text-[10px] text-muted-foreground">
                  <span>{tr ? "Yanıt taslağı" : "Reply draft"}</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    {tr ? "İnsan onaylı" : "Human reviewed"}
                  </span>
                </div>
                <textarea
                  aria-label={tr ? "Yanıt taslağı" : "Reply draft"}
                  value={draft}
                  maxLength={2400}
                  rows={3}
                  onChange={(e) => {
                    setDrafts((d) => ({ ...d, [selected.id]: e.target.value }));
                    setApproved(false);
                  }}
                  placeholder={
                    tr
                      ? "Yanıtınızı yazın veya AI Copilot ile bir taslak hazırlayın…"
                      : "Write a reply or prepare a draft with AI Copilot…"
                  }
                  className="block max-h-44 min-h-24 w-full resize-y bg-transparent px-3 py-3 text-[13px] leading-6 outline-none"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={approved}
                      onChange={(e) => setApproved(e.target.checked)}
                      className="accent-[var(--primary)]"
                    />
                    {tr ? "Taslağı inceledim" : "I reviewed this draft"}
                  </label>
                  <Button
                    size="sm"
                    disabled={busy || !approved || !draft.trim()}
                  >
                    <Check className="size-3.5" />
                    {busy
                      ? t.loading
                      : tr
                        ? "Onayla ve kaydet"
                        : "Approve and save"}
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-[9px] leading-4 text-muted-foreground">
                {tr
                  ? "Onay, yalnızca taslağı kaydeder. WhatsApp, SMS veya e-posta gönderilmez."
                  : "Approval only saves the draft. No WhatsApp, SMS, or email is sent."}
              </p>
            </form>
          </>
        ) : (
          <div className="m-auto max-w-xs px-5 text-center">
            <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border bg-card">
              <Inbox className="size-5 text-muted-foreground" />
            </span>
            <h2 className="text-sm font-semibold">
              {tr ? "Bir konuşmayla başlayın" : "Start with a conversation"}
            </h2>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {tr
                ? "Müşteri konuşmalarınız ve AI önerileriniz tek çalışma alanında."
                : "Customer conversations and AI suggestions in one workspace."}
            </p>
            <Link
              href="/leads?new=1"
              className="mt-5 inline-flex items-center gap-1 text-xs text-primary"
            >
              {t.newLead}
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        )}
      </section>
      {desktop && panel && selected && (
        <aside
          aria-label="AI Copilot"
          className="w-[300px] shrink-0 overflow-y-auto border-l bg-card 2xl:w-[320px]"
        >
          <CopilotPanel
            key={selected.id}
            conversation={selected}
            onInsert={insert}
          />
        </aside>
      )}
      <Drawer
        open={!desktop && drawer && !!selected}
        onOpenChange={setDrawer}
        title="AI Copilot"
        description={
          tr
            ? "Konuşma analizi ve yanıt desteği"
            : "Conversation analysis and reply assistance"
        }
      >
        {selected && (
          <CopilotPanel
            key={selected.id}
            conversation={selected}
            onInsert={insert}
          />
        )}
      </Drawer>
      <Drawer
        open={customerDialog !== null}
        onOpenChange={(open) => {
          if (!open) setCustomerDialog(null);
        }}
        title={customerDialog === "edit" ? t.edit : t.newLead}
        description={
          tr
            ? "Müşteri bilgilerini çalışma alanından ayrılmadan yönetin."
            : "Manage customer details without leaving the workspace."
        }
      >
        <div className="p-4">
          <LeadForm
            key={customerDialog || "closed"}
            lead={customerDialog === "edit" ? lead : undefined}
            onDone={() => setCustomerDialog(null)}
          />
        </div>
      </Drawer>
      <Drawer
        open={demoInput}
        onOpenChange={setDemoInput}
        title={tr ? "Demo müşteri mesajı" : "Demo customer message"}
        description={
          tr
            ? "Yalnızca bu demo oturumuna eklenir."
            : "Added to this demo session only."
        }
      >
        <form
          className="space-y-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selected) return;
            setBusy(true);
            try {
              await mutate({
                action: "message.receive",
                id: selected.id,
                content: message,
              });
              setMessage("");
              setDemoInput(false);
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="grid gap-2 text-xs">
            {tr ? "Müşteri mesajı" : "Customer message"}
            <textarea
              required
              minLength={1}
              maxLength={4000}
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-md border bg-background p-3 text-sm"
            />
          </label>
          <Button disabled={busy}>{tr ? "Mesajı ekle" : "Add message"}</Button>
        </form>
      </Drawer>
    </div>
  );
}
