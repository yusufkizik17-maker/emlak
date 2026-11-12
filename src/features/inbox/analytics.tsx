"use client";
import { useWorkspace } from "@/features/workspace/provider";
import { statuses } from "@/lib/domain";
import { PageHeading } from "@/components/form-fields";
export function AnalyticsPage() {
  const { data, t, language, mode } = useWorkspace();
  const tr = language === "tr";
  const approved = data.messages.filter(
    (m) => m.direction === "outbound" && m.state === "approved",
  ).length;
  return (
    <>
      <PageHeading
        title={tr ? "İletişim analitiği" : "Communication analytics"}
        description={
          tr
            ? "Görüntülenen kayıtların özeti. Teslimat kanalı bağlı olmadığı için gönderim ve yanıt süresi metrikleri gösterilmez."
            : "Summary of loaded records. Delivery and response-time metrics are unavailable without a connected channel."
        }
      />
      {mode === "demo" && (
        <p className="mb-5 text-xs text-muted-foreground">
          {tr
            ? "Demo verileri · Gerçek performans değildir."
            : "Demo records · Not real performance."}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-5 text-sm font-semibold">
            {tr ? "Müşteri durumları" : "Customer stages"}
          </h2>
          <div className="space-y-4">
            {statuses.map((s) => {
              const count = data.leads.filter((l) => l.status === s).length;
              return (
                <div key={s}>
                  <div className="mb-2 flex justify-between text-xs">
                    <span>{t[s]}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 rounded bg-secondary">
                    <div
                      className="h-1.5 rounded bg-primary/70"
                      style={{
                        width: `${(count / Math.max(data.leads.length, 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-lg border bg-card p-5">
          <h2 className="mb-5 text-sm font-semibold">
            {tr ? "Konuşma ve taslak özeti" : "Conversation and draft summary"}
          </h2>
          <dl className="divide-y text-xs">
            {[
              [
                tr ? "Açık konuşmalar" : "Open conversations",
                data.conversations.filter((c) => c.state === "open").length,
              ],
              [
                tr ? "Atanmış konuşmalar" : "Assigned conversations",
                data.conversations.filter((c) => c.assignee_id).length,
              ],
              [
                tr
                  ? "Onaylanmış, gönderilmemiş taslaklar"
                  : "Approved, unsent drafts",
                approved,
              ],
              [
                tr ? "Aktif kayıtlı ilanlar" : "Active saved listings",
                data.properties.filter((p) => p.active).length,
              ],
            ].map(([label, count]) => (
              <div className="flex justify-between gap-3 py-4" key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-semibold">{count}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}
