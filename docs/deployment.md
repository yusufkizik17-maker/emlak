# Servis bağlantısı ve yayın rehberi

Bu rehber yürütülmüş bir dağıtım değildir. Ücretli servis kullanılmadı, hesap
satın alınmadı ve canlı ortama yayın yapılmadı. Aşağıdaki servis işlemleri kurucu
kontrolünde yapılmalıdır. Gerçek anahtarları sohbete veya Git'e yazmayın.

## Supabase Cloud

1. Kurucunun seçtiği Supabase projesini kullanın. Proje URL'sini ve publishable
   anahtarını `.env.local` veya dağıtımın güvenli ortam ayarlarına ekleyin.
   `service_role` anahtarı bu uygulama için gerekmez ve kullanılmamalıdır.
2. Boş bir geliştirme veritabanında önce
   `supabase/migrations/202611120001_initial.sql` migration'ını çalıştırın.
   SQL Editor veya kendi yetkinizle kurduğunuz Supabase CLI kullanılabilir.
   Migration tek transaction'dır; var olan üretim tablolarının üzerine çalıştırmayın.
3. Auth > URL Configuration: gerçek `APP_URL` için Site URL ve
   `APP_URL/auth/callback`, `APP_URL/auth/callback?next=reset` redirect adreslerini
   tanımlayın. Yerel geliştirmede uygulama origin'i `http://localhost:3000` olur.
4. E-posta doğrulamasını açık bırakın. İstenirse PKCE redirect akışı kullanılabilir;
   callback `code` parametresini sunucuda oturuma çevirir. E-posta template'lerinde
   SSR token-hash yöntemi tercih edilirse doğrulama bağlantısı:
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.
   Recovery template'i:
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=reset`.
   Token-hash yöntemi başka cihazdan açılan bağlantıyı da destekler.
5. Auth parola minimumunu 12 karakter yapın, Supabase Auth rate limitlerini
   etkin tutun. Üretimde SMTP sağlayıcısı ve e-posta teslimatını doğrulayın;
   Supabase'in varsayılan posta servisi genel kullanıma uygun olmayabilir.
   Kayıt abuse koruması/sağlayıcı rate limitleri uygulamadan bağımsız kontrol edilir.
6. `APP_MODE=live`, `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL` ve
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini ekleyin. Uygulama origin'i
   doğru değilse mutasyonlar CSRF kontrolünde reddedilir. Supabase URL'si HTTPS
   olmalıdır. Yerel Supabase HTTP kurulumu bu sürümde desteklenmez.
7. İki ayrı test kullanıcısıyla kayıt ve e-posta doğrulamasını tamamlayın.
   İlk giriş, `ensure_workspace()` ile tek işletme ve owner üyeliği oluşturur.
   Ayrı kullanıcıların kendi kayıtlarını görüp diğer tenant kimlikleriyle
   okuma/yazma yapamadığını gerçek Supabase üzerinde ayrıca doğrulayın.
8. Ayarlar'da ikinci işletme oluşturun/değiştirin. Ekip ekleme işlemi yalnızca
   önceden kayıt olmuş bir kullanıcıyı e-posta ile ekler; davet e-postası göndermez.
   Owner korumalıdır; admin başka bir admin'i yükseltemez/kaldıramaz.

Migration yeni kullanıcılar için `auth.users` trigger'ı ile profil açar.
**Migration öncesi var olan Auth kullanıcıları** migration tarafından backfill edilir.
İleride yönetici onarımına ihtiyaç olursa aynı idempotent SQL kullanılabilir:

```sql
insert into public.profiles(id, full_name)
select id, left(coalesce(raw_user_meta_data->>'full_name',''),120)
from auth.users
on conflict (id) do nothing;
```

## OpenAI (yalnızca kurucu izin verdikten sonra)

1. `OPENAI_API_KEY` değerini sadece sunucu ortamına ekleyin.
   `OPENAI_MODEL=gpt-4.1-mini` veya `gpt-4.1-nano` desteklenir. Yeni bir model
   eklemek ayrı değerlendirme ve test gerektirir; istemci model seçemez.
2. OpenAI proje bütçesi ve uyarılarını ayrıca yapılandırın. Uygulama 4.000 karakter
   girdi, 1.200 maksimum çıktı token'ı ve her işletme için UTC günde 20, ayda 100
   rezervasyon sınırı uygular. Başarısız çağrılar da kota tüketir; otomatik retry yoktur.
   Eşzamanlı istekler PostgreSQL advisory lock ile aynı kotayı paylaşır.
   Kota kayıtları müşteri silindiğinde korunur; silme ile maliyet sınırı aşılamaz.
3. 25 saniye timeout ve `store:false` kullanılır. Basit e-posta/telefon maskeleme
   veri minimizasyonuna yardımcı olur; serbest metindeki tüm kişisel veriyi
   anonimleştirdiği iddia edilmez. Kuruluşun hukuki işleme dayanağı, aydınlatma
   metni ve sağlayıcı sözleşmesi kurucu tarafından tamamlanmalıdır.
4. Canlı AI çağrısını ancak ücretli kullanıma izin verildikten sonra kontrollü bir
   test mesajıyla doğrulayın. Bu geliştirmede gerçek OpenAI çağrısı yapılmadı.

## Vercel (kurucu dağıtım onayı sonrasında)

1. Depoyu kendi Git hesabınızdan Vercel'e bağlayın. Framework: Next.js;
   root directory proje kökü, install: `npm ci`, build: `npm run build`.
2. Node.js 24 seçin. `.env.example` alanlarını güvenli environment settings'e
   girin. Preview ve Production için ayrı Supabase geliştirme/üretim projeleri
   kullanın. Preview için sabit izinli origin seçin; istemci origin kontrolünü
   gevşetmek amacıyla wildcard eklemeyin.
3. Migration'ı seçilen veritabanına kontrollü uygulayın; uygulama build'i migration
   çalıştırmaz. `APP_URL` ve Supabase redirect adreslerini hedef origin ile eşleştirin.
4. Build, oturum, şifre sıfırlama, owner/member akışı ve iki-tenant testleri
   doğrulanmadan yayına hazır saymayın. Bu repoda Vercel'e otomatik publish eden
   komut, ödeme işlemi veya müşteri mesajı gönderen entegrasyon bulunmaz.

## Ağ, güvenlik ve işletim sınırları

- Canlı mod sunucudan `<project-ref>.supabase.co` ve `api.openai.com` adreslerine
  HTTPS erişimi gerektirir. Bulut ağ ayarlarında gerekli proje alanını ekleyin;
  mevcut izin listesini değiştirmeyin. Demo bu alanlara ihtiyaç duymaz.
- Kullanıcı CRUD istekleri Supabase publishable anahtarı + doğrulanmış oturumla
  çalışır; service role bypass yoktur. API her istekte `getUser`, üyelik ve rol
  kontrol eder. HttpOnly tenant çerezi tek başına yetki sağlamaz. RLS ikinci sınırdır.
- Auth endpoints Supabase Auth rate limitlerine tabidir. Uygulama API limitleri
  kullanıcı başına dakikada 120 read, 60 write, 5 AI'dır; DB arızasında kapalı hata
  verir. Sınırsız instance-local bellek sayacı kullanılmaz.
- CSP üretimde eval'i kapatır; Next.js bootstrap için inline script izni vardır.
  Daha sıkı nonce tabanlı CSP ileride ayrı bir iyileştirmedir. HTTPS yönlendirme ve
  HSTS hedef platformun domain ayarlarında doğrulanmalıdır.
- Liste ekranları MVP'de 1.000 lead/task ve son 100 AI önerisiyle sınırlandırılır;
  bu durum arayüzde belirtilir. Dashboard metrikleri tüm kayıtlar için DB count
  kullanır. Dışa aktarım sayfalı olarak tüm kayıtları okur; 50.000 kayıtta açık hata
  verir. Daha büyük tenantlar için sunucu taraflı sayfalama ve dışa aktarım işi gerekir.
- Saklama süresi kuruluş bazında 30–730 gündür. Owner, Ayarlar'dan süresi dolan
  verileri silebilir. Lead silme mesaj/görev/önerileri cascade ile temizler. Sahipsiz
  eski görevler ve mesajlar purge işleminde silinir. Audit 365 gün, kota kayıtları
  62 gün tutulur. Bu sürüm otomatik cron çalıştırmaz; periyodik işletim prosedürü
  veya denetlenmiş scheduler bağlantısı ayrıca gereklidir.
- Audit yalnızca aktör, kuruluş, işlem, kayıt kimliği ve zaman içerir; ham mesaj,
  e-posta, müşteri adı veya model çıktısı içermez. Platform HTTP erişim loglarında
  auth callback parametrelerini maskelerken hosting sağlayıcısının ayarlarını da
  kontrol edin. Uygulama ham istisnaları loglamaz.
- Veri sahibi silme talebinde lead silme ve ilgili export kullanılabilir. Auth hesap
  kapatma ve organization kapatma yönetici prosedürüdür; otomatik kullanıcı hesabı
  silme/owner transferi arayüzü bu MVP kapsamında değildir. Yedeklerdeki silme
  süreleri Supabase proje politikasına göre ayrıca yönetilmelidir.
- Şekil doğrulama, kaynak metne dayalı alan kontrolü ve sayı/URL kısıtları prompt
  injection riskini azaltır; LLM'nin tüm doğal dil iddialarının doğru olduğunu
  matematiksel olarak garanti etmez. İnsan onayı zorunludur ve gönderim kanalı yoktur.
