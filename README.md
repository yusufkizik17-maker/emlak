# LeadPilot AI

Küçük ve orta ölçekli işletmeler için AI destekli CRM MVP'si. İlk sektör: emlak.
Next.js App Router, React, TypeScript, Tailwind, shadcn/ui, Supabase ve OpenAI.
Tek uygulama mimarisi; mikroservis veya ödeme bağımlılığı yok.

## Bilgisayarınızda çalıştırma

Node.js **24 LTS**, npm **11** gerekir. Proje klasöründe:

```bash
npm ci
npm run dev
```

Tarayıcıda `http://localhost:3000` açın. Landing sayfasından **Demoyu keşfet**
veya doğrudan `/dashboard` yolunu kullanın. Varsayılan `APP_MODE=demo`:
API anahtarı, hesap, Supabase veya WhatsApp bağlantısı gerekmez.

İsteğe bağlı ortam dosyası:

```bash
cp .env.example .env.local
```

Windows PowerShell eşdeğeri: `Copy-Item .env.example .env.local`.
Var olan `.env.local` dosyanızı üzerine yazmayın. Gerçek değerleri Git'e eklemeyin.

## Özellikler ve çalışma modları

| Alan                                               | Demo                            | Canlı mod                                   |
| -------------------------------------------------- | ------------------------------- | ------------------------------------------- |
| Landing, TR/EN, açık/koyu tema, mobil arayüz       | Çalışır                         | Çalışır                                     |
| Dashboard, müşteri CRUD, arama ve durum filtreleri | Tarayıcı oturumunda çalışır     | Supabase bağlantısı ve migration gerekir    |
| Görev oluşturma/tamamlama/silme, gecikme görünümü  | Çalışır                         | Supabase gerekir                            |
| AI analizi ve düzenlenebilir yanıt taslağı         | Açıkça işaretli **sabit örnek** | OpenAI + Supabase gerekir                   |
| Taslak onayı ve tek takip görevi oluşturma         | Çalışır                         | Supabase üzerinde atomik RPC                |
| Profil/işletme ayarları ve JSON dışa aktarım       | Çalışır                         | Supabase gerekir                            |
| Kayıt/giriş, e-posta doğrulama, şifre sıfırlama    | Kimlik bilgisi toplamaz         | Supabase Auth/SMTP ayarları gerekir         |
| Çoklu işletme ve ekip rolleri                      | Örnek tek işletme               | Üyelik kontrolü ve RLS ile Supabase gerekir |
| Ödeme/abonelik tahsilatı, WhatsApp bağlantısı      | Yok                             | Bu sürümde entegrasyon yok                  |

**Bu sürüm hiçbir müşteriye mesaj göndermez.** Onay, taslağı kaydeder ve seçilirse
takip görevi açar. WhatsApp/e-posta/SMS gönderim API'si bulunmaz. Fiyatlandırma
kartları ürün planını gösterir; ödeme almaz.

Demo verileri yalnızca `sessionStorage` içindedir; sekme oturumu sonunda silinir.
Dil/tema tercihi `localStorage` içinde saklanır. Demo ekranlarına gerçek kişisel
veri girmeyin. Demo, canlı veri deposuna hiçbir yazma isteği yapmaz. Canlı modda
servis hatası oluşursa demo verilerine sessizce dönülmez.

## Kontroller

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm start
```

Playwright testleri geliştirme sunucusunu kendisi başlatır; önce aynı porttaki
sunucunuzu kapatın. Production tarayıcı testi için build sonrası:

```bash
E2E_PRODUCTION=1 npm run test:e2e
```

PowerShell: `$env:E2E_PRODUCTION='1'; npm run test:e2e`.
Kurulu Chromium alternatif olarak `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` ile
seçilebilir. Bu bulut ortamında doğrulanan komut:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium E2E_PRODUCTION=1 npm run test:e2e
```

Bulut ortamının kısıtlı kullanıcı dizininde npm önbelleği için
`npm_config_cache=/tmp/leadpilot-npm` kullanılabilir.

`npm test`, migration'ı PGlite'ın PostgreSQL motorunda çalıştırır. Auth şeması
ve JWT kullanıcı kimliği test fixture'ıdır; Supabase Cloud bağlantısının veya
SMTP teslimatının doğrulandığı anlamına gelmez. AI HTTP testleri sağlayıcıyı
mock'lar, ücretli OpenAI çağrısı yapmaz.

## Dosya yapısı

- `src/app`: sayfalar, Route Handlers ve sign-out Server Action.
- `src/features/workspace`: dashboard, leads, tasks, assistant, settings ve demo/canlı veri sağlayıcısı.
- `src/components`: ortak navigasyon, formlar, tema ve shadcn Button.
- `src/lib`: Zod şemaları, TR/EN sözlükleri, AI güvenlik doğrulaması.
- `src/lib/server`: sunucuya özel Supabase ve yetkilendirme sınırı.
- `supabase/migrations`: tablolar, ilişkiler, RLS, audit, atomik kota ve onay fonksiyonları.
- `tests`: masaüstü/mobil Playwright akışları.

[Mimari](docs/architecture.md) · [Servis/yayın rehberi](docs/deployment.md) ·
[Doğrulama raporu](docs/validation.md)

shadcn CLI registry erişimi ortamda engellendiğinden Button, resmi
`shadcn-ui/ui` GitHub kaynağından alındı; yalnızca cn ve eşdeğer Radix Slot
importları uyarlandı. `components.json` kayıtlıdır. Google Fonts yerine sistem
fontları kullanılır. Mevcut proje korunmuş, sıfırdan yeniden oluşturulmamıştır.
