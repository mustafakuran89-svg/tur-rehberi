# Adımlar — tek seferde, kendi başına

Bu dosya Claude Code'un baştan sona tek oturumda uygulayacağı iş emridir. Kullanıcı aşama aralarında onay vermez ve araya girmez; denemeyi en sonda, teslim notundaki kontrol listesiyle yapar.

Kapsam: kişisel kullanım, Apple cihazlar, Safari'de açılan web uygulaması. Mağaza, kurulum ve ücret yok.

## Özerk çalışma kuralları

1. **Sorma, bekleme.** Karar gereken yerde `CLAUDE.md` içindeki varsayılanı uygula. Varsayılan yoksa en basit ve ücretsiz seçeneği seç ve `TESLIM.md` dosyasının "Kararlar" bölümüne bir satır yaz.
2. **Tek etkileşim.** Durmana izin veren tek an, en baştaki GitHub oturumudur. Başka hiçbir noktada kullanıcıdan yanıt bekleme.
3. **Ücret yok.** Ücret, API anahtarı veya üyelik isteyen yolu seçme. Özellik başka türlü yapılamıyorsa atla ve "Yapılamayanlar" bölümüne nedenini yaz.
4. **Her aşamanın sonu.** Tip kontrolü ve testler geçer, commit atılır, `ILERLEME.md` güncellenir. Testi geçmeyen aşama geçilmiş sayılmaz. Üç denemede düzelmeyen parça en dar kapsamla çalışır halde bırakılır, eksiği "Yapılamayanlar" bölümüne yazılır ve işe devam edilir.
5. **Kesinti.** Oturum kesilir ve kullanıcı "devam et" derse `ILERLEME.md` dosyasından kalınan yer bulunur, baştan başlanmaz.
6. **Şema sözleşmedir.** `plan.schema.json` değiştirilmez. Değişiklik kaçınılmazsa yapılır ve "Şema değişiklikleri" bölümüne alan alan yazılır.
7. **Dürüst rapor.** Doğrulanmamış şey "çalışıyor" diye yazılmaz. Her özellik şu ikisinden biriyle işaretlenir: "otomatik testle doğrulandı" ya da "yalnızca gerçek iPhone'da doğrulanabilir".
8. **Resmi belge.** Kütüphane sürümleri, tarayıcı desteği ve servis koşulları ezberden yazılmaz; kurmadan önce resmi belgeden teyit edilir.

## Aşama 0 — Ortam, iskelet, yayın

1. Node.js, Git ve GitHub komut satırı aracını (gh) kontrol et; eksik olanı kur.
2. `gh auth status` ile GitHub oturumuna bak. Açık değilse `gh auth login` başlat; kullanıcı tarayıcıda onaylar. Bu tek etkileşimdir. Oturum açılamazsa yayını en sona bırak, geri kalan her şeyi tamamla.
3. Vite + React + TypeScript iskeletini depo kökünde kur. Yönlendirme adres çubuğundaki # işaretiyle yapılır; statik barındırmada alt yollar sorun çıkarmaz.
4. `.gitignore` yaz, `git init` yap, ilk commit'i at.
5. GitHub Pages'in ücretsiz plan koşulunu resmi belgeden teyit et. Herkese açık `tur-rehberi` deposunu oluştur, her gönderimde siteyi yayımlayan iş akışını kur, Vite `base` ayarını depo adına göre yap.
6. Geliştirici ayarlarına, cihazda oluşan hataları ekranda gösteren günlük panelini ekle.
7. `CLAUDE.md` içindeki "Komutlar" bölümünü doldur.

**Kendi doğrulaman:** Derleme geçiyor. Yayın adresi yanıt veriyor ve sayfada "Tur Rehberi" yazıyor.

## Aşama 1 — Plan modeli ve ekranlar

1. Kökteki `plan.schema.json` dosyasını uygulamanın tek şema kaynağı yap. `src/plan` altında şemayla birebir TypeScript tiplerini ve şema doğrulayıcısını yaz.
2. Şemadan geçen iki günlük bir örnek gezi hazırla. Mekan ve durak adları "ÖRNEK" etiketi taşır, gerçek mekan adı kullanılmaz. Her gün 4-6 durak, 3 kahvaltı, öğle için ana ve yedek, 3 akşam alternatifi; toplam 15-20 ifade.
3. Ekranları örnek veriyle çalışır hale getir: Gezilerim, Gezi özeti, Gün, Durak, Yemek, İfadeler, Pratik bilgiler, Ayarlar (`URUN-TANIMI.md` bölüm 4).
4. Ekrandaki tüm metinleri tek bir çeviri dosyasına al.
5. Görsel dil sade bir gezi broşürü gibi olsun: güçlü başlıklar, bol boşluk, tek sütun. Önce iPhone ekranı için tasarla; iPad ve Mac'te de düzgün görünsün. Kurumsal rapor görünümü olmasın. Piri'nin ekranlarına benzetme.

**Kendi doğrulaman:** Örnek veri şemadan geçiyor (birim testi). Uçtan uca test, iPhone ekran boyutunda Chromium ve WebKit'te Gezilerim → gezi → gün → durak yolunu ve yemek, ifadeler ekranlarını dolaşıyor.

## Aşama 2 — Harita ve tur modu

`URUN-TANIMI.md` bölüm 4'teki harita kurallarını, bölüm 7'yi ve `CLAUDE.md` içindeki Safari kurallarını uygula.

1. Harita kütüphanesinin ve ücretsiz altlığın (adaylar: MapLibre GL JS, OpenFreeMap) ücret, anahtar, kullanım koşulu ve atıf şartını resmi belgeden teyit et.
2. Gün ekranına haritayı ekle: numaralı durak işaretleri, sırayla rota çizgisi, yürüyüş ve araç etapları için farklı çizgi stili, K1-K3 ve A1-A3 harfli işaretler, atıf yazısı. Altlık yüklenemezse işaretler ve rota boş zemin üzerinde görünür.
3. Durak ekranına ses oynatıcıyı ekle: anlatımı cihazın Türkçe sesiyle oku; oynat, duraklat, hız. Cihazda Türkçe ses yoksa nasıl ekleneceğini ekranda söyle.
4. Tur modunu ekle. "Turu başlat" dokunuşunda konum izni istenir, ses kilidi açılır, ekran açık tutulur. Sıradaki durağa mesafe ve yön gösterilir. Yarıçapa girilince anlatım bir kez otomatik başlar; başlamazsa büyük bir "Dinle" düğmesi çıkar.
5. Sayfa arka plana gidip dönünce tur sürer: ekranı açık tutma yeniden istenir, konum hemen yeniden değerlendirilir.
6. Simülasyon ayarı ekle: haritaya dokunarak konum taklit edilir; örnek gezinin durakları kullanıcının bulunduğu yerin çevresine taşınabilir.
7. İfadeler ekranında ifadeye dokununca hedef dilde seslendir.
8. Her durak ve mekana Apple Haritalar'da yol tarifini açan "Haritalarda aç" bağlantısı koy.

**Kendi doğrulaman:** Uçtan uca test konum taklidiyle şunları gösteriyor: yarıçap dışında anlatım başlamıyor; içine girince bir kez başlıyor; aynı durakta ikinci kez başlamıyor; sayfa gizlenip dönünce tur sürüyor. Testte sesli okuma taklit edilir. Ağ kapalıyken işaretler ve rota görünüyor.

## Aşama 3 — İçe aktarma ve çevrimdışı kullanım

`URUN-TANIMI.md` bölüm 5, 6 ve 8'i uygula.

1. "Plan içe aktar": Dosyalar'dan `.json` seçme ve panodan yapıştırma.
2. Şema doğrulaması; hata Türkçe ve anlaşılır (hangi alan, neden).
3. `URUN-TANIMI.md` bölüm 6.2'deki kural denetimini `src/plan` altında yaz ve içe aktarmada çalıştır. Geçmeyen madde planı reddetmez; ilgili ekranda uyarı olarak görünür.
4. Koordinatı olmayan yer haritaya konmaz, listede adresiyle görünür. İğne elle düzeltilebilir.
5. Etap süresi verilmemişse hesapla: kuş uçuşu mesafe × 1,3, saatte 4,5 km yürüyüş hızı; "yaklaşık" diye işaretle.
6. Planı tarayıcının yerel veritabanına kaydet ve kalıcı depolama iste. "Yedeği dışa aktar" düğmesi ekle. Aynı `id` ile gelen plan eskisinin yerini alır; önce sorar.
7. Çevrimdışı açılış: uygulama internet yokken de açılır; anlatım ve sesli okuma çalışır.
8. Ana Ekrana eklenince tam ekran açılır: simge, ad, renk. Safari'nin site verisini hangi koşulda sildiğini resmi kaynaktan teyit et ve sonucu teslim notuna yaz.
9. Yeni sürüm yayımlanınca uygulama kendini günceller; kayıtlı geziler silinmez.
10. Örnek gezi "ÖRNEK" etiketiyle kalır ve gerçek gezilerden ayrı durur.

**Kendi doğrulaman:** Birim testleri: şema hatası Türkçe mesaj üretiyor; her kural için geçen ve kalan birer örnek var; etap süresi hesabı doğru. Uçtan uca test: dosyadan içe aktarılan gezi listede görünüyor, sayfa yenilenince duruyor, ağ kapalıyken uygulama açılıyor.

## Aşama 4 — Paketleme ve teslim

1. Üretim derlemesini al, yayımla, yayın adresinin yanıt verdiğini doğrula. Uçtan uca testlerin kısa bir alt kümesini yayımlanmış adrese karşı çalıştır.
2. `teslim` klasörünü hazırla:
   - `tur-rehberi-site.zip`: derlenmiş site
   - `ornek-plan.json`: örnek gezi; içe aktarmayı denemek için
   - `plan.schema.json`: geçerli şema
3. Kökte `TESLIM.md` dosyasını yaz (yapısı aşağıda).
4. Son commit'i at ve gönder.
5. Kullanıcıya tek mesajla haber ver: bağlantı, `teslim` klasörünün yeri, iPhone kontrol listesi, varsa yapılamayanlar. Windows bildirimi göndermeyi dene; olmazsa geç.

### TESLIM.md yapısı

Türkçe ve sade yazılır; web geliştirme bilgisi varsayılmaz.

1. **Bağlantı.** Adres; "iPhone'da Safari'de açın, Paylaş → Ana Ekrana Ekle" notu.
2. **Yapılanlar.** Özellik listesi; her satırda "otomatik testle doğrulandı" ya da "yalnızca gerçek iPhone'da doğrulanabilir".
3. **iPhone kontrol listesi.** Aşağıdaki altı madde.
4. **Gerçek plan nasıl alınır.** claude.ai'daki "Tur Programı" projesinde "şu yer, şu tarihler için uygulama planı üret" denir; gelen `.json` dosyası iPhone'da Dosyalar'a kaydedilir; uygulamada "Plan içe aktar" ile açılır.
5. **Kararlar.** Kullanıcıya sorulmadan verilen kararlar, birer satır.
6. **Yapılamayanlar.** Ne, neden, nasıl tamamlanır.
7. **Şema değişiklikleri.** Yoksa "yok".
8. **Depolama notu.** Safari'nin veri silme kuralı ve önlemi.
9. **Sonraki adım önerileri.** "Sonraya bırakılanlar" listesinden.

### iPhone kontrol listesi

1. Bağlantı Safari'de açılıyor; Ana Ekrana eklenince tam ekran açılıyor.
2. Örnek gezide bir durağın anlatımı Türkçe sesle okunuyor.
3. Tur modunda konum izni soruluyor, konumunuz haritada görünüyor, ekran kendiliğinden kapanmıyor.
4. Ayarlardan örnek gezi bulunduğunuz yere taşınıp simülasyonla durağa yaklaşılınca anlatım kendiliğinden başlıyor ya da "Dinle" düğmesi çıkıyor.
5. Uçak modunda uygulama açılıyor; gezi ve sesli okuma çalışıyor.
6. `ornek-plan.json` dosyası "Plan içe aktar" ile açılabiliyor.

## Sonraya bırakılanlar

Bu oturumda yapılmaz; teslim notunda öneri olarak yer alır.

- Plan düzenleme: durak çıkarma, sıra değiştirme.
- Gezi günü görünümü: bugünün akışı, sıradaki SABİT saat, kalan duraklar.
- Pil dostu tur: koyu tema, konum sıklığını azaltma.
- Planın yazdırılabilir broşür olarak dışa aktarılması.
- Evde gezilen harita bölgesinin çevrimdışı kalması.
- İngilizce arayüz.

## Kapsam dışı

- **Cepte çalışan tur modu.** Ekran kilitliyken konum ve ses, yalnızca mağazadan veya ücretli geliştirici üyeliğiyle kurulan yerel uygulamalarda mümkündür.
- **Uygulama içinden plan üretimi.** Ücretli API ve sunucu ister. Plan Claude'da üretilir.
- **Mağaza yayını, ödeme, kullanıcı hesapları.**
