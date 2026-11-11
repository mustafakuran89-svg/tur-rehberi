# Tur Rehberi — Geliştirme 2 teslim notu

Tarih: 11.11.2026 · Sürüm 2.0.0 · Geri dönüş noktası: `v1.0` etiketi · Bu sürüm: `v2.0` etiketi

## 1. Bağlantı

**https://mustafakuran89-svg.github.io/tur-rehberi/**

Uygulama Ana Ekran'a eklendiyse kendini güncellemesi için bir kez açıp kapatmanız yeterlidir. Kayıtlı gezileriniz silinmez. Örnek gezi kendiliğinden yeni sürüme geçer.

Teslim klasörü: `C:\Projeler\tur-rehberi\teslim`. Kopyası `Masaüstü\Projeler\Tur Rehberi\teslim` altındadır.

- `tur-rehberi-site.zip`: derlenmiş site
- `ornek-plan.json`: sürüm 2 örnek gezi (otel, varış/dönüş, akşam etkinliği, Michelin, video sorgusu ve fotoğraf alanları dolu)
- `plan.schema.json`: geçerli şema (sürüm 2)

## 2. Yapılanlar

| Özellik | Doğrulama |
|---|---|
| Şema 2: sürüm 1 dosyaları da değişmeden içe aktarılıyor | otomatik testle doğrulandı |
| Kullanıcı durumu plandan ayrı saklanıyor: gördüm işareti, not, puan, iğne düzeltmesi, sabitlenen video, gizlenen fotoğraf, rezervasyon işareti, "gidiyorum", varış/dönüş adımları | otomatik testle doğrulandı |
| Aynı planın yenisi gelince işaret ve notlar korunuyor; eklenen, çıkan ve saati değişen duraklar özetleniyor | otomatik testle doğrulandı |
| 6 yeni plan uyarısı: rezervasyon iletişimi, görsel lisansı, Michelin bağlantısı, etkinlik tarihi, havalimanına 2 saat kuralı, varış/dönüş tarifi eksik | otomatik testle doğrulandı (her biri için birim testi) |
| Hızlı bakış maddeleri; ayrı "Kısa dinle" ve "Uzun dinle" düğmeleri | otomatik testle doğrulandı (ses taklitli); **gerçek ses yalnızca gerçek iPhone'da doğrulanabilir** |
| Video kartı. Sıra: planla gelen ya da sizin sabitlediğiniz, sonra anahtarla bulunan video. Anahtar yoksa "YouTube'da ara" çıkar | otomatik testle doğrulandı (YouTube yanıtı taklit edildi) |
| Video seçimi: Türkçe, 2-30 dakika, canlı yayın değil, başlıkta durak adı geçiyor, en çok beğenilen önce, 5 aday saklanıyor, sabitlenen değişmiyor | otomatik testle doğrulandı |
| Videoya dokununca sayfa içinde oynatıcı açılıyor ve anlatım susuyor | otomatik testle doğrulandı; **sayfa içinde oynaması yalnızca gerçek iPhone'da doğrulanabilir** |
| YouTube anahtarı dosyaya, yedeğe, paylaşım dosyasına ve hata günlüğüne yazılmıyor | otomatik testle doğrulandı |
| Fotoğraf galerisi (en çok 6). Önce plandaki fotoğraflar, sonra Vikipedi ya da Commons. Eser sahibi ve lisans görünüyor. Lisanssız ve Commons dışı fotoğraf eleniyor. Gizlenen fotoğraf geri gelmiyor | otomatik testle doğrulandı |
| Fotoğrafın tam ekran açılması | otomatik testle doğrulandı; **iki parmakla yakınlaştırma yalnızca gerçek iPhone'da doğrulanabilir** |
| Ara, Web sitesi, Bilet al, Rezervasyon yap, Arayıp yer ayırt, Haritalarda aç, Takvime ekle. Yalnız verisi olan düğme görünür, yalnız https bağlantı kabul edilir | otomatik testle doğrulandı |
| "Rezervasyon yapıldı" işareti ve not. Mekan kartında ve Hazırlık listesinde görünür | otomatik testle doğrulandı |
| Michelin rozeti (düz yazı, rehber bağlantılı), "Yalnızca Michelin" süzgeci, haritada ayırt edici halka | otomatik testle doğrulandı |
| Bugün ekranı: sıradaki adım, yürüme süresi, sabit saate geri sayım, kalan duraklar, "gördüm" | otomatik testle doğrulandı (saat taklit edildi) |
| Açık / Yakında kapanıyor / Kapalı rozeti, gece yarısını aşan saatler dahil | otomatik testle doğrulandı |
| Öğün seçeneklerinde açık olanlar önce, kapalılar sonda | otomatik testle doğrulandı |
| Geç kaldım kartı (günün esneme notlarından) | otomatik testle doğrulandı |
| Hava (Open-Meteo): yağış olasılığı yüksekse "yağmur yağarsa" notu öne çıkar; servis yoksa plandaki hava notu gösterilir | otomatik testle doğrulandı (servis taklitli ve kapalıyken) |
| Gezi tarihlerindeyken açılışta Bugün ekranı açılıyor | otomatik testle doğrulandı |
| Otel kartı, "Şoföre göster", haritada otel işareti. Planda otel yoksa "Otelimi haritada işaretle" çıkar | otomatik testle doğrulandı (otel yokken düğmenin çıkması dahil) |
| Varış ve Dönüş ekranları: adımlar sırayla işaretleniyor, ağ kapalıyken açılıyor | otomatik testle doğrulandı |
| Dönüş bandı, otelden çıkışa geri sayım, son 30 dakikada renk değişimi | otomatik testle doğrulandı |
| Otele dön (Haritalar'da toplu taşıma yol tarifi) | bağlantı otomatik testle doğrulandı; **açılışı yalnızca gerçek iPhone'da doğrulanabilir** |
| Otelden ilk durağa ve otele dönüş kartları | otomatik testle doğrulandı |
| Akşam etkinlikleri: E1, E2 işaretleri rotaya girmiyor. Seçilen etkinlik günün akışında, Bugün'de ve takvimde görünüyor. Saati geçen soluk gösteriliyor | otomatik testle doğrulandı |
| Sürüm 1 planında otel, varış, dönüş ve etkinlik bölümleri hiç görünmüyor | otomatik testle doğrulandı |
| Geziyi hazırla: video, video küçük resimleri, fotoğraflar, hava, harita; ilerleme ve eksikler listesi | otomatik testle doğrulandı (fotoğraf ve küçük resim, ağ kapalıyken cihazdan) |
| Haritanın önbelleğe alınması | **yalnızca gerçek cihazda doğrulanabilir**; çevrimdışı haritanın tamamı garanti değildir (bkz. 6) |
| Hazırlık listesi (şart olanlar üstte, sonra tarihe göre) | otomatik testle doğrulandı |
| Günün videoları sayfası | bilgisayardaki tarayıcıda denendi (sabitlenen video listede çıktı); otomatik test yok |
| Takvim dosyası (.ics): geçerli biçim, doğru saat dilimi, otelden çıkışta hatırlatma | otomatik testle doğrulandı (birim testi ve indirme testi); **Takvim'e eklenmesi yalnızca gerçek iPhone'da doğrulanabilir** |
| Tasarım değerleri tek dosyada (`src/theme.css`), koyu tema (sistem, açık, koyu) | otomatik testle doğrulandı |
| Sistemin büyük yazı ayarına uyum | **yalnızca gerçek iPhone'da doğrulanabilir** |
| Açılış ekranı görselleri (8 iPhone boyutu) | **yalnızca gerçek iPhone'da doğrulanabilir** |
| Erişilebilirlik: otomatik denetimde 10 ekranda, açık ve koyu temada kritik ve ciddi ihlal yok | otomatik testle doğrulandı |
| Garsona göster: tam ekran, büyük yazıyla özgün dil ve altında Türkçesi, sesli okuma; yeme içme kısıtı kartı en üstte | otomatik testle doğrulandı |
| Paylaş: plan ve notlar tek dosya, karşı tarafta içe aktarılıyor, anahtar dosyaya girmiyor | otomatik testle doğrulandı (indirme yoluyla); **iPhone paylaşım menüsü yalnızca gerçek iPhone'da doğrulanabilir** |
| Gezi günlüğü: durak notu, mekan puanı, metin olarak dışa aktarma | not ve puan otomatik testle doğrulandı; dışa aktarılan metin bilgisayardaki tarayıcıda denendi |
| Ayarlar'da sürüm numarası ve "Bu sürümde neler yeni" | otomatik testle doğrulandı |

Testler:

- 71 birim testi, hepsi geçti.
- 28 uçtan uca test, Chromium ve WebKit'te (iPhone 13 boyutu), toplam 56 koşu, hepsi geçti.
- Yayımlanmış adrese karşı 3 duman testi, Chromium ve WebKit'te 6/6 geçti.

## 3. YouTube anahtarı nasıl alınır (5 adım)

Anahtar ücretsizdir; ödeme bilgisi istenmez. Yalnızca bu iPhone'da saklanır.

1. Bilgisayarda **console.cloud.google.com** adresine Google hesabınızla girin. Üstteki proje seçiciden **Yeni proje** oluşturun (ad örneği: "tur-rehberi").
2. Sol menüden **API'ler ve Hizmetler › Kitaplık**'a gidin. **YouTube Data API v3**'ü bulup **Etkinleştir**'e basın.
3. **API'ler ve Hizmetler › Kimlik bilgileri › Kimlik bilgisi oluştur › API anahtarı** deyin; anahtar oluşur.
4. Anahtarı düzenleyip iki kısıtlama koyun, sonra kaydedin:
   - **Uygulama kısıtlamaları**: **Web siteleri**'ni seçin ve `mustafakuran89-svg.github.io/*` ekleyin.
   - **API kısıtlamaları**: yalnız **YouTube Data API v3**'ü seçin.
5. Anahtarı kopyalayın. iPhone'da uygulamada **Ayarlar › YouTube veri anahtarı** alanına yapıştırıp **Kaydet**'e basın.

Günlük ücretsiz kota (Google'ın resmi belgesi, 11.11.2026'da kontrol edildi):

- 100 arama ve diğer çağrılar için 10.000 birim. Bir durak bir arama ve bir istatistik çağrısı harcar.
- Uygulama aynı durak için en çok 30 günde bir arar ve sonucu cihazda saklar.
- Kota dolarsa ertesi gün yenilenir; ücret çıkmaz.
- Anahtarı silmek için Ayarlar'da **Anahtarı sil**'e basın.

## 4. iPhone kontrol listesi 2

1. Ayarlar'a YouTube anahtarı girilince bir durakta Türkçe video çıkıyor ve sayfa içinde oynuyor.
2. Anahtar silinince aynı durakta "YouTube'da ara" düğmesi çıkıyor.
3. "Kısa dinle" ve "Uzun dinle" ayrı ayrı çalışıyor; video başlayınca anlatım susuyor.
4. Bugün ekranında sıradaki adım ve açık-kapalı rozetleri görünüyor.
5. "Geziyi hazırla" bittikten sonra uçak modunda fotoğraflar ve gezi açılıyor.
6. Bir ifade "garsona göster" ile tam ekran açılıyor.
7. Takvim dosyası iPhone takvimine ekleniyor.
8. Koyu temada bütün ekranlar okunaklı.
9. Bir durakta galeri kaydırılıyor, fotoğraf tam ekran açılıyor, altında eser sahibi yazıyor.
10. "Rezervasyon yap" mekanın rezervasyon sayfasını açıyor; geri dönünce uygulama kaldığı yerde duruyor.
11. Michelin rozetli bir mekanda rozete dokununca rehberdeki sayfa açılıyor.
12. Varış ekranında adımlar sırayla işaretleniyor; ekran uçak modunda da açılıyor.
13. "Otele dön" Haritalar'da bulunduğum yerden otele yol tarifi açıyor.
14. Bir akşam etkinliği "gidiyorum" diye seçilince günün akışında ve takvim dosyasında görünüyor.

Örnek gezide bu maddeleri nerede deneyeceğiniz:

- 1–3 ve 9: 1. gün › 2. durak (Saat Kulesi). Galeride Commons'tan iki gerçek fotoğraf var.
- 4: Bugün ekranı yalnız gezi tarihlerinde açılır. Örnek gezinin tarihleri 14-15.05.2027'dir; bu yüzden 4. maddeyi ilk gerçek gezinizde deneyin. İsterseniz örnek planın tarihlerini bugüne çekip başka bir kimlikle içe aktarın.
- 10–11: 1. gün › Yemek seçenekleri › A2 ve A1. Bağlantılar example.com'a gider; gerçek sayfa açmaz, yalnız davranışı gösterir.
- 12: Gezi özeti › "Varış: havalimanından otele".
- 13: 1. gün sayfasının altındaki "Otele dön" düğmesi.
- 14: 1. gün sayfasındaki "Akşam" bölümü, ardından Gezi özeti › "Takvime ekle (.ics)".

## 5. Kararlar

- Aşama B–F birbirine bağlı yazıldığı için tek commit'te toplandı. Her aşamanın kendi testleri yazıldı ve hepsi geçti.
- Duraklarda kimlik alanı yok. Bu yüzden kullanıcı durumunun anahtarı durak, mekan ve etkinlik **adından** türetilir (Türkçe harfler sadeleşir). Sıra değişse de işaretler yerinde kalır. Bir durağın adı değişirse eski işareti bağlanmaz.
- İğne düzeltmeleri artık plana değil kullanıcı durumuna yazılır. Plan güncellense de düzeltme korunur.
- Açık-kapalı rozeti durak ve yemek ekranlarında yalnız o günün tarihindeyken görünür. Evde plan incelenirken "Kapalı" yazısı yanıltıcı olurdu. Bugün ekranında rozet her zaman görünür.
- "Bana en yakın açık seçenek": konum izni yalnız tur modunda istenir (değişmez kural 8). Bu yüzden yalnız turun son 10 dakikadaki konumu kullanılır. Konum yoksa açık olanlar önce gelir, aralarında plan sırası korunur.
- "Otele dön": tur konumu varsa oradan, yoksa hedefi otel olan toplu taşıma tarifi açılır. İkinci durumda Haritalar bulunduğunuz yeri kendisi kullanır. Otelin koordinatı yoksa adres aranır.
- Video araması:
  - Parametreler: `relevanceLanguage=tr`, `regionCode=TR`, `videoEmbeddable=true`, 25 aday.
  - Videonun dil alanı yoksa başlık ve açıklamadan Türkçe sezgisi yapılır (ğ, ı, ş harfleri ya da sık Türkçe sözcükler).
  - Beğeni sayısı gizli olan videolar, beğenisi görünenlerin arkasına izlenme sayısına göre dizilir.
- "Günün videoları" sayfası ve tur modu arama yapmaz; yalnız önbellekteki ya da sabitlenen videoyu gösterir (kota korunur).
- Video, gizlilik dostu gömme adresiyle (youtube-nocookie.com) ve `playsinline` ile açılır. Anlatım, küçük resme dokunulduğu anda susar; ayrı bir oynatıcı arayüzü kurulmadı.
- "Mobil veri kullanır" notu her zaman gösterilir, çünkü iPhone Safari bağlantı türünü (Wi-Fi ya da mobil) bildirmez.
- Galeri kuralları:
  - Galeride 960, tam ekranda 1920 piksel genişliğinde görsel istenir; Wikimedia artık 640 pikseli vermiyor (denendi).
  - Yalnız JPEG, PNG ve WebP alınır, en az 600×400 piksel. SVG ile adı logo, harita, plan, bayrak, arma ve benzeri olan dosyalar elenir.
- Örnek gezide durak adıyla Commons araması yapılmaz, çünkü adlar uydurmadır. Yalnız plandaki fotoğraf ve Vikipedi maddesi kullanılır. Mekanlar için uygulama hiç görsel aramaz.
- Fotoğraflar cihazda Blob olarak değil bayt dizisi olarak saklanır. WebKit'in bazı kiplerinde IndexedDB Blob kabul etmedi; test bunu yakaladı.
- Hava (Open-Meteo):
  - Tahmin 3 saat saklanır.
  - Yağış olasılığı %60 ve üstündeyse günün "yağmur yağarsa" notu öne çıkar.
  - Gezinin saat dilimi bu servisten öğrenilir ve takvim dosyasında saatler buna göre yazılır. Bilinmiyorsa saatler gidilen yerin yerel saati olarak yazılır.
- Takvim dosyası:
  - Otelden çıkış kaydında iki hatırlatma var: 30 dakika önce ve tam saatinde. Seçilen etkinlikte 1 saat önce hatırlatma var.
  - Rezervasyon saati nottan okunur (ör. "20:15, onay 42"). Notta saat yoksa günün akışındaki öğün saati kullanılır.
- Hazırlık listesinde rezervasyonu şart olanlar en üstte, sonra tarih sırası gelir. Planın genel "rezervasyon gerektirenler" maddeleri tarihsiz olduğu için sonda durur.
- Harita önbelleği:
  - En çok 500 karo, en çok 4 paralel istek. OpenFreeMap'in çevrimdışı indirme sınırı 3.000 karo / 50 MB ve 4 paralel istektir (11.11.2026'da kontrol edildi).
  - OpenFreeMap ayrıca kendine özgü bir User-Agent ister. Tarayıcı bunu değiştirmeye izin vermez, karşılanamadı.
- Bugün ekranı oturum başına bir kez kendiliğinden açılır, yalnız gerçek gezilerde (örnek gezide açılmaz). Geri ile Gezilerim'e dönülür.
- İfadeye dokununca artık tam ekran "garsona göster" açılır; okuma oradaki düğmeyle yapılır. Önceki sürümde dokunmak doğrudan okuyordu.
- Şemada yeme içme kısıtı alanı yok. Kısıt kartı, planın varsayım ve notlarında geçen kısıt sözcüğünü (domuz, alkol, vejetaryen, glüten…) anlamında taşıyan ifadelerden üretilir.
- Paylaş: iPhone'da paylaşım menüsü açılır; desteklemeyen tarayıcıda dosya iner. İçe aktarmada aynı kimlikli gezi varsa önce sorulur ve gelen notlar mevcut notların yerine geçer.
- Erişilebilirlik denetimi için `@axe-core/playwright` 4.14.0 (ücretsiz, MPL-2.0) eklendi; yalnız geliştirmede kullanılır, siteye girmez. Ölçüt "kritik" ve "ciddi" ihlal sıfırdır. Koyu ve açık temanın kahvaltı, etkinlik, otel ve geçildi renkleri kontrast için koyulaştırıldı.
- Harita altlığı koyu temada da açık renk kalır. OpenFreeMap'in koyu stili var, ama tek altlık adresi kuralı korunsun diye eklenmedi; rota çizgileri temaya uyar.
- Örnek gezi:
  - Commons'tan iki gerçek, özgür lisanslı genel fotoğraf kullanır: Krakow kule (Scotch Mist, CC BY-SA 4.0) ve Venedik teras (Gerda Arendt, CC0).
  - Otel, uçuş, Michelin derecesi, etkinlikler ve rezervasyon bağlantıları "ÖRNEK" etiketlidir ve example.com'a gider. Telefonlar `+00 000 000 0000` biçiminde gerçek olmayan numaralardır.
  - Cihazdaki eski örnek gezi, uygulama güncellenince kendiliğinden yenisiyle değişir.
- `CLAUDE.md` güncellendi: değişmez kural 1, isteğe bağlı ücretsiz anahtar biçiminde gevşetildi; kural 11 olarak "uygulama bilgi uydurmaz" eklendi.
- Testlerde bulunup düzeltilen iki gerçek hata:
  - İçe aktarma ve iğne ekranında bekleyen yönlendirme, kullanıcı başka ekrana geçtiğinde onu geri götürebiliyordu.
  - "Gördüm" gibi işaretler veritabanı yazımını bekliyordu; artık dokunuşla anında görünür.

## 6. Yapılamayanlar ve sınırlar

- Bölüm 2'de "yalnızca gerçek iPhone'da" yazan doğrulamalar bilgisayardan yapılamaz; bölüm 4'teki listeyle sizin denemeniz gerekir.
- Haritanın çevrimdışı kalması sağlayıcının koşuluyla sınırlıdır. Geziyi hazırla birkaç yüz karoyu ve yazı tiplerini önbelleğe alır; uçak modunda haritanın bir kısmı boş kalabilir. Duraklar, rota ve bütün metinler her durumda görünür. Tam çevrimdışı harita paketi sonraya bırakıldı.
- Video oynatıcının içinden "video başladı" bilgisi alınmıyor. Anlatım, küçük resme dokunulduğu anda susar; oynatıcı içinde durdurup yeniden başlatmak anlatımı etkilemez.
- YouTube'un kota ve kurallarını uygulama değiştiremez. Kota dolarsa o gün yeni arama yapılmaz, önbellekteki videolar gösterilmeye devam eder.

## 7. Şema uzlaştırması

İlk sürümde `plan.schema.json` hiç değiştirilmemişti. `git log` bunu doğruladı: tek commit'te olduğu gibi duruyordu ve klasördeki sürüm 1 dosyasıyla bayt bayt aynıydı. Bu yüzden uzlaştırılacak fark yoktu; sürüm 2 dosyası olduğu gibi kondu.

Sürüm 2 yalnız isteğe bağlı alan ekler ve `schemaVersion` 1 ya da 2 olabilir. Sürüm 1 örnek dosyası (`e2e/fixtures/plan-v1.json`) değişmeden doğrulanıp içe aktarılıyor (birim ve uçtan uca test).

Bu oturumda şemada değişiklik yapılmadı.

## 8. Depolama notu

`TESLIM.md` bölüm 8 geçerlidir. Yenilikler şunlar:

- Notlar, işaretler ve puanlar planla aynı yerel veritabanında ama ayrı bir bölümde durur.
- "Yedeği dışa aktar" yalnız planları kaydeder. Notlarınızı da korumak için gezi özetindeki **Planı ve notlarımı paylaş** dosyasını saklayın.
- Önbelleğe alınan fotoğraf ve videolar silinirse yalnız internet gerekir; plan ve notlar etkilenmez.

## 9. Sonraki adım önerileri

- Gezi bölgesinin tamamen çevrimdışı haritası (tek dosyalık harita paketi).
- Masraf takibi ve kur çevirisi.
- Doğal sesle önceden üretilmiş anlatım.
- İngilizce arayüz.
- Canlı sefer saatleri ve gecikme bilgisi.
- Etkinlik ve restoranı uygulamanın kendisinin araması; bunlar şimdilik plan üretilirken araştırılır.
