# Doğrulama raporu — Inbox redesign, 12 Kasım 2026

Mevcut LeadPilot AI kodu genişletildi. Eski CRM, görevler, ayarlar, kullanıcı
akışları ve legacy AI ekranı korundu. Proje sıfırdan oluşturulmadı. Ücretli servis
çağrısı, müşteri mesajı gönderimi ve canlı dağıtım yapılmadı.

## Son doğrulama

| Kontrol                             | Sonuç                                                    |
| ----------------------------------- | -------------------------------------------------------- |
| `npm run lint` (`--max-warnings 0`) | Geçti; 0 hata, 0 uyarı                                   |
| `npm run typecheck`                 | Geçti                                                    |
| `npm test`                          | **10 dosya, 58 test geçti**; başarısız/skip yok          |
| `npm run build`                     | Geçti; Inbox, Properties, Analytics ve Copilot API dahil |
| Production Playwright               | **27 test geçti**; desktop, tablet, mobile               |
| `npm audit --omit=dev`              | 0 bildirilen üretim bağımlılığı açığı                    |

Node.js 24.22.1 / npm 11.9.0. Tarayıcı: kurulu Chromium.
Playwright tablet/mobil viewport ve etkileşim emülasyonu yapar; gerçek bir
Safari/iOS cihaz testi yapıldığı iddia edilmez. E2E sunucusu varsayılan 3100
portunu kullanır; geliştirme uygulamasını kapatmaz.

## Yeni test kapsamı

- Kurucunun Çanakkale / 3 milyon TL / 2+1 / satılık daire / asansör / ara kat
  örneğinin yapılandırılmış çıkarımı. Bilinen alanlar tekrar sorulmaz.
- Sonraki gelen mesajların bütçe gibi önceki tercihleri güncellemesi; verilmiş
  takvimin yeniden sorulmaması; bilinmeyen alanların null kalması.
- Yalnızca kayıtlı/aktif ve tüm bilinen kriterleri karşılayan ilan eşleşmeleri.
  Bütçe, para birimi, konum veya aktiflik uymuyorsa eşleşme üretilmemesi.
- Eski sessionStorage kayıtları genişletilirken müşteri notlarının ve görevlerin
  korunması; dönüştürmenin idempotent olması.
- Yeni SQL migration'ının eski müşteri/mesaj kayıtlarını koruyup konuşmaya bağlaması.
- Yeni lead için otomatik konuşma açılması. İki tenant arasında konuşma/ilan
  erişimi, başka tenant'ın kullanıcısına atama ve sahte onay girişimlerinin reddi.
- Onay RPC'sinin aynı request kimliğinde ikinci kayıt üretmemesi; mesaj durumunun
  yalnızca `approved` olması; delivered durumunun oluşturulamaması.
- Copilot kaydının geçerli rezervasyon ve son mesaj sürümüyle sınırlı olması.
- Structured output, kaynakta olmayan bütçe/konum/sayı/URL ve modelin ek ilan
  alanı üretmesinin reddi. Aşırı uzun bağlamın sessizce kırpılmadan reddi.
- Mocked sağlayıcı ile quota öncesi çağrı yapılmaması, erişilemeyen konuşma için
  provider çağrılmaması, refusal ve bozuk çıktının kaydedilmemesi.
- Inbox'ta filtre/arama, klavye seçimi ve danışman atama; yenilemede korunması.
- Desktop üç sütun, tablet drawer, mobil liste/sohbet geri dönüşü; yatay taşma yok.
- Copilot taslağını düzenleme, inceleme kutusu olmadan onayın kapalı olması,
  onay sonrası **Gönderilmedi** durumu.
- İlan ekleme/pasife alma; yenilemede kayıtların korunması.
- Inbox'tan ayrılmadan müşteri ekleme ve düzenleme; notların korunması.
- Light/Dark/System; yenileme, OS renk değişimi ve sidebar daraltma tercihi.
- Drawer Escape/focus dönüşü; landing ve auth dil tercihi; korunmuş legacy
  CRM/AI/görev akışları; demo modunda remote persistence'ın 409 ile reddi.

Açık/koyu tema ve mobil/tablet ekran görüntüleri alınıp incelendi. README'deki
görüntüler demo verileridir. İlk turda bulunan drawer odak dönüşü, test sorgu
kapsamları ve SQL doğrulama sözdizimi sorunları giderilip ilgili kontroller tekrar
çalıştırıldı. Başarısız ilk denemeler başarılıymış gibi raporlanmaz; tablo son
çalıştırmanın sonucudur.

## Değişiklik grupları

- Tasarım: `src/app/globals.css`, layout, ThemeProvider, ThemeToggle,
  WorkspaceShell, Drawer, Inter ve next-themes bağımlılıkları.
- Inbox: `src/features/inbox/*`, `src/app/(workspace)/inbox`, properties ve
  analytics rotaları. CRM müşteri detayından ilgili Inbox konuşmasına bağlantı.
- Veriler: `src/lib/inbox-domain.ts`, `inbox.ts`, mevcut domain/provider
  genişlemesi; demo sürümleme ve veri koruma.
- Backend: `202611120002_communication_workspace.sql`, workspace API genişlemesi,
  Copilot API, kaynak kontrolü ve korunmuş auth callback/giriş yönlendirmesi.
- Doğrulama: yeni Inbox/Copilot/communication testleri, eski testlerin yeni tema
  ve navigasyona uyarlanması; README, deployment ve tasarım belgeleri.

## Gerçek servis sınırı

Bu ortamda Supabase/OpenAI anahtarları ve gerçek mesaj kanalı bağlantısı yoktur.
Gerçek Supabase Cloud Auth/PostgREST/RLS, SMTP, OpenAI model kalitesi ve Vercel
çalıştırılmadı. SQL testleri PGlite PostgreSQL motorunda `auth.users`/`auth.uid()`
fixture'larıyla yapılır; Cloud hizmetinin doğrulandığı anlamına gelmez.
OpenAI HTTP testleri mock kullanır; ücret oluşturmaz.

Canlı veri için ikinci migration ayrıca uygulanmalıdır; demo migration veya
anahtar gerektirmez. WhatsApp/SMS/müşteri e-postası teslimatı entegrasyonu yoktur.
Geliştirme çıktısı test edilmiş yerel MVP'dir; tüm servisleri bağlanmış ve
üretimde yük testinden geçirilmiş küresel SaaS olarak sunulmaz.

MVP liste ve bağlam sınırları [Inbox belgesinde](inbox-redesign.md) ve gerçek
servis bağlantısı adımları [yayın rehberinde](deployment.md) açıklanır.
İlk MVP'nin 37 birim/entegrasyon ve 8 tarayıcı testi bu genişlemede korunup
58 ve 27 testlik kapsama dahil edilmiştir.
