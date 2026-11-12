import type { Analysis, WorkspaceData } from "./domain";
const stamp = "2026-11-12T08:00:00.000Z";
export const demoData: WorkspaceData = {
  inbox_version: 0,
  conversations: [],
  messages: [],
  properties: [],
  organization: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Nova Emlak",
    retention_days: 365,
  },
  profile: { full_name: "Deniz Yılmaz", language: "tr" },
  role: "owner",
  memberships: [],
  members: [
    {
      user_id: "00000000-0000-4000-8000-000000000099",
      role: "owner",
      full_name: "Deniz Yılmaz",
      email: "deniz@example.com",
    },
  ],
  leads: [
    {
      id: "00000000-0000-4000-8000-000000000011",
      name: "Elif Demir",
      email: "elif@example.com",
      phone: "",
      location: "Kadıköy, İstanbul",
      budget: "6–8 milyon TL",
      property_type: "3+1 daire",
      status: "qualified",
      notes: "Metroya yakın, aile yaşamına uygun bir ev arıyor.",
      created_at: stamp,
    },
    {
      id: "00000000-0000-4000-8000-000000000012",
      name: "Mert Kaya",
      email: "mert@example.com",
      phone: "",
      location: "Beşiktaş, İstanbul",
      budget: "Belirtilmedi",
      property_type: "Ofis",
      status: "new",
      notes: "Yeni ofisi için seçenekleri öğrenmek istiyor.",
      created_at: stamp,
    },
    {
      id: "00000000-0000-4000-8000-000000000013",
      name: "Selin Arslan",
      email: "selin@example.com",
      phone: "",
      location: "Urla, İzmir",
      budget: "12 milyon TL",
      property_type: "Villa",
      status: "contacted",
      notes: "Bahçeli ev; taşınma tarihi henüz belli değil.",
      created_at: stamp,
    },
    {
      id: "00000000-0000-4000-8000-000000000014",
      name: "Can Aydın",
      email: "can@example.com",
      phone: "",
      location: "Çankaya, Ankara",
      budget: "4 milyon TL",
      property_type: "2+1 daire",
      status: "won",
      notes: "Satış süreci tamamlandı.",
      created_at: stamp,
    },
  ],
  tasks: [
    {
      id: "00000000-0000-4000-8000-000000000021",
      title: "Elif ile görüntüleme zamanını planla",
      lead_id: "00000000-0000-4000-8000-000000000011",
      due_at: "2026-11-13T10:00:00.000Z",
      completed: false,
      created_at: stamp,
    },
    {
      id: "00000000-0000-4000-8000-000000000022",
      title: "Mert'in bütçe aralığını öğren",
      lead_id: "00000000-0000-4000-8000-000000000012",
      due_at: "2026-11-14T09:00:00.000Z",
      completed: false,
      created_at: stamp,
    },
    {
      id: "00000000-0000-4000-8000-000000000023",
      title: "Can ile kapanış görüşmesi",
      lead_id: "00000000-0000-4000-8000-000000000014",
      due_at: "2026-11-11T10:00:00.000Z",
      completed: true,
      created_at: stamp,
    },
  ],
  suggestions: [],
  activities: [
    { id: "demo-activity", action: "lead.create", created_at: stamp },
  ],
};
export function demoAnalysis(language: "tr" | "en"): Analysis {
  return language === "tr"
    ? {
        summary:
          "Örnek analiz: müşteri bir gayrimenkul hakkında bilgi istiyor.",
        intent: "Gayrimenkul arayışı (örnek)",
        budget: null,
        location: null,
        property_type: null,
        missing_information: [
          "Bütçe",
          "Tercih edilen konum",
          "Gayrimenkul tipi",
        ],
        follow_up: "Müşterinin bütçe ve konum tercihlerini öğren",
        reply:
          "Merhaba, talebiniz için teşekkür ederiz. Size uygun seçenekleri değerlendirebilmek için bütçe aralığınızı, tercih ettiğiniz konumu ve gayrimenkul tipini paylaşabilir misiniz?",
      }
    : {
        summary: "Sample analysis: a customer is asking about a property.",
        intent: "Property search (sample)",
        budget: null,
        location: null,
        property_type: null,
        missing_information: ["Budget", "Preferred location", "Property type"],
        follow_up: "Ask about budget and location preferences",
        reply:
          "Hello, thank you for your enquiry. Could you share your budget range, preferred location, and property type so we can better understand your requirements?",
      };
}
