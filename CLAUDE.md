# Tur Rehberi (çalışma adı)

Bu dosya her oturumda okunan proje talimatıdır. Kısa tutulur; ayrıntı aşağıdaki üç belgededir.

## Proje

Yapay zeka ile üretilmiş gezi planını numaralı duraklı rota haritasında gösteren ve durağa yaklaşınca anlatımı sesli okuyan bir web uygulaması. Safari'de bir bağlantıdan açılır.

Kapsam (karar, 11.11.2026): kişisel kullanım; Apple cihazlar (iPhone öncelikli, iPad ve Mac aynı bağlantıyla); mağaza ve kurulum yok; ücretli servis, üyelik ve API anahtarı yok.

Bu kararın bedeli: ekran kilitliyken veya Safari arka plandayken konum ve ses çalışmaz. Tur modu ekran açıkken çalışır ve ekranı açık tutar. Cepte çalışan tur modu kapsam dışıdır; bunu vaat eden arayüz metni veya kod yazılmaz.

Örnek alınan düzen sesli yürüyüş turu uygulamalarıdır (Piri Guide gibi): numaralı duraklar, aralarında rota, konuma göre başlayan anlatım, çevrimdışı kullanım. Fark şudur: turlar önceden kaydedilmiş değildir; her gezi `uzman-tur-rehberi` kurallarıyla (yazılı hali `REHBER-PROMPTU.md`) o gezi için araştırılıp üretilir.

Piri'nin adı, logosu, metinleri, ses kayıtları ve ekran tasarımı kopyalanmaz.

## Belgeler

| Dosya | İçerik | Ne zaman okunur |
|---|---|---|
| `URUN-TANIMI.md` | Ekranlar, veri modeli, mimari, riskler | Her yeni özellikten önce |
| `REHBER-PROMPTU.md` | Plan kurallarının yazılı hali | Kural denetimine ve plan mantığına dokunmadan önce |
| `ADIMLAR.md` | İş emri: özerk çalışma kuralları, aşamalar, teslim | Her aşamanın başında |
| `plan.schema.json` | Plan dosyasının sözleşmesi; değiştirilmez | Plan modeline dokunmadan önce |

İş sırasında iki dosya üretilir: `ILERLEME.md` (hangi aşama bitti, sırada ne var) ve `TESLIM.md` (kullanıcıya teslim notu).

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

1. Ücretli servis, API anahtarı veya üyelik isteyen hiçbir bağımlılık eklenmez. Böyle bir ihtiyaç doğarsa dur ve sor.
2. Depo ve site herkese açık olabilir: depoya kişisel veri, gerçek gezi planı ve gizli bilgi konmaz. Planlar yalnızca cihazda durur.
3. Koordinat uydurulmaz. Koordinatı olmayan yer haritaya konmaz, adresiyle listelenir.
4. Kaynağı ve doğrulama tarihi olmayan mekan uyarı işaretiyle gösterilir; doğrulanmış gibi sunulmaz.
5. Durak numarasının tek kaynağı `Stop.order` alanıdır. Akış, anlatım ve harita numarayı buradan alır. Sıra değişince numaralar, etap süreleri ve rota bağlantıları birlikte güncellenir.
6. Saatler esnektir. Yalnızca `fixed: true` olan satırlar SABİT rozeti taşır.
7. Örnek veri "ÖRNEK" etiketi taşır; gerçek mekan gibi sunulmaz.
8. Konum izni yalnızca tur modu başlatılırken istenir.
9. Arayüz Türkçedir; ekrandaki tüm metinler tek bir çeviri dosyasında tutulur. Kod, değişken adları ve commit mesajları İngilizce olabilir.
10. Sayı ve tarih biçimi Türkçedir: 1.234,50 TL, 14.05.2027, %20.

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
| Simgeleri yeniden üret | `npm run icons` |
| Yayımla | `git push` (main dalı; GitHub Actions derler, test eder ve Pages'e koyar) |

Notlar:
- Tarayıcı panelinde harita, sekme arka plandayken çizilmez (requestAnimationFrame durur); haritayı denetlerken sekmeyi öne al.
- Geliştirme sunucusunda service worker yoktur; çevrimdışı davranış yalnız üretim derlemesinde (`preview`) sınanır.
- `npm run e2e`, 4173 portunda çalışan eski bir `preview` sunucusunu yeniden kullanır; kod değiştiyse önce onu durdur.
