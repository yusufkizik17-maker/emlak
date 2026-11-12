"use client";
import { useState } from "react";
import { Building2, MapPin, Plus, Search } from "lucide-react";
import { useWorkspace } from "@/features/workspace/provider";
import { propertyInput } from "@/lib/inbox-domain";
import { Button } from "@/components/ui/button";
import { Field, inputClass, PageHeading } from "@/components/form-fields";
import { Drawer } from "@/components/drawer";
export function PropertiesPage() {
  const { data, mutate, language, mode, t } = useWorkspace();
  const tr = language === "tr";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const types = {
    apartment: tr ? "Daire" : "Apartment",
    villa: "Villa",
    office: tr ? "Ofis" : "Office",
    land: tr ? "Arsa" : "Land",
  };
  return (
    <>
      <PageHeading
        title={tr ? "İlan portföyü" : "Property portfolio"}
        description={
          tr
            ? "Copilot yalnızca buradaki aktif kayıtları önerir. Uygunluk danışman tarafından doğrulanır."
            : "Copilot only suggests active records here. Availability must be verified by an advisor."
        }
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" />
            {tr ? "İlan ekle" : "Add property"}
          </Button>
        }
      />
      {mode === "demo" && (
        <p className="mb-5 text-xs text-muted-foreground">
          {tr
            ? "Demo portföy · Kayıtlar örnektir, gerçek satış ilanı değildir."
            : "Demo portfolio · These are sample records, not real listings."}
        </p>
      )}
      <div className="mb-4 flex max-w-sm items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" />
        <input
          aria-label={tr ? "İlan ara" : "Search properties"}
          placeholder={
            tr ? "Başlık veya konum ara…" : "Search title or location…"
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-xs outline-none"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.properties
          .filter((p) =>
            [p.title, p.city, p.district]
              .join(" ")
              .toLocaleLowerCase()
              .includes(q.toLocaleLowerCase()),
          )
          .map((p) => (
            <article className="rounded-lg border bg-card p-5" key={p.id}>
              <div className="flex items-start justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                  <Building2 className="size-4 text-muted-foreground" />
                </span>
                <span
                  className={`rounded px-2 py-1 text-[10px] ${p.active ? "bg-success-subtle text-success" : "bg-secondary text-muted-foreground"}`}
                >
                  {p.active
                    ? tr
                      ? "Aktif"
                      : "Active"
                    : tr
                      ? "Pasif"
                      : "Inactive"}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-semibold">{p.title}</h2>
              <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {p.city} / {p.district || "—"}
              </p>
              <p className="mt-5 text-lg font-semibold">
                {new Intl.NumberFormat(tr ? "tr-TR" : "en-US", {
                  style: "currency",
                  currency: p.currency,
                  maximumFractionDigits: 0,
                }).format(p.price)}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {types[p.property_type]} · {p.rooms || "—"} ·{" "}
                {p.listing_type === "sale"
                  ? tr
                    ? "Satılık"
                    : "For sale"
                  : tr
                    ? "Kiralık"
                    : "For rent"}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-5 w-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await mutate({
                      action: "property.toggle",
                      id: p.id,
                      active: !p.active,
                    });
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {p.active
                  ? tr
                    ? "Pasife al"
                    : "Deactivate"
                  : tr
                    ? "Aktifleştir"
                    : "Activate"}
              </Button>
            </article>
          ))}
      </div>
      {!data.properties.length && (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          <Building2 className="mx-auto mb-3 size-6" />
          {tr
            ? "Portföyünüz henüz boş. Bir ilan ekleyerek başlayın."
            : "Your portfolio is empty. Add a listing to start."}
        </div>
      )}
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title={tr ? "İlan ekle" : "Add property"}
        description={
          tr
            ? "Yalnızca doğruladığınız portföy bilgilerini girin."
            : "Enter only verified portfolio information."
        }
      >
        <form
          className="space-y-4 p-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const parsed = propertyInput.safeParse({
              ...Object.fromEntries(f),
              price: Number(f.get("price")),
              elevator: f.get("elevator") === "on",
              active: true,
            });
            if (!parsed.success) {
              setError(true);
              return;
            }
            setBusy(true);
            setError(false);
            try {
              await mutate({ action: "property.create", data: parsed.data });
              setOpen(false);
            } catch {
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={tr ? "İlan başlığı" : "Listing title"}>
            <input
              name="title"
              required
              minLength={3}
              maxLength={160}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr ? "Şehir" : "City"}>
              <input
                name="city"
                required
                minLength={2}
                maxLength={100}
                className={inputClass}
              />
            </Field>
            <Field label={tr ? "İlçe" : "District"}>
              <input name="district" maxLength={100} className={inputClass} />
            </Field>
            <Field label={tr ? "Fiyat" : "Price"}>
              <input
                name="price"
                type="number"
                min={1}
                max={1e12}
                required
                className={inputClass}
              />
            </Field>
            <Field label={tr ? "Para birimi" : "Currency"}>
              <select name="currency" className={inputClass}>
                <option>TRY</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </Field>
            <Field label={tr ? "Oda sayısı" : "Rooms"}>
              <input
                name="rooms"
                maxLength={20}
                placeholder="2+1"
                className={inputClass}
              />
            </Field>
            <Field label={tr ? "Tip" : "Type"}>
              <select name="property_type" className={inputClass}>
                {Object.entries(types).map(([key, v]) => (
                  <option key={key} value={key}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr ? "İlan tercihi" : "Listing type"}>
              <select name="listing_type" className={inputClass}>
                <option value="sale">{tr ? "Satılık" : "For sale"}</option>
                <option value="rent">{tr ? "Kiralık" : "For rent"}</option>
              </select>
            </Field>
            <Field label={tr ? "Kat" : "Floor"}>
              <select name="floor" className={inputClass}>
                <option value="middle_floor">
                  {tr ? "Ara kat" : "Middle floor"}
                </option>
                <option value="ground_floor">
                  {tr ? "Zemin kat" : "Ground floor"}
                </option>
                <option value="top_floor">
                  {tr ? "Son kat" : "Top floor"}
                </option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="elevator" />
            {tr ? "Asansör mevcut" : "Elevator available"}
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {t.error}
            </p>
          )}
          <Button disabled={busy}>{busy ? t.loading : t.save}</Button>
        </form>
      </Drawer>
    </>
  );
}
