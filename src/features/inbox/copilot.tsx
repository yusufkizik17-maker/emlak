"use client";
import {
  Sparkles,
  MapPin,
  Building2,
  Check,
  CircleHelp,
  ListFilter,
  ArrowDownLeft,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace } from "@/features/workspace/provider";
import { matchingProperties } from "@/lib/inbox";
import type { WorkspaceData } from "@/lib/domain";
import { Button } from "@/components/ui/button";
export function CopilotPanel({
  conversation,
  onInsert,
}: {
  conversation: WorkspaceData["conversations"][number];
  onInsert: (text: string) => void;
}) {
  const { data, copilot, mutate, language, mode, t } = useWorkspace();
  const tr = language === "tr";
  const [busy, setBusy] = useState(false);
  const [taskAdded, setTaskAdded] = useState(false);
  const a = conversation.analysis;
  const r = a?.requirements;
  const taskExists =
    !!a &&
    data.tasks.some(
      (task) =>
        task.lead_id === conversation.lead_id &&
        task.title === a.follow_up &&
        !task.completed,
    );
  const matches = r ? matchingProperties(r, data.properties) : [];
  const propertyLabels = {
    apartment: tr ? "Daire" : "Apartment",
    villa: "Villa",
    office: tr ? "Ofis" : "Office",
    land: tr ? "Arsa" : "Land",
  };
  const fields = r
    ? [
        [
          tr ? "Amaç" : "Intent",
          r.intent === "buy_property"
            ? tr
              ? "Konut satın alma"
              : "Buy property"
            : r.intent === "rent_property"
              ? tr
                ? "Kiralama"
                : "Rent property"
              : r.intent === "sell_property"
                ? tr
                  ? "Satış"
                  : "Sell property"
                : "—",
        ],
        [t.location, [r.city, r.district].filter(Boolean).join(" / ") || "—"],
        [
          t.budget,
          r.budget_max === null
            ? "—"
            : r.currency
              ? new Intl.NumberFormat(tr ? "tr-TR" : "en-US", {
                  style: "currency",
                  currency: r.currency,
                  maximumFractionDigits: 0,
                }).format(r.budget_max)
              : `${new Intl.NumberFormat(tr ? "tr-TR" : "en-US").format(r.budget_max)} · ${tr ? "Para birimi belirtilmedi" : "Currency unknown"}`,
        ],
        [
          tr ? "Oda / Tip" : "Rooms / Type",
          [r.rooms, r.property_type ? propertyLabels[r.property_type] : null]
            .filter(Boolean)
            .join(" · ") || "—",
        ],
        [
          tr ? "İlan tercihi" : "Listing preference",
          r.listing_type === "sale"
            ? tr
              ? "Satılık"
              : "For sale"
            : r.listing_type === "rent"
              ? tr
                ? "Kiralık"
                : "For rent"
              : "—",
        ],
        [
          tr ? "Asansör / Kat" : "Elevator / Floor",
          [
            r.elevator_required === true
              ? tr
                ? "Asansör gerekli"
                : "Elevator required"
              : r.elevator_required === false
                ? tr
                  ? "Asansör şart değil"
                  : "Elevator optional"
                : null,
            r.floor_preference === "middle_floor"
              ? tr
                ? "Ara kat"
                : "Middle floor"
              : r.floor_preference === "ground_floor"
                ? tr
                  ? "Zemin kat"
                  : "Ground floor"
                : r.floor_preference === "top_floor"
                  ? tr
                    ? "Son kat"
                    : "Top floor"
                  : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—",
        ],
      ]
    : [];
  return (
    <div className="text-xs">
      <div className="border-b px-4 py-4">
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-3.5" />
          </span>
          AI Copilot
          <span className="ml-auto rounded border px-1.5 py-0.5 text-[9px] font-normal text-muted-foreground">
            {mode === "demo" ? "DEMO" : "AI"}
          </span>
        </div>
        <p className="mt-2 leading-5 text-muted-foreground">
          {tr
            ? "Konuşmanın bağlamından bir sonraki adıma."
            : "From conversation context to the next step."}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full"
          disabled={
            busy ||
            !data.messages.some(
              (m) =>
                m.conversation_id === conversation.id &&
                m.direction === "inbound",
            )
          }
          onClick={async () => {
            setBusy(true);
            try {
              await copilot(conversation.id);
            } catch {
              /* Shared toast. */
            } finally {
              setBusy(false);
            }
          }}
        >
          <Sparkles className="size-3.5" />
          {busy
            ? t.loading
            : tr
              ? a
                ? "Analizi yenile"
                : "Konuşmayı analiz et"
              : a
                ? "Refresh analysis"
                : "Analyse conversation"}
        </Button>
      </div>
      {mode === "demo" && (
        <p className="mx-4 mt-4 rounded-md border bg-background px-3 py-2 text-[10px] leading-4 text-muted-foreground">
          {tr
            ? "Yerel demo analizi · Gerçek AI çağrısı yapılmaz. İlanlar örnek kayıtlarınızdır."
            : "Local demo analysis · No real AI request. Listings are your sample records."}
        </p>
      )}
      {!a ? (
        <div className="px-5 py-12 text-center">
          <Sparkles className="mx-auto mb-3 size-6 text-muted-foreground" />
          <p className="font-medium">
            {tr ? "Bağlamı birlikte netleştirelim" : "Make the context clearer"}
          </p>
          <p className="mt-2 leading-5 text-muted-foreground">
            {tr
              ? "Özet, tercihler ve kayıtlı ilan eşleşmeleri için konuşmayı analiz edin."
              : "Analyse the conversation for a summary, preferences, and saved listing matches."}
          </p>
        </div>
      ) : (
        <>
          <section className="border-b px-4 py-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold">
              <ClipboardList className="size-3.5 text-muted-foreground" />
              {tr ? "Müşteri özeti" : "Customer summary"}
            </h3>
            <p className="leading-6 text-muted-foreground">{a.summary}</p>
          </section>
          <section className="border-b px-4 py-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <ListFilter className="size-3.5 text-muted-foreground" />
              {tr ? "İhtiyaç ve tercihler" : "Needs and preferences"}
            </h3>
            <dl className="space-y-3">
              {fields.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[80px_1fr] gap-2">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="text-[11px] font-medium leading-5">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="border-b px-4 py-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <CircleHelp className="size-3.5 text-muted-foreground" />
              {tr ? "Eksik bilgiler" : "Missing information"}
            </h3>
            <ul className="space-y-2 text-[11px] text-muted-foreground">
              {a.missing_information.map((v) => (
                <li key={v} className="flex gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-border" />
                  {v}
                </li>
              ))}
            </ul>
          </section>
          <section className="border-b px-4 py-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Building2 className="size-3.5 text-muted-foreground" />
              {tr ? "Kayıtlı ilan eşleşmeleri" : "Saved listing matches"}
              <span className="ml-auto text-muted-foreground">
                {matches.length}
              </span>
            </h3>
            {matches.length ? (
              matches.map((p) => (
                <details
                  className="mb-2 rounded-md border bg-background p-3"
                  key={p.id}
                >
                  <summary className="cursor-pointer text-[11px] font-medium leading-5">
                    {p.title}
                    <span className="mt-1 block font-semibold">
                      {new Intl.NumberFormat(tr ? "tr-TR" : "en-US", {
                        style: "currency",
                        currency: p.currency,
                        maximumFractionDigits: 0,
                      }).format(p.price)}
                    </span>
                  </summary>
                  <p className="mt-3 flex gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    {p.city} / {p.district} · {p.rooms}
                  </p>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    {tr
                      ? "Kayıtlı ilan bilgisi; uygunluk ayrıca doğrulanmalıdır."
                      : "Saved listing details; availability must be verified."}
                  </p>
                </details>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-3 text-[11px] leading-5 text-muted-foreground">
                {tr
                  ? "Kayıtlı ilanlarda tüm bilinen kriterleri karşılayan eşleşme yok. Yeni bir ilan varsayılmadı."
                  : "No saved listing meets all known criteria. No listing has been invented."}
              </p>
            )}
          </section>
          <section className="border-b px-4 py-4">
            <h3 className="mb-2 font-semibold">
              {tr ? "Yanıt taslağı" : "Reply draft"}
            </h3>
            <p className="rounded-md bg-secondary/50 p-3 text-[11px] leading-6">
              {a.reply}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => onInsert(a.reply)}
            >
              <ArrowDownLeft className="size-3.5" />
              {tr ? "Taslağı düzenlemeye al" : "Edit this draft"}
            </Button>
          </section>
          <section className="px-4 py-4">
            <h3 className="mb-2 font-semibold">
              {tr ? "Önerilen takip" : "Suggested follow-up"}
            </h3>
            <p className="text-[11px] leading-5 text-muted-foreground">
              {a.follow_up}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full"
              disabled={busy || taskAdded || taskExists}
              onClick={async () => {
                setBusy(true);
                try {
                  await mutate({
                    action: "task.create",
                    data: {
                      title: a.follow_up,
                      lead_id: conversation.lead_id,
                      due_at: new Date(Date.now() + 86400000).toISOString(),
                      completed: false,
                    },
                  });
                  setTaskAdded(true);
                } catch {
                  /* Shared toast. */
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check className="size-3.5" />
              {taskAdded || taskExists
                ? tr
                  ? "Görev oluşturuldu"
                  : "Task created"
                : tr
                  ? "Takip görevi oluştur"
                  : "Create follow-up task"}
            </Button>
          </section>
        </>
      )}
    </div>
  );
}
