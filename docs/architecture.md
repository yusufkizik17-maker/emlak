# LeadPilot AI — uygulanan mimari

## Tek modüler uygulama

Next.js App Router ve React/TypeScript kullanılır. Route Handlers Auth, CRUD ve
AI sınırlarıdır; çıkış Server Action ile yapılır. Feature bileşenleri
`src/features/workspace` altında, ortak doğrulama `src/lib/domain.ts` içindedir.
shadcn Button, Radix Slot, Tailwind ve Lucide ortak görsel temeli sağlar.
React/Supabase/OpenAI dışındaki gereksiz servis bağımlılıkları eklenmemiştir;
OpenAI için yerleşik fetch kullanılır. PGlite yalnızca test bağımlılığıdır.

## İki açık çalışma modu

`APP_MODE=demo` varsayılandır. Gerçek anahtar veya kullanıcı hesabı istemez.
Veriler `sessionStorage` içinde saklanır. Analiz sabit ve açıkça etiketli örnektir.
Onay ve takip görevi yerel state üzerinde çalışır. Gerçek mesaj gönderimi yoktur.

`APP_MODE=live` runtime'da okunur; ekranlar statik bir demo build'ine kilitlenmez.
Canlı mod demo verileriyle başlamaz ve servis hatasında demo fallback'i yapmaz.
Supabase yapılandırması eksikse erişim kapalı hata verir. Anahtarlar `server-only`
modüllerde kalır; istemciye OpenAI anahtarı veya service role gönderilmez.

## Tenant ve rol sınırı

`organizations`, `profiles`, `memberships`, `leads`, `lead_messages`, `tasks`,
`ai_suggestions`, `audit_logs` temel tablolardır. `request_counters` ve `ai_runs`
dağıtık hız/kota kontrolünün teknik tablolarıdır; doğrudan kullanıcı yazımı kapalıdır.

API oturumu `getUser` ile doğrular. Aktif tenant HttpOnly çerezden seçilir ve
kullanıcının güncel üyeliği her istekte sorgulanır. İstemci CRUD şemaları
organization_id kabul etmez. RLS politikaları ve tenant-qualified composite foreign
key'ler ikinci kontrol katmanıdır. Kullanıcı tek organizasyon varsayılmaz.

Owner/admin işletme yönetir. Admin yalnızca member ekleyebilir/değiştirebilir;
owner başka admin ekleyebilir. Owner normal ekip API'sinden kaldırılamaz veya
rolü düşürülemez. İşletme oluşturma ve üye yönetimi `search_path=''` ile tanımlı,
açık execute yetkili security definer RPC'leridir. Normal veri okuma/yazmaları
kullanıcı oturumu altında RLS ile çalışır.

## AI ve maliyet kontrolü

Mesaj güvenilmeyen veri olarak ayrı user içeriğine JSON ile konur; sistem
kurallarıyla birleştirilmez. Tool çağrısı veya mesaj gönderme yetkisi yoktur.
Yapılandırılmış JSON çıktı Zod ile doğrulanır, çıkarılan bütçe/konum/tip kaynak
metindeki gerçek alıntılarla eşleşmelidir. Yeni sayısal iddialar ve URL içeren
yanıtlar reddedilir. Belirsiz alanlar null'dır.

Rezervasyon veritabanında atomik tutulur: 20/gün, 100/ay/işletme. Failed/timeout
istekler de sayılır, otomatik tekrar yapılmaz. Girdi 4.000 karakter ve çıktı 1.200
token ile sınırlıdır. Yalnızca allowlist'teki mini/nano model seçilebilir.
Kota kayıtları lead silmeyle düşmez. Saklama temizliği cari aylık kotayı silmez.

Taslak onayı satır kilidiyle idempotent'tir: yinelenen onay ikinci görev üretmez.
Kullanıcı yanıtı düzenler; onay ve görev aynı transaction içinde saklanır.
Uygulamada e-posta/WhatsApp/SMS gönderimi veya webhook teslimatı bulunmaz.

## Veri yaşam döngüsü

Doğrudan lead silme ilgili mesaj/görev/önerileri temizler. Kuruluş saklama süresi,
owner kontrollü purge ve sayfalı JSON export uygulanmıştır. Audit kişisel içerik
taşımaz. Hesap/işletme kapatma, yedek retansiyonu ve periyodik purge işletim
prosedürü olarak belgelenmiştir; bu sürüm bunları otomatik çalıştırmaz.

## Doğrulama sınırı

Vitest iş kuralları ve mocked HTTP sağlayıcı hatalarını test eder. Migration
PGlite PostgreSQL motorunda gerçek SQL/RLS ile denenir; test `auth.users` ve
`auth.uid()` fixture'ları Supabase servisinin yerine geçmez. Playwright demo
üzerinde desktop/mobile kullanıcı akışlarını test eder. Gerçek Cloud Auth,
SMTP ve OpenAI bağlantıları anahtar/servis ve kurucu izni olmadan çalıştırılmaz.
Üretim yayını yapılmamıştır. Ayrıntılar: [yayın rehberi](deployment.md).
