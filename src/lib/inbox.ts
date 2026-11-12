import type { WorkspaceData } from "./domain";
import {
  copilotSchema,
  type Copilot,
  type Property,
  type Requirements,
} from "./inbox-domain";
const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
// Deterministic, local demo parser. No model is called; unknown facts stay null.
function extractSingle(message: string): Requirements {
  const s = normalize(message);
  const cities = [
    "Çanakkale",
    "İstanbul",
    "İzmir",
    "Ankara",
    "Bursa",
    "Antalya",
  ];
  const city = cities.find((city) => s.includes(normalize(city))) || null;
  const district =
    ["Merkez", "Kadıköy", "Beşiktaş", "Urla", "Çankaya"].find((v) =>
      s.includes(normalize(v)),
    ) || null;
  const million = s.match(/(\d+(?:[.,]\d+)?)\s*milyon/);
  const thousand = s.match(
    /(\d+(?:[.,]\d+)?)\s*bin\s*(?:tl|lira|try|euro|dolar)/,
  );
  const raw = s.match(
    /(\d[\d.\s]*\d|\d+)\s*(?:tl|lira|try|eur|euro|usd|dolar)/,
  );
  const budget_max = million
    ? Number(million[1].replace(",", ".")) * 1e6
    : thousand
      ? Number(thousand[1].replace(",", ".")) * 1000
      : raw
        ? Number(raw[1].replace(/[.\s]/g, ""))
        : null;
  const listing_type = /kiralik|kiralamak/.test(s)
    ? "rent"
    : /satilik|satin al/.test(s)
      ? "sale"
      : null;
  return {
    intent: /satmak ist/.test(s)
      ? "sell_property"
      : listing_type === "sale"
        ? "buy_property"
        : listing_type === "rent"
          ? "rent_property"
          : "unknown",
    city,
    district,
    budget_max,
    currency:
      budget_max === null
        ? null
        : /euro|eur/.test(s)
          ? "EUR"
          : /dolar|usd/.test(s)
            ? "USD"
            : /tl|lira|try/.test(s)
              ? "TRY"
              : null,
    rooms: message.match(/\b\d\s*\+\s*\d\b/)?.[0].replace(/\s/g, "") || null,
    property_type: /daire|apartman/.test(s)
      ? "apartment"
      : /villa/.test(s)
        ? "villa"
        : /ofis/.test(s)
          ? "office"
          : /arsa/.test(s)
            ? "land"
            : null,
    listing_type,
    elevator_required: /asansor/.test(s)
      ? !/asansor.*(?:gerekmez|istemiyorum)/.test(s)
      : null,
    floor_preference: /ara kat/.test(s)
      ? "middle_floor"
      : /zemin kat/.test(s)
        ? "ground_floor"
        : /son kat/.test(s)
          ? "top_floor"
          : null,
  };
}
export function extractDemoRequirements(source: string): Requirements {
  const result = extractSingle("");
  for (const line of source.split("\n")) {
    const next = extractSingle(line);
    for (const key of Object.keys(next) as (keyof Requirements)[]) {
      if (next[key] !== null && next[key] !== "unknown")
        Object.assign(result, { [key]: next[key] });
    }
  }
  return result;
}
export function matchingProperties(
  requirements: Requirements,
  properties: Property[],
) {
  // Do not label arbitrary listings as matches when there is no usable brief.
  if (
    !requirements.city ||
    !requirements.listing_type ||
    !requirements.property_type
  )
    return [];
  return properties.filter(
    (p) =>
      p.active &&
      normalize(p.city) === normalize(requirements.city!) &&
      (!requirements.district ||
        normalize(p.district) === normalize(requirements.district)) &&
      p.listing_type === requirements.listing_type &&
      p.property_type === requirements.property_type &&
      (!requirements.rooms || p.rooms === requirements.rooms) &&
      (requirements.budget_max === null ||
        (!!requirements.currency &&
          p.currency === requirements.currency &&
          p.price <= requirements.budget_max)) &&
      (requirements.elevator_required !== true || p.elevator) &&
      (!requirements.floor_preference ||
        p.floor === requirements.floor_preference),
  );
}
export function demoCopilot(source: string, language: "tr" | "en"): Copilot {
  const r = extractDemoRequirements(source);
  const tr = language === "tr";
  const missing: string[] = [];
  if (!r.city) missing.push(tr ? "Tercih edilen şehir" : "Preferred city");
  if (r.budget_max === null)
    missing.push(tr ? "Bütçe üst sınırı" : "Maximum budget");
  if (!r.rooms) missing.push(tr ? "Oda sayısı" : "Room count");
  if (!r.listing_type)
    missing.push(tr ? "Satılık / kiralık tercihi" : "Buying or renting");
  if (!r.property_type) missing.push(tr ? "Gayrimenkul tipi" : "Property type");
  const timelineKnown =
    /\b(?:hafta|ay|gun|yil|hemen|acil|month|week|immediately|20\d{2})\b/.test(
      normalize(source),
    );
  if (!timelineKnown)
    missing.push(
      tr ? "Taşınma veya satın alma takvimi" : "Moving or purchase timeline",
    );
  return copilotSchema.parse({
    summary: tr
      ? `${r.city || "Konumu henüz belirtilmemiş"} ${r.district || ""} bölgesinde ${r.rooms || ""} ${r.listing_type === "sale" ? "satılık" : r.listing_type === "rent" ? "kiralık" : "gayrimenkul"} arayışı. ${r.elevator_required ? "Asansör talebi var." : ""} ${r.floor_preference === "middle_floor" ? "Ara kat tercih ediliyor." : ""}`
      : `Property enquiry${r.city ? ` in ${r.city}` : ""}${r.rooms ? `, ${r.rooms}` : ""}.`,
    requirements: r,
    missing_information: missing,
    reply: tr
      ? `Merhaba, talebinizi paylaştığınız için teşekkür ederiz.${r.city ? ` ${r.city}${r.district ? ` ${r.district}` : ""} bölgesindeki` : ""}${r.rooms ? ` ${r.rooms}` : ""} arayışınızı not aldım.${r.elevator_required ? " Asansör" : ""}${r.floor_preference === "middle_floor" ? " ve ara kat" : ""}${r.elevator_required || r.floor_preference === "middle_floor" ? " tercihinizi de dikkate alacağız." : ""} ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} hakkında bilgi verebilir misiniz? ` : ""}${timelineKnown ? "İlettiğiniz tercihler doğrultusunda kayıtlı seçenekleri birlikte değerlendirebiliriz." : "Taşınma veya satın alma için düşündüğünüz zaman aralığını paylaşabilir misiniz?"}`
      : `Hello, thank you for sharing your requirements.${r.city ? ` I have noted your search in ${r.city}.` : ""} Could you share ${missing.join(", ").toLowerCase()}?`,
    follow_up: tr
      ? "Müşteriyle takvim ve eksik tercihler için görüşme planla"
      : "Arrange a follow-up to clarify the timeline and missing preferences",
  });
}
export function upgradeDemo(data: WorkspaceData): WorkspaceData {
  if (data.inbox_version >= 1) return data;
  const next = structuredClone(data);
  next.inbox_version = 1;
  const samples = [
    "Merhaba, Çanakkale merkezde 3 milyon TL bütçeyle 2+1 satılık daire arıyorum. Asansörlü olsun, ara kat tercih ederim.",
    "Merhaba, yeni ofisimiz için Beşiktaş'ta kiralık bir yer arıyoruz. Ulaşımı kolay olması önemli.",
    "Urla’da bahçeli bir villa arıyorum. Bütçem 12 milyon TL. Görüşebilir miyiz?",
    "İlginiz için teşekkür ederim. Evrakları görüşmemize getireceğim.",
  ];
  const baseTime = Date.now() - 5 * 60000;
  const messageTime = (i: number) =>
    new Date(baseTime - i * 7 * 60000).toISOString();
  next.conversations = next.leads.map((l, i) => ({
    id: l.id,
    lead_id: l.id,
    assignee_id: i === 1 ? null : next.members[0]?.user_id || null,
    unread_count: i === 0 || i === 1 ? 1 : 0,
    awaiting_reply: l.status !== "won",
    state: "open",
    updated_at: messageTime(i),
    analysis:
      i === 0
        ? demoCopilot(
            samples[i] || l.notes || "Merhaba, bilgi almak istiyorum.",
            next.profile.language,
          )
        : null,
  }));
  next.messages = next.leads.map((l, i) => ({
    id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    lead_id: l.id,
    conversation_id: l.id,
    content: samples[i] || l.notes || "Merhaba, bilgi almak istiyorum.",
    direction: "inbound",
    state: "received",
    created_at: messageTime(i),
  }));
  next.properties = [
    {
      id: "20000000-0000-4000-8000-000000000001",
      title: "Merkez'de asansörlü 2+1 daire",
      city: "Çanakkale",
      district: "Merkez",
      price: 2850000,
      currency: "TRY",
      rooms: "2+1",
      property_type: "apartment",
      listing_type: "sale",
      elevator: true,
      floor: "middle_floor",
      active: true,
    },
    {
      id: "20000000-0000-4000-8000-000000000002",
      title: "Urla'da bahçeli villa",
      city: "İzmir",
      district: "Urla",
      price: 11500000,
      currency: "TRY",
      rooms: "4+1",
      property_type: "villa",
      listing_type: "sale",
      elevator: false,
      floor: "ground_floor",
      active: true,
    },
  ];
  return next;
}
