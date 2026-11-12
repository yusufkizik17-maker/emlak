# Geliştirme ve doğrulama raporu — 12 Kasım 2026

Mevcut Aşama 1 dosyaları korunarak Aşama 2–5'in MVP kodu geliştirildi.
Proje sıfırlanmadı. Gerçek müşteriye mesaj gönderilmedi, ücretli API çağrısı
ve canlı dağıtım yapılmadı.

## Son doğrulama

| Kontrol | Sonuç |
| --- | --- |
| `npm ci` (kilit dosyasından tekrar kurulum) | Geçti |
| `npm run lint` (`--max-warnings 0`) | Geçti, 0 hata / 0 uyarı |
| `npm run typecheck` | Geçti |
| `npm test` | 6 dosya, **37 test geçti**, başarısız/skip yok |
| `npm run build` | Geçti; istenen tüm sayfalar ve API rotaları üretildi |
| Production Playwright | **8 test geçti**, başarısız/skip yok |
| `npm audit --omit=dev` | 0 bildirilen üretim bağımlılığı açığı |
| İstemci bundle kontrolü | OpenAI anahtar değişkeni/test anahtar işareti static bundle'da bulunmadı |

Node.js 24.22.1, npm 11.9.0. Tarayıcı testleri ortamda kurulu
`/usr/bin/chromium` ile çalıştırıldı. E-posta/WhatsApp/OpenAI teslimatı yapılmadı.
Npm, upstream ESLint 9 için deprecation bildirir; lint başarılıdır.
Playwright çıktısındaki NO_COLOR/FORCE_COLOR uyarısı test sonucunu etkilemez.

## Test kapsamı

- Geçersiz çalışma modu ve kullanıcı girdisi reddi; istemci organization_id
  enjeksiyonunun reddi; body byte sınırı ve same-origin kontrolü.
- Sunucuda `getUser`, aktif tenant üyeliği ve rol kontrolü; kota DB hatasında
  erişimin kapalı kalması; demo modunda remote storage'ın reddi.
- Migration PGlite PostgreSQL motorunda çalıştırıldı. 10 tabloda RLS,
  tenantlar arası SELECT/INSERT/UPDATE/DELETE, organization_id taşıma yasağı,
  composite foreign key, sahte üyelik, owner koruması ve ekip e-posta gizliliği.
- İşletme ilk oluşturmasının idempotency'si; DB rate limit; AI günlük kota;
  lead silmenin tüketilmiş kotayı sıfırlamaması; lead ve organizasyon cascade silme.
- AI structured output, eksik/ekstra alan ve aşırı uzun içerik reddi;
  iletişim bilgisinin basit maskelenmesi; kaynaksız bütçe/konum ve yeni sayısal
  iddiaların reddi; model refusal, truncated çıktı, timeout ve sağlayıcı hataları.
- Çağrı öncesi kota rezervasyonu; geçersiz çıktıların kaydedilmemesi; aynı taslak
  iki kere onaylandığında tek takip görevi oluşması. AI sağlayıcısı mock'landı.
- Desktop/mobile landing tema ve dil; dilin yenileme/giriş sayfasında korunması; demo müşteri ekleme/düzenleme/arama;
  düzenlenmiş AI taslağını onaylama ve oluşan görevi tamamlama.
- Mobil menü ve Escape ile odak dönüşü; profil kaydı; sayfa geçişleri; yatay taşma;
  demo giriş ekranının kimlik bilgisi toplamaması ve remote endpoint'in 409 dönmesi.
- Dashboard ekran görüntüleri alındı ve masaüstü/mobil görsel inceleme yapıldı.

## Aşamalar ve dosyalar

1. Mevcut Next.js, TypeScript, Tailwind ve shadcn temeli korundu. Runtime demo/live
   seçimi ve tema tercih saklama davranışı geliştirildi.
2. `src/components/landing.tsx`, `workspace-shell.tsx`, `form-fields.tsx`,
   `auth-form.tsx`, `src/hooks/use-browser-language.ts`; `src/features/workspace/{dashboard,leads,tasks,assistant,settings,provider}.tsx`;
   `src/app/(workspace)/*`, auth sayfaları; `src/lib/{domain,demo,i18n,activity}.ts`.
   Demo akışları desktop/mobile testleriyle doğrulandı.
3. `supabase/migrations/202611120001_initial.sql`, `src/lib/server/*`,
   `src/app/api/{workspace,auth}/route.ts`, `src/app/auth/callback/route.ts`,
   `src/app/actions.ts`, `.env.example`, `src/lib/env.ts`.
   SQL/RLS ve sunucu yetkilendirme testleri geçti.
4. `src/lib/ai.ts`, `src/app/api/ai/route.ts` ve ilgili AI testleri.
   Ücret oluşturmayan mocked sağlayıcı testleri geçti.
5. `src/lib/*.test.ts`, `src/lib/server/security.test.ts`,
   `src/app/api/ai/route.test.ts`, `tests/foundation.spec.ts`, test yapılandırmaları,
   `next.config.ts`, `.nvmrc`, README ve deployment/mimari rehberleri.
   Son lint/typecheck/test/build/production E2E kontrolleri geçti.

## Gerçek bağlantı gerektiren ve çalıştırılmayan kontroller

Bu ortamda Supabase URL/publishable key, OpenAI API key ve SMTP bağlantısı yoktur.
Canlı Supabase Auth/e-posta doğrulama ve parola recovery, uzaktaki DB migration'ı,
gerçek Auth JWT'leriyle Cloud RLS, gerçek OpenAI çıktıları ve Vercel dağıtımı
**çalıştırılmadı**. Bunlar başarılı olarak raporlanmaz.

PGlite, PostgreSQL motorunun SQL/RLS davranışını test eder; Supabase Cloud Auth,
PostgREST, SMTP, yedekleme veya dağıtık üretim yük testi değildir. Canlı servis
bağlantılarını kurduktan sonra deployment rehberindeki iki kullanıcı/iki tenant
kontrolleri ayrıca yapılmalıdır. Gerçek OpenAI kullanımı kurucu izni gerektirir.

WhatsApp, SMS veya müşteri e-postası gönderim entegrasyonu yoktur. Demo AI sabit
örnektir; ödeme/abonelik tahsilatı ve otomatik purge scheduler bu MVP'de yoktur.
Liste ekranları 1.000 kayda sınırlıdır; gerçek metrikler tüm kayıtları sayar ve
sınır arayüzde bildirilir. Büyük tenantlarda sunucu sayfalaması gerekir.

## Bulut ortamı

Tekrarlanabilir `install_script` ve `start_skill` taslak olarak kaydedildi.
Taslak kaydı komutları otomatik çalıştırmaz veya uygulamayı yayımlamaz. Bu makinede
kurulum/test/build ayrıca çalıştırıldı. Yeni görevde snapshot restorasyonu ve
ortam yayını henüz doğrulanmadı. Gelecek görevlerde kullanmak için ortam ayarlarında
taslağı gözden geçirip kaydedin, ardından bulut ortamını Publish ile yayımlayın;
bu işlem uygulamayı Vercel'de canlıya almakla aynı değildir.
