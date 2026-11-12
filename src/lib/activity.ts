import type { Language } from "./i18n";
const labels: Record<string, [string, string]> = {
  "leads.insert": ["Müşteri eklendi", "Lead added"],
  "lead.create": ["Müşteri eklendi", "Lead added"],
  "leads.update": ["Müşteri güncellendi", "Lead updated"],
  "lead.update": ["Müşteri güncellendi", "Lead updated"],
  "leads.delete": ["Müşteri silindi", "Lead deleted"],
  "lead.delete": ["Müşteri silindi", "Lead deleted"],
  "tasks.insert": ["Görev oluşturuldu", "Task created"],
  "task.create": ["Görev oluşturuldu", "Task created"],
  "tasks.update": ["Görev güncellendi", "Task updated"],
  "task.toggle": ["Görev güncellendi", "Task updated"],
  "tasks.delete": ["Görev silindi", "Task deleted"],
  "task.delete": ["Görev silindi", "Task deleted"],
  "ai_suggestions.insert": ["AI taslağı hazırlandı", "AI draft prepared"],
  "ai_suggestions.update": ["AI taslağı onaylandı", "AI draft approved"],
  "suggestion.approve": ["AI taslağı onaylandı", "AI draft approved"],
  "memberships.insert": ["Ekip üyesi eklendi", "Team member added"],
  "memberships.update": ["Üye yetkisi güncellendi", "Member role updated"],
  "memberships.delete": ["Ekip üyesi kaldırıldı", "Team member removed"],
  "organizations.insert": ["İşletme oluşturuldu", "Business created"],
  "organizations.update": ["İşletme güncellendi", "Business updated"],
  "organization.update": ["İşletme güncellendi", "Business updated"],
  "lead_messages.insert": [
    "Müşteri mesajı analiz edildi",
    "Customer message analysed",
  ],
  "profile.update": ["Profil güncellendi", "Profile updated"],
};
export function activityLabel(action: string, language: Language) {
  return (
    labels[action]?.[language === "tr" ? 0 : 1] ||
    (language === "tr" ? "İşlem kaydedildi" : "Activity recorded")
  );
}
