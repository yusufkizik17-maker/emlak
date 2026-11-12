# Inbox merkezli premium çalışma alanı

## Ürün akışı

Giriş ve doğrulama sonrasında `/inbox` açılır. `/dashboard` ikincil ekran olarak
korunur. Eski `/leads`, `/leads/[id]`, `/tasks`, `/settings` ve `/ai-assistant`
rotaları ve işlevleri korunmuştur. Yeni navigasyon: Inbox, Dashboard, Customers,
Properties, Tasks, Analytics, Settings.

Inbox konuşma araması, okunmamış/yanıt bekleyen/atanmış filtreleri, son mesaj
önizlemesi, danışman atama, mesaj geçmişi ve insan onaylı yanıt düzenleyicisini
birleştirir. Müşteri ekleme ve düzenleme drawer içinde yapılır. Copilot'tan
taslak düzenleyiciye geçilebilir ve takip görevi açılabilir. Taslak, kullanıcı
inceleme kutusunu işaretleyip onaylamadan kaydedilemez. Onay sonrası durum
**Onaylandı · Gönderilmedi** olur; gerçek kanal bağlantısı yoktur.

## Responsive davranış

- Desktop: 1.280 px ve üzeri, navigasyon + üç çalışma sütunu; Copilot kapanabilir.
- Tablet: 768–1.279 px, konuşma listesi ve sohbet; Copilot focus-trap drawer.
- Mobil: önce konuşma listesi, seçim sonrası sohbet, geri düğmesi ve Copilot drawer.
- Daraltılmış sidebar tercihi saklanır. Konuşma listesinde ok tuşları/Enter ve
  arama için `/` kısayolu; tüm kontroller Tab ile kullanılabilir.
- Drawer Escape ile kapanır, odak açan kontrole geri döner; arka plan etkileşimi
  Radix Dialog tarafından kısıtlanır. Reduced-motion tercihi dikkate alınır.

## Tasarım sistemi

Inter Variable npm paketinden self-host edilir; Google Fonts isteği yapılmaz.
CSS semantic tokenları surface, elevated/secondary, foreground, muted, border,
primary, success, warning, incoming, outgoing ve overlay renklerini tanımlar.
Marka vurgusu sınırlıdır; navigasyon nötr yüzeylerde çalışır. Mevcut CRM bileşenleri
de aynı tokenlarla ve daha kompakt köşe/boşluk değerleriyle uyarlanmıştır.

next-themes Light/Dark/System, `leadpilot.theme` anahtarıyla tercihi saklar.
System tercihi OS renk değişimini takip eder; ilk HTML boyamasından önce tema
sınıfı uygulanır. Kontrolün SSR snapshot'ı sabittir ve root hydration uyarısı bastırılır.
Tema değişimi sırasında geçişler kapatılır. Testler hydration/runtime hatalarını
ve viewport dışına yatay taşmayı kontrol eder.

## Demo ve gerçek AI sınırı

Inbox demo analizi bir LLM değildir: yerel, sınırlı bir Türkçe kural çıkarıcısıdır.
Tüm gelen mesajları değerlendirir; sonraki mesajlardaki açık alanlar önceki
tercihleri günceller. Bilinen bütçe/konum/oda/tip yeniden sorulmaz; tanınmayan
alanlar null kalır. Her doğal dil ifadesini anlayabildiği iddia edilmez.
Eski AI Asistan ekranının sabit örnek davranışı da korunmuştur.

Gerçek modda `/api/copilot`, oturum ve işletme üyeliği kontrolünden sonra gelen
konuşmaları sunucuda analiz eder. 8.000 karakter/100 mesaj sınırı aşılırsa geçmiş
sessizce kırpılmaz: işlem açık hatayla reddedilir. JSON çıktısı Zod ve PostgreSQL
şekil kontrolüyle doğrulanır. Bütçe/konum/oda bilgileri kaynak metne göre kontrol
edilir; kaynaksız sayısal iddialar ve URL'ler reddedilir. Model ilan listesi
üretemez. Eşleşmeler yalnızca kayıtlı, aktif ve bilinen tüm kriterleri karşılayan
`properties` satırlarından hesaplanır. İlanın güncel uygunluğu danışman tarafından
ayrıca doğrulanmalıdır.

Copilot mevcut atomik AI rezervasyonunu paylaşır: 20/gün, 100/ay/işletme,
25 saniye timeout, otomatik retry yok. Copilot maksimum 1.600 çıktı token'ı;
eski mesaj analizi maksimum 1.200 token kullanır. Gerçek OpenAI çağrısı bu
geliştirmede yapılmadı. İnsan kontrolü doğal dildeki tüm model hatalarını
ortadan kaldırdığı iddiasıyla sunulmaz; gönderim kanalı bulunmaz.

## Veriler ve migration

`202611120002_communication_workspace.sql` ek migration'dır. İlk migration ve
mevcut veriler değiştirilmez. Şunları ekler:

- `conversations`: tenant-qualified lead ilişkisi, üyelik üzerinden assignee,
  unread/awaiting-reply durumu ve Copilot analizi.
- `properties`: tenant'a ait kayıtlı portföy; aktif/pasif durumu.
- `lead_messages`: konuşma ilişkisi, inbound/outbound yönü, received/approved
  durumları. Eski içerikler yerinde kalır ve yeni konuşmalarla eşleştirilir.

Yeni lead için konuşma trigger ile açılır. Assignee aynı işletmenin üyesi
olmalıdır. Onay RPC'si request kimliğiyle idempotent'tir; aynı isteğin tekrarı
ikinci mesaj oluşturmaz. OpenAI analizi kaydedilirken son gelen mesajın sürümü
kontrol edilir; çağrı sırasında konuşma değiştiyse eski analiz uygulanmaz.
Tenant isolation ve column grants devam eder; doğrudan teslim edilmiş mesaj
oluşturma veya başka tenant'a atama yolu yoktur.

Eski `leadpilot.demo.v2` sessionStorage kaydı Zod varsayılanları ve inbox_version
ile genişletilir. Leads, görevler, notlar ve eski öneriler korunur; yalnızca yeni
demo konuşma/ilan alanları eklenir. Kullanıcı sıfırla düğmesine basmadıkça demo
CRM verileri baştan kurulmaz. Gerçek verilerde demo seed çalıştırılmaz.

## Metrikler ve sınırlar

Dashboard gelen mesaj, yanıt bekleyen konuşma, AI taslağı, yeni lead ve takip
müşterisi sayılarını gösterir. Canlı mod sayıları DB exact count üzerinden alır;
örnek metrikler gerçek performans gibi sunulmaz. Gün sınırı Europe/Istanbul'dur.
Analytics görüntülenen kayıtlar üzerinden özet üretir; kanalsızken teslimat veya
ortalama yanıt süresi uydurulmaz.

MVP'de listeler en fazla 1.000 lead/conversation/property ve son 1.000 mesajla
sınırlıdır; legacy öneriler son 100 kayıttır. Çok büyük tenantlarda konuşma bazlı
sayfalama ve history pagination ayrıca geliştirilmelidir. Bu sınır veritabanındaki
kayıtları silmez. JSON export sayfalı çalışır. Cloud Supabase/PostgREST/Auth ve
OpenAI bağlantıları gerçek servis ayarlarıyla ayrıca doğrulanmalıdır.
