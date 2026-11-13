# Tur Rehberi (çalışma adı)

Bu dosya her oturumda okunan proje talimatıdır. Kısa tutulur; ayrıntı aşağıdaki üç belgededir.

## Proje

Yapay zeka ile üretilmiş gezi planını numaralı duraklı rota haritasında gösteren ve durağa yaklaşınca anlatımı sesli okuyan bir web uygulaması. Safari'de bir bağlantıdan açılır.

Kapsam (karar, 11.11.2026): kişisel kullanım; Apple cihazlar (iPhone öncelikli, iPad ve Mac aynı bağlantıyla); mağaza ve kurulum yok; ücretli servis ve üyelik yok. Geliştirme 2'den beri isteğe bağlı, ücretsiz ve kullanıcının kendi cihazında girdiği anahtar serbesttir (değişmez kural 1).

Bu kararın bedeli: ekran kilitliyken veya Safari arka plandayken konum ve ses çalışmaz. Tur modu ekran açıkken çalışır ve ekranı açık tutar. Cepte çalışan tur modu kapsam dışıdır; bunu vaat eden arayüz metni veya kod yazılmaz.

Örnek alınan düzen sesli yürüyüş turu uygulamalarıdır (Piri Guide gibi): numaralı duraklar, aralarında rota, konuma göre başlayan anlatım, çevrimdışı kullanım. Fark şudur: turlar önceden kaydedilmiş değildir; her gezi `uzman-tur-rehberi` kurallarıyla (yazılı hali `REHBER-PROMPTU.md`) o gezi için araştırılıp üretilir.

Piri'nin adı, logosu, metinleri, ses kayıtları ve ekran tasarımı kopyalanmaz.

## Belgeler

| Dosya | İçerik | Ne zaman okunur |
|---|---|---|
| `URUN-TANIMI.md` | Ekranlar, veri modeli, mimari, riskler | Her yeni özellikten önce |
| `REHBER-PROMPTU.md` | Plan kurallarının yazılı hali | Kural denetimine ve plan mantığına dokunmadan önce |
| `ADIMLAR.md` | İş emri: özerk çalışma kuralları, aşamalar, teslim | Her aşamanın başında |
| `GELISTIRME-2.md` | İkinci tur iş emri (profesyonel sürüm, Aşama A–G) | Geliştirme 2 işlerinde |
| `GELISTIRME-3.md` | Üçüncü tur iş emri (rehber anlatımı, bölüm videosu, tam çevrimdışı; Aşama A–E) | Geliştirme 3 işlerinde |
| `GELISTIRME-4.md` | Dördüncü tur iş emri (plan kutusu, ipuçları, etkinlikler, keşfet ve rotama ekle; Aşama A–F) | Geliştirme 4 işlerinde |
| `KUTU.md` | Plan üreticisinin plan kutusuna gezi koyma adımları | Plan kutusuna dokunmadan önce |
| `plan.schema.json` | Plan dosyasının sözleşmesi (sürüm 4; sürüm 1, 2 ve 3 dosyaları da geçerli); değiştirilmez | Plan modeline dokunmadan önce |

İş sırasında üretilen dosyalar: `ILERLEME.md` (hangi aşama bitti, sırada ne var), `TESLIM.md` (ilk sürüm teslim notu) ve `TESLIM-2.md` (Geliştirme 2 teslim notu), `TESLIM-3.md` (Geliştirme 3 teslim notu), `TESLIM-4.md` (Geliştirme 4 teslim notu).

## Ortam

- Geliştirme bilgisayarı Windows (x64). Geliştirme bilgisayardaki tarayıcıda yapılır; konum, tarayıcının geliştirici araçlarıyla ve uygulamadaki simülasyon ayarıyla taklit edilir.
- iPhone'da deneme yalnızca yayımlanmış HTTPS adresinden yapılır. Konum izni güvenli bağlantı ister; yerel ağ adresi iPhone'da bu yüzden kullanılmaz.
- Windows'tan iPhone Safari'sine hata ayıklayıcı bağlanamaz. Geliştirici ayarlarında hataları ekranda gösteren bir günlük paneli bulunur.
- Proje yolu kısa olmalı, boşluk ve Türkçe karakter içermemeli (örnek: `C:\Projeler\tur-rehberi`). OneDrive ile eşitlenen klasör kullanılmaz.

## Teknoloji kararları

- **Uygulama:** Vite + React + TypeScript. Sunucusuz, statik, tek sayfalı web uygulaması.
- **Plan modeli:** Kökteki `plan.schema.json` tek şema kaynağıdır. Tipler, doğrulayıcı ve kural denetimi `src/plan/` altında durur.
- **Harita:** MapLibre GL JS ve ücretsiz, anahtarsız, OpenStreetMap tabanlı bir altlık (aday: OpenFreeMap). Altlık adresi tek bir ayar dosyasında durur; servis değişirse tek satırla değiştirilir.
- **Konum, ses, ekran:** Tarayıcının kendi API'leri: konum, sesli okuma (cihazdaki Türkçe ses), ekranı açık tutma.
- **Yerel kayıt:** Tarayıcının yerel veritabanı (IndexedDB).
- **Çevrimdışı:** Service worker ile uygulama kabuğu önbelleğe alınır; web manifest ile Ana Ekrana eklenebilir.
- **Yayın:** Ücretsiz statik barındırma (aday: GitHub Pages). Her gönderimde site kendiliğinden yayımlanır.
- **Testler:** Birim testleri ve iPhone ekran boyutunda, Chromium ile WebKit'te çalışan uçtan uca testler. Konum taklit edilir; sesli okuma testte taklit edilir.
- **Depo:** GitHub'da herkese açık `tur-rehberi`.
- **Plan kaynağı:** Yalnızca içe aktarma. Plan Claude'da `uzman-tur-rehberi` skill'iyle üretilir, şemaya uygun `.json` dosyası olarak gelir; uygulama doğrulayıp kaydeder.

Kütüphane sürümlerini, tarayıcı desteğini ve servis koşullarını ezberden yazma; kurmadan önce resmi belgeden teyit et ve seçimini gerekçesiyle söyle.

## Safari kuralları

1. **Ses kilidi.** iOS'ta sesli okuma yalnızca kullanıcı dokunuşuyla başlar. "Turu başlat" dokunuşunda ses bir kez başlatılarak kilit açılır. Otomatik anlatım yine de başlamazsa ekranda büyük bir "Dinle" düğmesi çıkar. Gerçek iPhone'da doğrulanmadan çalışıyor sayılmaz.
2. **Ekranı açık tutma.** Tur modu açılınca istenir; sayfa yeniden görünür olunca yeniden istenir. Tur bitince bırakılır.
3. **Arka plan yok.** Sayfa gizlenince tur duraklar. Geri dönülünce konum hemen yeniden değerlendirilir ve geçilen durak bildirilir.
4. **Depolama silinebilir.** Kalıcı depolama istenir, ama verinin silinebileceği varsayılır. Planı dosyadan yeniden içe aktarmak her zaman mümkün ve hızlı olmalıdır.
5. **Dokunmatik düzen.** Tek sütun, çentik ve alt çubuk için güvenli alan boşlukları, parmakla rahat basılan düğmeler.

## Değişmez kurallar

1. Ücretli servis ve ücretli üyelik isteyen hiçbir bağımlılık eklenmez. Anahtar yalnız şu koşullarla serbesttir (Geliştirme 2):
   - Ücretsizdir ve kullanıcı kendi cihazında Ayarlar'a girer.
   - Anahtar depoya, derlemeye, yedek ve paylaşım dosyasına, önbelleğe ve hata günlüğüne girmez; yalnızca o cihazda saklanır.
   - Anahtar yokken uygulamanın her özelliği çalışır; anahtarlı özelliğin yerine sade bir yedek gösterilir.
2. Depo ve site herkese açık olabilir: depoya kişisel veri ve gizli bilgi konmaz. Gerçek gezi planı depoya yalnızca şifreli kutu dosyası olarak girer (`kutu/`, Geliştirme 4). Açık metin plan, cihazın özel anahtarı ve kişisel veri depoya girmez.
3. Koordinat uydurulmaz. Koordinatı olmayan yer haritaya konmaz, adresiyle listelenir.
4. Kaynağı ve doğrulama tarihi olmayan mekan uyarı işaretiyle gösterilir; doğrulanmış gibi sunulmaz.
5. Durak numarasının tek kaynağı `Stop.order` alanıdır. Akış, anlatım ve harita numarayı buradan alır. Sıra değişince numaralar, etap süreleri ve rota bağlantıları birlikte güncellenir.
6. Saatler esnektir. Yalnızca `fixed: true` olan satırlar SABİT rozeti taşır.
7. Örnek veri "ÖRNEK" etiketi taşır; gerçek mekan gibi sunulmaz.
8. Konum izni yalnızca kullanıcı konum isteyen bir düğmeye dokununca istenir: tur modunu başlatma, Keşfet'te "Yakınıma göre sırala", "Yakınımda" (Geliştirme 4).
9. Arayüz Türkçedir; ekrandaki tüm metinler tek bir çeviri dosyasında tutulur. Kod, değişken adları ve commit mesajları İngilizce olabilir.
10. Sayı ve tarih biçimi Türkçedir: 1.234,50 TL, 14.05.2027, %20.
11. Uygulama bilgi uydurmaz. Yol tarifi, bilet ve ücret bilgisi, Michelin derecesi, etkinlik ve rezervasyon bağlantısı için uygulama yalnızca planla geleni gösterir; bunları kendisi üretmez ve tahmin etmez. Canlı yön için kullanıcı Haritalar'a devredilir.
12. YouTube içeriği yalnızca YouTube'un kendi oynatıcısıyla gösterilir. Video cihaza indirilmez, kesilip saklanmaz, başka yerde yayımlanmaz (Geliştirme 3).
13. Gerçek bir kişinin sesi taklit edilmez. Uygulama yalnızca cihazın hazır seslerini kullanır.
14. Harita verisi yalnızca sağlayıcısının koşullarının izin verdiği yoldan indirilir. Çevrimdışı harita bölge dosyaları depodaki iş akışında açık lisanslı arşivden çıkarılır ve siteyle yayımlanır (`haritalar/bolgeler.json`).
15. Ücretli servis yasağı ve anahtar kuralı (kural 1) sürer.
16. Başka uygulamaların adı, logosu, metni, puanı, yorumu ve tasarımı kopyalanmaz. Bu kural bütün gezi ve yer keşif uygulamaları için geçerlidir (Geliştirme 4).
17. Uygulama ipucu, etkinlik ve yer bilgisi uydurmaz; planla geleni ya da kaynağı açıkça belirtilen açık içeriği (ör. Vikipedi, kaynak ve lisansıyla) gösterir.

## Çalışma biçimi

Bu proje özerk yürür: kullanıcı tek bir komut verir ve sonucu teslim notundan okur. Kurallar `ADIMLAR.md` dosyasının başındadır; özeti:

- Soru sorma, onay bekleme. Bu dosyadaki varsayılanları uygula; varsayılan yoksa en basit ve ücretsiz seçeneği seç ve kararı teslim notuna yaz.
- Durmana izin veren tek an en baştaki GitHub oturumudur.
- Her aşamanın sonunda tip kontrolü ve testler geçer, commit atılır, `ILERLEME.md` güncellenir.
- Bir şey çalışmıyorsa tahminle ilerleme; hata metnini oku, nedenini bul, sonra düzelt.
- Doğrulanmamış şeyi çalışıyor diye yazma. Gerçek iPhone gerektiren doğrulamalar teslim notunda kullanıcıya bırakılır.
- Kullanıcıya yazılan her metin (teslim notu, son mesaj, ekran metinleri) Türkçe ve sadedir; web geliştirme bilgisi varsaymaz.

## Komutlar

Node.js ve gh bu makinede taşınabilir kuruludur: `%LOCALAPPDATA%\Programs\devtools\` (kullanıcı PATH'ine eklendi; yeni açılan terminalde geçerli). Komutlar proje kökünde (`C:\Projeler\tur-rehberi`) çalıştırılır.

| İş | Komut |
|---|---|
| Bağımlılıkları kur | `npm ci` |
| Bilgisayarda başlat (geliştirme) | `npm run dev` → http://localhost:5173/tur-rehberi/ |
| Üretim derlemesini dene | `npm run build` ve `npm run preview` → http://localhost:4173/tur-rehberi/ |
| Tip kontrolü | `npm run typecheck` |
| Birim testleri | `npm test` |
| Uçtan uca testler (iPhone boyutu, Chromium ve WebKit) | `npm run e2e` (ilk kez: `npx playwright install chromium webkit`) |
| Yayımlanmış adrese duman testi | PowerShell: `$env:TUR_LIVE_URL='https://<kullanıcı>.github.io/tur-rehberi/'; npm run e2e:live` |
| Örnek geziyi yeniden üret | `node scripts/make-sample.mjs` |
| Simgeleri ve açılış ekranlarını yeniden üret | `npm run icons` |
| Çevrimdışı harita bölgelerini üret (iş akışı yapar; elle denemek için) | `node scripts/make-regions.mjs dist` (girdi `haritalar/bolgeler.json`) |
| Tek bölge çıkar (test verisi) | `node scripts/make-regions.mjs --bbox=batı,güney,doğu,kuzey --out=dosya.pmtiles --minzoom=12 --maxzoom=15` |
| Harita yazı tiplerini ve simgelerini yenile | `node scripts/fetch-map-assets.mjs` (çıktı `public/haritalar/`, depoya girer) |
| Yayımla | `git push` (main dalı; GitHub Actions derler, test eder ve Pages'e koyar) |

Notlar:
- Tarayıcı panelinde harita, sekme arka plandayken çizilmez (requestAnimationFrame durur); haritayı denetlerken sekmeyi öne al.
- Geliştirme sunucusunda service worker yoktur; çevrimdışı davranış yalnız üretim derlemesinde (`preview`) sınanır.
- `npm run e2e`, 4173 portunda çalışan eski bir `preview` sunucusunu yeniden kullanır; kod değiştiyse önce onu durdur.
- Uçtan uca testler dış servisleri (harita, Vikipedi/Commons, Open-Meteo, YouTube) kapatır; gereken test kendi sahte yanıtını verir (`e2e/helpers.ts`).
- Tasarım değerleri (renk, yazı, boşluk) yalnız `src/theme.css` içindedir; koyu tema da oradadır.
- Test sunucusu derlenmiş siteye küçük bir örnek bölge koyar (`scripts/e2e-region.mjs`, gerçek OpenStreetMap verisinden `e2e/fixtures/ornek-bolge.pmtiles`). WebKit'te service worker'ın yaptığı istekler `context.route` ile yakalanamaz; çevrimdışı testler bu yüzden gerçek dosya kullanır.
- Bash'te sed/heredoc ile Türkçe karakterli metin değiştirmek bazen eşleşmez; Türkçe içerikli düzenlemeyi düzenleme aracıyla ya da dosyaya yazılmış Node betiğiyle yap.
