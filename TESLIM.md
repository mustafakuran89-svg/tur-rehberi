# Tur Rehberi — teslim notu

Tarih: 11.11.2026 · Sürüm 0.1.0

## 1. Bağlantı

**https://mustafakuran89-svg.github.io/tur-rehberi/**

Depo (herkese açık): https://github.com/mustafakuran89-svg/tur-rehberi — `main` dalına her gönderimde site kendiliğinden derlenir, test edilir ve yayımlanır.

iPhone'da: adresi **Safari**'de açın, **Paylaş › Ana Ekrana Ekle** deyin. Bundan sonra uygulamayı Ana Ekran'daki simgeden açın; tam ekran açılır ve verileriniz daha güvenli saklanır (bkz. bölüm 8).

Teslim klasörü: `C:\Projeler\tur-rehberi\teslim` (kopyası: `Masaüstü\Projeler\Tur Rehberi\teslim`)

- `tur-rehberi-site.zip` — derlenmiş site
- `ornek-plan.json` — örnek gezi; "Plan içe aktar"ı denemek için
- `plan.schema.json` — geçerli şema (değişmedi)

## 2. Yapılanlar

| Özellik | Doğrulama |
|---|---|
| Gezilerim, Gezi özeti, Gün, Durak, Yemek, İfadeler, Pratik bilgiler, Ayarlar ekranları | otomatik testle doğrulandı |
| Örnek gezi (2 gün, "ÖRNEK" etiketli, gerçek gezilerden ayrı bölümde) | otomatik testle doğrulandı |
| Gün haritası: numaralı duraklar, sırayla rota, yürüyüş (noktalı) ve araç (düz) çizgisi, etap süresi, K/O/A/S harfli mekan işaretleri, atıf yazısı | otomatik testle doğrulandı (altlık kapalıyken); altlıklı görünüm bilgisayardaki tarayıcıda gözle kontrol edildi |
| Altlık yüklenemezse duraklar ve rota boş zeminde | otomatik testle doğrulandı |
| Koordinatı olmayan yer haritaya konmaz, adresiyle listelenir; iğne elle konabilir | otomatik testle doğrulandı |
| Durak anlatımının Türkçe sesle okunması (oynat, duraklat, hız) | otomatik testte ses taklit edildi; **gerçek ses yalnızca gerçek iPhone'da doğrulanabilir** |
| İfadelere dokununca hedef dilde seslendirme | otomatik testte ses taklit edildi; **gerçek ses yalnızca gerçek iPhone'da doğrulanabilir** |
| Tur modu: yarıçap dışında başlamaz, içine girince bir kez başlar, aynı durakta tekrar başlamaz | otomatik testle doğrulandı (konum taklidiyle) |
| Tur modu: sayfa arka plana gidip dönünce sürer, konum yeniden değerlendirilir, geçilen durak bildirilir | otomatik testle doğrulandı |
| Otomatik anlatım başlamazsa büyük "Dinle" düğmesi | otomatik testle doğrulandı; **iOS ses kilidinin gerçek davranışı yalnızca gerçek iPhone'da doğrulanabilir** |
| Ekranın kapanmasını engelleme | **yalnızca gerçek iPhone'da doğrulanabilir** |
| Konum izni yalnız tur başlarken istenir | **yalnızca gerçek iPhone'da doğrulanabilir** |
| Konum simülasyonu ve örnek geziyi bulunduğunuz yere taşıma | otomatik testle doğrulandı |
| Plan içe aktarma: dosyadan ve yapıştırarak; Türkçe hata (hangi alan, neden) | otomatik testle doğrulandı |
| Kural denetimi (durak, kahvaltı, akşam, öğle, ifade, kaynak, kapalı gün, gün süresi, numara, bölge tutarlılığı) uyarı olarak | otomatik testle doğrulandı (her kural için geçen ve kalan örnek) |
| Etap süresi verilmemişse hesap (kuş uçuşu × 1,3; saatte 4,5 km), "yaklaşık" işareti | otomatik testle doğrulandı |
| Aynı kimlikli plan önce sorulup eskisinin yerine konur | otomatik testle doğrulandı |
| Planların cihazda saklanması, sayfa yenilenince durması | otomatik testle doğrulandı |
| İnternet yokken uygulamanın açılması, gezi ve anlatım | otomatik testle doğrulandı (Chromium ve WebKit); **uçak modunda iPhone'da ayrıca doğrulanmalı** |
| Ana Ekrana eklenince tam ekran, simge, ad, renk | **yalnızca gerçek iPhone'da doğrulanabilir** |
| Yeni sürüm yayımlanınca kendini güncelleme, kayıtlı gezilerin silinmemesi | yapılandırıldı; **yayından sonra gerçek cihazda doğrulanabilir** |
| Yedeği dışa aktarma, bütün verileri silme | elle denendi; otomatik test yok |
| Ayarlarda hata günlüğü (iPhone'da oluşan hataları ekranda gösterir) | otomatik testle doğrulandı (ekran açılıyor) |
| Her durak ve mekanda "Haritalarda aç" (Apple Haritalar) | bağlantı otomatik testle doğrulandı; **açılışı gerçek iPhone'da** |

Testler: 32 birim testi, 15 uçtan uca test × 2 tarayıcı (iPhone 13 ekran boyutu, Chromium ve WebKit) — hepsi geçti. Yayımlanmış adrese karşı duman testi (açılış, örnek gezi, gün haritası, durak, manifest, service worker) Chromium ve WebKit'te 4/4 geçti. GitHub'daki yayın iş akışı da her gönderimde tip kontrolü ve birim testlerini koşar.

## 3. iPhone kontrol listesi

**Sonuç (11.11.2026):** Altı maddenin altısı kullanıcı tarafından gerçek iPhone'da denendi ve sorunsuz çalıştı.

1. Bağlantı Safari'de açılıyor; Ana Ekrana eklenince tam ekran açılıyor.
2. Örnek gezide bir durağın anlatımı Türkçe sesle okunuyor.
3. Tur modunda konum izni soruluyor, konumunuz haritada görünüyor, ekran kendiliğinden kapanmıyor.
4. Ayarlardan örnek gezi bulunduğunuz yere taşınıp simülasyonla durağa yaklaşılınca anlatım kendiliğinden başlıyor ya da "Dinle" düğmesi çıkıyor.
5. Uçak modunda uygulama açılıyor; gezi ve sesli okuma çalışıyor.
6. `ornek-plan.json` dosyası "Plan içe aktar" ile açılabiliyor.

Madde 4 için: Ayarlar › Geliştirici ayarları › "Örnek geziyi bulunduğum yere taşı" (bir kez konum ister), sonra "Konum simülasyonu"nu açın. Örnek gezi › 1. gün › Turu başlat › Turu başlat; haritada 1 numaralı işarete dokunun. Bir sorun çıkarsa Ayarlar › Hata günlüğü'ne bakın.

## 4. Gerçek plan nasıl alınır

1. claude.ai'daki "Tur Programı" projesinde şunu yazın: "şu yer, şu tarihler için uygulama planı üret" (yer, tarih ve tercihlerinizi ekleyin).
2. Gelen `.json` dosyasını iPhone'da Dosyalar uygulamasına kaydedin.
3. Uygulamada Gezilerim › **Plan içe aktar** › Dosya seç ile açın. Uyarılar varsa ilgili ekranda görünür; plan yine de kullanılabilir.
4. Değişiklik gerekirse Claude'da yaptırıp aynı dosyayı yeniden içe aktarın; uygulama eskisinin yerine koymadan önce sorar.

## 5. Kararlar

- Proje yolu `C:\Projeler\tur-rehberi` (kısa, boşluksuz, Türkçe karaktersiz, OneDrive dışı).
- Node.js 26.13.0 (güncel LTS) ve gh 2.103.3, yönetici izni gerekmeyen taşınabilir sürüm olarak `%LOCALAPPDATA%\Programs\devtools` altına kuruldu; dosya özetleri (SHA-256) resmi listelerle karşılaştırıldı; kullanıcı PATH'ine eklendi.
- Sürümler kurulmadan önce npm kayıt defterinden alındı: Vite 8.3.8, React 19.3.1, TypeScript 7.0.2, MapLibre GL 6.17.0, Ajv 8.20.0, idb 8.0.4, vite-plugin-pwa 2.0.0, Vitest 5.1.0, Playwright 1.65.0.
- Şema doğrulaması Ajv ile kökteki `plan.schema.json` dosyasından yapılır; ayrı kopya yoktur.
- Harita altlığı OpenFreeMap "Liberty" (ücretsiz, anahtarsız, kayıtsız; atıf zorunlu, MapLibre gösterir). Adres tek dosyada: `src/map/config.ts`.
- WebGL yoksa veya harita kütüphanesi açılamazsa kendi basit SVG haritası çizilir (aynı numaralar, rota, dokunma).
- Yönlendirme adres çubuğundaki `#` ile; GitHub Pages alt yolu `/tur-rehberi/`.
- Araç ve toplu taşıma etabında süre verilmemişse, ürün tanımı yalnız yürüyüş hızı verdiği için şehir içi 25 km/sa (araç) ve 18 km/sa (toplu taşıma) varsayıldı; "yaklaşık" yazar.
- Kural denetiminde ilk ve son gün "hafif gün" sayılır (en az 2 ana durak); akıştan saat okunamazsa gün 12 saat kabul edilir; bölge tutarlılığında ortanca noktaya 40 km'den uzak ya da ortanca uzaklığın 4 katından (ve 3 km'den) uzak nokta işaretlenir.
- Tetikleme yarıçapı varsayılan 40 m; Ayarlar'dan 25/40/60/100 m. Otomatik anlatım 2,5 saniyede başlamazsa "Dinle" düğmesi çıkar.
- Tur ilerlemesi (hangi durak anlatıldı) cihazda saklanır; sayfa yenilense de aynı durak tekrar anlatılmaz. "Turu baştan al" ile sıfırlanır.
- "Örnek geziyi bulunduğum yere taşı" düğmesi, tur modu dışında konum isteyen tek yerdir; yalnız Geliştirici ayarlarında ve kullanıcı dokunduğunda çalışır.
- Örnek gezinin koordinatları gerçek mekan göstermez; bir merkez noktanın çevresine yapay yerleştirildi. Haritada altta gerçek sokaklar görünür ama işaretler "ÖRNEK" mekanlardır.
- Örnek gezinin ifade listesi İtalyanca (yaygın, doğrulanması kolay ifadeler); hedef dilde seslendirmeyi göstermek için.
- Kahvaltı/öğle/akşam işaretlerine dokunmak yemek ekranında ilgili karta götürür; tur haritasında işaretler bağlantı değildir (simülasyon dokunuşu için).
- İlk commit'ler `Tur Rehberi <tur-rehberi@localhost>`, sonrakiler GitHub'ın gizli (noreply) adresiyle atıldı; kişisel e-posta depoya yazılmadı. Depo herkese açık olmadan önce geçmiş kişisel veri için tarandı.
- GitHub Pages "GitHub Actions ile yayın" modunda açıldı (ücretsiz plan, herkese açık depo; resmi kaynak: docs.github.com, GitHub planları).
- GitHub girişinde birkaç cihaz kodunun süresi doldu; giriş dördüncü kodla tamamlandı.
- Ayarlar (`localStorage`) ve planlar (IndexedDB) ayrı tutulur; yedek dosyası yalnız gerçek gezileri içerir, örnek geziyi içermez.

## 6. Yapılamayanlar

- Gerçek iPhone gerektiren doğrulamalar (bölüm 2'de "yalnızca gerçek iPhone'da" yazanlar) bilgisayardan yapılamaz; bölüm 3'teki listeyle sizin denemeniz gerekir.

## 7. Şema değişiklikleri

Yok.

## 8. Depolama notu

Resmi kaynak (WebKit, 11.11.2026'da kontrol edildi):

- Safari, kullanıcının **yedi gün boyunca Safari'yi kullanıp siteyle hiç etkileşmemesi** halinde sitenin betikle yazılan bütün verisini (IndexedDB, yerel depolama, service worker önbelleği) silebilir. Kaynak: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- **Ana Ekrana eklenen web uygulamaları** bu sayaçtan ayrıdır; gün sayıları uygulamanın kendi kullanımına göre işler ve WebKit bu uygulamalarda birinci taraf verinin silinmesini beklemez. Aynı kaynak.
- Uygulama "kalıcı depolama" ister; WebKit bunu ölçütlere göre (örneğin Ana Ekrana eklenmiş olmak) verir, garanti değildir. Kaynak: https://webkit.org/blog/14403/updates-to-storage-policy/

Önlem: uygulamayı Ana Ekrana ekleyin, plan dosyalarını Dosyalar'da saklayın, ara sıra Ayarlar › "Yedeği dışa aktar" yapın. Veri silinse bile dosyadan yeniden içe aktarmak saniyeler sürer. Ayarlar ekranı kalıcı depolamanın verilip verilmediğini gösterir.

## 9. Sonraki adım önerileri

- Plan düzenleme: durak çıkarma, sıra değiştirme.
- Gezi günü görünümü: bugünün akışı, sıradaki SABİT saat, kalan duraklar.
- Pil dostu tur: koyu tema, konum sıklığını azaltma.
- Planın yazdırılabilir broşür olarak dışa aktarılması.
- Evde gezilen harita bölgesinin çevrimdışı kalması (OpenFreeMap toplu indirmede 3.000 karo / 50 MB sınırı koyar).
- İngilizce arayüz.
