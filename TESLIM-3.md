# Teslim notu — Geliştirme 3 (sürüm 3.0)

Tarih: 12.11.2026 · Etiket: `v3.0` · Geri dönüş noktası: `v2.0`

## 1. Bağlantı

https://mustafakuran89-svg.github.io/tur-rehberi/

iPhone'da Safari'de açın, sonra Paylaş → Ana Ekrana Ekle. **Geziyi hazırla işlemini Ana Ekrandaki uygulamadan yapın.** Safari sekmesinin verisi Ana Ekran uygulamasından ayrı tutulur. Hazırlık hangi ortamda yapıldıysa orada geçerli olur (ayrıntı bölüm 5'te).

Uygulama yeni sürüme kendiliğinden geçer; bir kez kapatıp açmanız yeterli. Kayıtlı geziler, notlar ve ayarlar korunur.

## 2. Yenilikler

| Yenilik | Doğrulama |
|---|---|
| **Tam çevrimdışı harita.** "Geziyi hazırla" gezi bölgesinin harita dosyasını indirir (Viyana: 24,1 MB). Dosya cihazda saklanır, harita uçak modunda sokak adlarıyla açılır. | Otomatik testle doğrulandı (Chromium ve WebKit, gerçek OpenStreetMap verisinden küçük bir bölgeyle). **Uçak modunda sokak adlarının görünmesi yalnızca gerçek iPhone'da doğrulanabilir.** |
| İndirmeden önce yaklaşık boyut gösterilir ve onay istenir. Dosya 2 MB'lık parçalarla iner; parça başarısız olursa üç kez yeniden denenir; ilerleme MB olarak görünür. | Otomatik testle doğrulandı |
| Haritada indirilen alanın dışına çıkınca "Bu alan indirilmedi" notu çıkar. En yüksek ayrıntının (15. düzey) ötesine yakınlaşınca eldeki karo büyütülür. | Otomatik testle doğrulandı (her durakta 15. ve 17. düzey) |
| Bölge haritası varsa harita internet varken de aynı dosyadan açılır; çevrimiçi ve çevrimdışı görünüm aynıdır. | Otomatik testle doğrulandı |
| **Çevrimdışı hazır denetimi.** Hazırlığın sonunda uygulama internete çıkmadan kendini sınar ve sonucu satır satır gösterir: "Harita hazır, 60 karo, 3,4 MB", "Fotoğraflar 3/3", "Anlatım sesi hazır", "Videolar internet ister". Eksik varsa "Yeniden dene" çıkar. | Otomatik testle doğrulandı |
| Gezi kartında rozet: "Çevrimdışı hazır", "Eksik var" ya da "Hazırlanmadı". | Otomatik testle doğrulandı |
| Gezi başlangıcına 2 gün ya da daha az kalmışsa ve hazırlık eksik ya da eskiyse (21 günden eski) Gezilerim'de "Hazırlığı yenile" kartı çıkar. Bildirim gönderilmez. | Otomatik testle doğrulandı |
| Hazırlık ekranı ortamı söyler: Safari sekmesinde ya da Ana Ekran uygulamasında. Safari'deyse önce Ana Ekrana eklemeyi önerir ve dört adımda gösterir. Kalıcı depolama izni istenir ve durumu yazılır. | Ortam tespiti otomatik testle doğrulandı (iPhone boyutunda Safari). **Ana Ekran uygulamasında doğru yazması yalnızca gerçek iPhone'da doğrulanabilir.** |
| Uygulama ağ yokken kapatılıp açılabilir; son açık gezi gelir. Gezi tarihlerindeyseniz Bugün ekranı gelir. | Otomatik testle doğrulandı (ağ kapalıyken yeniden yükleme) |
| Çevrimdışıyken video kartı oynatıcıyı açmaz. Cihazdaki küçük resim, başlık, bölüm bilgisi, "İnternet gerekli" ve "Sonra izle" görünür. Durak ekranı anlatımı öne alır, video sona iner. | Otomatik testle doğrulandı |
| **Rehber kanalı videosu.** Ayarlar'da sıralı öncelikli kanal listesi var; başlangıçta Ayrıcalıklı Rotalar (`@AyricalikliRotalar`). Bağlantı ya da @ad yapıştırarak ekler, sıralar, silersiniz. Video kartında "Bu kanalı öncelikli yap" seçeneği var. | Otomatik testle doğrulandı (sahte YouTube yanıtıyla) |
| Kanal dizini: anahtar girildiyse kanalın en yeni 2.000 videosu cihazda listelenir ve 30 günde bir yenilenir. Durak araması bu listede yapılır; pahalı arama çağrısı harcanmaz. | Otomatik testle doğrulandı (sahte yanıtla; 3 çağrıda dizin) |
| Bölüm bulma. Açıklamadaki "12:34 Belvedere Sarayı", "1:02:10 - Schönbrunn", "3) ▶ 4:05 Hofburg" gibi satırlar bölüm sayılır. Aksan ve Türkçe harf farkı gözetilmez; saray, müze, kilise gibi genel sözcükler tek başına eşleşme sayılmaz; 30 saniyeden kısa bölüm aday olmaz. | Otomatik testle doğrulandı (birim testleri) |
| Video sıralaması beş basamaklıdır: plan ya da sabitlenen → rehber kanalında durağın bölümü → rehber kanalında başlık → genel arama → şehir videosu. | Otomatik testle doğrulandı |
| Bölümü olan video o saniyeden başlar ve bölüm bitince durur. Kartta kanal adı, "Rehber kanalı" rozeti, "Bölüm: …, 12:34-19:05" ve "Videonun tamamını izle" var. | Adres (başlangıç ve bitiş) otomatik testle doğrulandı. **Bölümden başlayıp bölüm sonunda durması yalnızca gerçek iPhone'da doğrulanabilir.** |
| "Başlangıcı ayarla": videoda doğru yere gelip "Buradan başlat" dersiniz. Değer kalıcıdır ve plan güncellense de korunur. | Otomatik testle doğrulandı (oynatıcı taklidiyle). **Gerçek oynatıcıdan zamanın okunması yalnızca gerçek iPhone'da doğrulanabilir.** |
| Anahtar yokken iki düğme çıkar: "Kanalda ara: Ayrıcalıklı Rotalar" ve "YouTube'da ara". | Adres otomatik testle doğrulandı. **Kanal içi arama sayfasının açılması yalnızca gerçek iPhone'da doğrulanabilir** (bu bilgisayarın ağında YouTube kapalı). |
| **Kısa anlatım / Uzun anlatım.** Her durakta tek anahtar var; yanında yaklaşık süre yazar, ekrandaki metin de seçime göre değişir. Varsayılan Ayarlar'dan seçilir (başlangıçta kısa). | Otomatik testle doğrulandı |
| Planda kısa anlatım yoksa kısa seçenekte uzun anlatımın ilk iki-üç cümlesi okunur ve "Kısaltılmış" yazar. Uygulama metne bir şey eklemez. | Otomatik testle doğrulandı |
| Soluklu okuma: anlatım cümle cümle okunur; cümle arasında kısa, paragraf arasında uzun duraklama olur. "Önceki cümle", "Sonraki cümle", Duraklat ve Sürdür düğmeleri var. Kısaltma, tarih ve binlik ayırıcıdaki nokta cümle sonu sayılmaz. | Otomatik testle doğrulandı (ses taklitli). **Duraklamaların kulağa doğal gelmesi yalnızca gerçek iPhone'da doğrulanabilir.** |
| Rehber ağzı: tur modunda varışta karşılama, anlatımdan sonra sıradaki durağa geçiş (yön ve yürüme süresiyle), öğün notu, günün başı ve sonu. Her tür için birkaç değişke var; art arda aynı cümle söylenmez. Durağa varınca varsayılan uzunluk okunur, diğeri tek dokunuşla dinlenir. | Otomatik testle doğrulandı |
| **Ses bölümü.** Cihazdaki bütün Türkçe sesler listelenir ve her birinin yanında "Örnek dinle" var. Hazır tonlar: "Yumuşak rehber" (varsayılan; hız 0,9, perde 0,95), "Doğal", "Hızlı". Ayrıca hız ve perde sürgüleri var. Seçilen ses bulunamazsa varsayılan Türkçe sese düşülür. | Seçilen ses, hız ve perdenin ses motoruna gittiği otomatik testle doğrulandı. **Seslerin listelenmesi ve tonun kulağa nasıl geldiği yalnızca gerçek iPhone'da doğrulanabilir.** |
| İnternet isteyen bir ses seçilmişse çevrimdışıyken cihazdaki Türkçe sese geçilir. | Otomatik testle doğrulandı |
| Okunuş sözlüğü: plandaki `pronunciations` okumadan önce uygulanır, ekrandaki yazı değişmez. En uzun eşleşme önce gelir; "Schönbrunn'a" gibi ekli biçimler de eşleşir. | Otomatik testle doğrulandı |
| Video oynamaya başlayınca anlatım durur. YouTube'un kendi oynatıcı arayüzü "oynuyor" bilgisini verir. | Otomatik testle doğrulandı (oynatıcı taklidiyle). **Gerçek oynatıcıyla yalnızca gerçek iPhone'da doğrulanabilir.** |
| "Sonra izle" listesi Videolar sayfasında durur; bağlantı gelince oradan izlenir. | Otomatik testle doğrulandı |
| Şema sürüm 3: videoda `channelId`, `startSeconds`, `endSeconds`, `chapterTitle`; durakta `altNames`; gezide `pronunciations`. Sürüm 1 ve 2 dosyaları değişmeden içe aktarılır. Dört yeni uyarı eklendi: kısa anlatım yok; kısa anlatım 40-90 kelime dışında; uzun anlatım 120-300 kelime dışında; video bitişi başlangıçtan önce. | Otomatik testle doğrulandı |
| Yedek dosyasına kullanıcı durumu (notlar, işaretler, ayarlanan başlangıçlar) ve cihaz ayarları (ses, kanal listesi, sonra izle) girer. YouTube anahtarı girmez. | Otomatik testle doğrulandı (birim) |

Test sayıları: tip kontrolü geçti · birim testleri 117/117 · uçtan uca 80/80 (40 test × iPhone 13 boyutunda Chromium ve WebKit) · yayına karşı duman testi 8/8, ayrıca yayımlanmış sitede gerçek Viyana dosyasıyla uçtan uca deneme 2/2 (Chromium ve WebKit: 24,1 MB indi, ağ kapalıyken Viyana merkezinde 16. düzeyde 271 harita ögesi ve 27 yazı çizildi).

## 3. Bildirilen çevrimdışı sorunun nedeni

Sorun önce otomatik testte yeniden üretildi (v2.0 kodu, Chromium ve WebKit). Gezi hazırlandı, ağ kapatıldı. Hazırlık ekranı haritayı "tamam" gösterdi ama gün haritası altlıksız açıldı. Sabitlenmiş video ağ yokken oynatıcıyı açtı.

1. **Harita, asıl neden:** Haritayı açan kod, telefon "internet yok" dediğinde harita stilini hiç istemiyor, doğrudan boş zemin kuruyordu. Hazırlıkta önbelleğe alınan karolar bu yüzden hiç kullanılmıyordu. Hazırlık ekranı da sonucu kendisi sınamıyordu.
2. **Harita, ikinci neden:** Önbellek yalnız birkaç yüz karo ve üç yazı tipi aralığı tutuyordu. Karo adresi de harita sağlayıcısının her yeni derlemesinde değişiyor. Stil açılsa bile alanın bir kısmı boş kalacaktı.
3. **Video:** Kart ağ durumuna bakmadan YouTube oynatıcısını açıyordu.
4. **Testlerde bulunan ek bir hata:** Önce ekranda görüntülenen bir fotoğrafı tarayıcı "içi görülemez" biçimde önbelleğe alıyordu. Hazırlık sonra aynı fotoğrafı cihaza kaydetmeye çalışınca o kopyayı alıp başarısız oluyordu. Yani gezmeden önce baktığınız fotoğraflar çevrimdışı kalmıyordu. Düzeltildi; eski önbellek ilk açılışta bir kez temizlenir.
5. **iPhone'a özgü:** Safari motoru (WebKit) haritanın arka planda çalışan parçasını service worker önbelleğinden değil ağdan istiyordu. Bu parça artık önbellekten okunuyor.

## 4. Harita için seçilen yol ve gerekçesi

İş emrindeki üç basamak sırayla denendi:

1. **Şimdiki sağlayıcıdan (OpenFreeMap) uygulama içinde indirme: geçildi.** Koşulları 12.11.2026'da okundu: indirme başına en çok 3.000 karo ya da 50 MB, en çok 4 eşzamanlı istek ve uygulamayı tanıtan özgün bir istek kimliği (User-Agent) şart. Tarayıcı istek kimliğini değiştirmeye izin vermiyor, bu şart karşılanamıyor.
2. **Açık lisanslı dünya arşivinden tarayıcıda bölge çıkarma: geçildi.** Protomaps'in belgesi günlük derlemelere doğrudan bağlanmayı önermiyor: "hotlinking to these downloads are discouraged", yani kendi sunucunuza kopyalayın diyor. Ayrıca arşiv başka alan adından erişime (CORS) kapalı; denendi, izin başlığı dönmüyor.
3. **Depoda üretilen bölge paketi: seçildi.**
   - Yayın iş akışı `haritalar/bolgeler.json` içindeki her alan için Protomaps'in en yeni günlük derlemesinden bölge dosyası çıkarır ve siteyle yayımlar. Veri OpenStreetMap'tir, ODbL lisanslıdır; atıf haritada görünür.
   - Çıkarma, `pmtiles` kütüphanesiyle yazılmış kendi Node betiğimizle yapılır (`scripts/make-regions.mjs`); ayrı bir program indirilmez.
   - İlk bölge Viyana'dır: batı 16,28, güney 48,10, doğu 16,59, kuzey 48,23. En yüksek ayrıntı 15. düzeydir; 817 karo, 24,1 MB, çıkarması yaklaşık 1 dakika sürer. Viyana Havalimanı bu alanın içindedir; havalimanı ile otel arası da çevrimdışıdır.
   - Stil kodda üretilir (Protomaps temel haritası, Türkçe ad önceliği). Yazı tipleri (Noto Sans, OFL lisanslı) ve simgeler sitededir; uygulamayla birlikte cihaza kaydedilir.
   - Boyut sınırları: GitHub Pages'te site en çok 1 GB olabilir, Viyana bunun %2,5'i. Sunucu parça parça indirmeyi destekliyor (Range isteği yayın adresinde denendi: 206 yanıtı).
   - Bölgeler ayda bir yeni veriyle kendiliğinden yenilenir (iş akışında aylık zamanlama). Uygulama yeni derlemeyi görünce Hazırlık ekranında "Yeni harita derlemesi var" der.
   - Planın alanı hiçbir bölgeye sığmıyorsa eski yol sürer: harita internetle açılır, hazırlıkta yalnız birkaç yüz karo önbelleğe alınır. Bu gezide gezi kartı "Eksik var" gösterir.

**Gerçek sağlayıcıya karşı elle deneme (12.11.2026):** Protomaps derlemesinden (20261111, sürüm 4.15.2) iki alan çıkarıldı:

- Viyana: 817 karo, 24,1 MB.
- Örnek gezinin alanı: 60 karo, 3,4 MB.

İkincisi uçtan uca testlerde gerçek veri olarak kullanılıyor. Ağ kapalıyken her durağın haritası 15. ve 17. düzeyde açılıyor ve ekranda sokak, bina ve yazılar çiziliyor. Yayın sonrası Viyana dosyasının sitede olduğu ve parça parça indirildiği yayına karşı testle doğrulandı (bölüm 2).

### Yeni bir şehir eklemek

1. `haritalar/bolgeler.json` dosyasına bir satır ekleyin:

   ```json
   { "id": "prag", "ad": "Prag", "bbox": [14.22, 49.94, 14.71, 50.18], "maxzoom": 15 }
   ```

   Koordinatları bboxfinder.com gibi bir sayfada dikdörtgen çizerek alabilirsiniz. Sıra batı, güney, doğu, kuzeydir. Havalimanını da içine alın.
2. Değişikliği gönderin (`git push`) ya da Claude Code'a "Prag bölgesini ekle" deyin. İş akışı dosyayı üretir ve yayımlar.
3. Uygulamada o şehrin gezisinde "Geziyi hazırla" bölgeyi bulur, boyutunu gösterir ve indirir.

Büyük bir şehir 15. düzeyde 20-60 MB tutar. Daha küçük dosya için `maxzoom` 14 yapılabilir (yaklaşık yarısı); en yüksek düzeyin ötesinde karolar büyütülerek gösterilir.

## 5. Safari ile Ana Ekran

WebKit'in resmi yazısında şunlar var (webkit.org/blog/10218, 24.03.2020):

- Ana Ekrana eklenen web uygulaması Safari'nin parçası değildir ve kendi kullanım sayacını tutar.
- Bu uygulamanın verisinin silinmesi beklenmez; silinmesi ciddi bir hata sayılır.
- Safari sekmesinde ise 7 gün boyunca kullanıcı etkileşimi olmayan sitenin betikle yazılmış verisi (geziler, harita dosyası dahil) silinebilir.

Kalıcı depolama izni, aynı kaynağa göre (webkit.org/blog/14403, 10.08.2023) Ana Ekran uygulaması olarak açılınca verilir. Resmi kaynaklar Safari ile Ana Ekran depolarının ayrı olduğunu açıkça yazmıyor; pratikte ayrıdır. Uygulama bu yüzden Hazırlık ekranında "Hazırlık hangi ortamda yapıldıysa orada geçerli" der.

Öneri: önce Ana Ekrana ekleyin, uygulamayı oradan açın, hazırlığı orada yapın.

## 6. iPhone'da daha iyi Türkçe ses

Apple'ın destek sayfasına göre ("Hear iPhone speak the screen…" ve "Adjust voice and speed for VoiceOver and Speak Screen", 12.11.2026'da okundu):

1. iPhone'da **Ayarlar**'ı açın.
2. **Erişilebilirlik**'e, sonra **Okuma ve Konuşma**'ya dokunun. Eski iOS sürümlerinde bu bölümün adı **Seslendirilen İçerik**'tir.
3. **Sesler**'e, sonra **Türkçe**'ye dokunun.
4. Adının yanında **Gelişmiş** (varsa **Premium**) yazan bir sese dokunun ve indirin. Bu sesler 100 MB'ı geçebilir; Wi-Fi'de indirin.
5. İndirme bitince Tur Rehberi'ni tamamen kapatıp yeniden açın.
6. Uygulamada **Ayarlar › Ses** listesinde yeni sesi bulun, **Örnek dinle** ile deneyin, **Bu sesi kullan** deyin.
7. Tonu **Yumuşak rehber** bırakın, gerekirse hız ve perde sürgüleriyle kulağınıza göre ayarlayın.

**İndirilen sesin Safari'deki listede görünüp görünmediği yalnızca gerçek iPhone'da doğrulanabilir.** Apple, Safari'nin hangi sesleri web sayfalarına verdiğini belgelemiyor. Ses listede çıkmazsa uygulama varsayılan Türkçe sesle okur.

Menü adları iOS sürümüne göre değişebilir.

## 7. YouTube kotası (resmi belge, 12.11.2026)

Kaynak: developers.google.com/youtube/v3/determine_quota_cost. Ücretsiz günlük kota 10.000 birimdir. Arama ayrı bir kovadan gelir: günde 100 çağrı, çağrı başına 1. Liste ve ayrıntı okuma çağrı başına 1 birimdir.

Bir gezinin hazırlığı şu kadar tutar:

| İş | Çağrı | Ne sıklıkla |
|---|---|---|
| Öncelikli kanal dizini (kanal başına) | 1 kanal bilgisi + 50 videoda 1 liste + 50 videoda 1 ayrıntı. 2.000 videoluk kanalda en çok 81 birim | 30 günde bir |
| Kanalda bölümü ya da başlığı bulunamayan durak | 1 arama + 2 birim (ayrıntı ve kanal tanıtımı) | Durak başına 30 günde bir |

Örnek: 20 duraklı Viyana gezisi, tek rehber kanalı.

- Bütün duraklar kanalda bulunursa: 81 birim, 0 arama.
- Hiçbiri bulunamazsa: 81 + 40 = 121 birim ve 20 arama.

Her iki durumda da günlük kotanın çok altında kalır (birimin %1,2'si, aramanın en çok %20'si). İkinci kanal eklemek dizin için en çok 81 birim daha getirir.

## 8. iPhone kontrol listesi 3

1. Ayarlar'daki Ses bölümünde Türkçe sesler listeleniyor; "Yumuşak rehber" ayarıyla örnek dinleniyor.
2. Bir durakta "Kısa anlatım" ve "Uzun anlatım" ayrı ayrı okunuyor; yabancı adlar anlaşılır okunuyor.
3. Anahtar girilmişken bir durakta rehber kanalının videosu çıkıyor ve durağın bölümünden başlıyor.
4. "Başlangıcı ayarla" ile seçilen yer, video yeniden açıldığında korunuyor.
5. "Geziyi hazırla" sonunda "Harita hazır" satırı ve gezi kartında "Çevrimdışı hazır" rozeti görünüyor.
6. Uçak modunda harita yakınlaştırılınca sokak adları görünüyor; anlatım okunuyor; fotoğraflar açılıyor.
7. Uçak modunda video kartı "İnternet gerekli" diyor; ekran bozulmuyor.
8. Uçak modunda uygulama kapatılıp yeniden açılabiliyor.

Not: Madde 5 ve 6 bir Viyana gezisi ister; örnek gezi uydurma bir kentte olduğu için ona bölge dosyası yayımlanmadı. Kendi Viyana planınızı içe aktarın; yoksa claude.ai'de iki günlük kısa bir Viyana planı ürettirin.

## 9. Kararlar (sorulmadan verilen)

- Harita için üçüncü basamak seçildi (bölüm 4). Bölge dosyası tek parça indirilir ve gezi alanına kırpılmaz. Viyana 24 MB'tır; kırpmak hem karmaşık hem kırılgan olurdu. Dosya bütün şehri ve havalimanını kapsar.
- Bölge, gezinin bütün durak, mekan, etkinlik ve otel noktalarını (1 km payla) kapsamalı. Havalimanı noktası seçimde aranmaz. Havalimanı yol tarifi haritası, noktaların çoğu bölgedeyse bölge haritasını kullanır.
- Mobil veri tarayıcıdan güvenilir biçimde anlaşılamıyor (Safari bağlantı türünü vermiyor). Onay bu yüzden her bölge indirmesinde boyutla birlikte sorulur.
- Varsayılan anlatım uzunluğu "Kısa"dır; yürürken kısa dinlemek daha rahat. Ayarlar'dan değişir.
- Hazır tonlar: Yumuşak rehber hız 0,9 / perde 0,95; Doğal 1 / 1; Hızlı 1,15 / 1. Eski sürümden gelen hız ayarı bir kez "Yumuşak rehber"e çevrildi.
- Cümle arası duraklama 350 ms, paragraf arası 900 ms.
- Rehber cümlelerinde yer adına ek getirilmez: "Geldik: Belvedere." gibi. Bu sayede "Belvedere'a" gibi ses uyumu hataları olmaz.
- Kısaltılmış anlatım: uzun anlatımın ilk iki cümlesi; bunlar 30 kelimenin altındaysa üç cümle. Bu metin uzun anlatımın tamamıysa "kısaltılmış" yazmaz.
- Öncelikli kanalda basamak 1-3'ten video bulunduysa genel arama yapılmaz (arama kotası korunur). Eski genel aday önbellekteyse yine gösterilir.
- "Şehir videosu" için en az 10 dakikalık süre aranır; adında ya da bölümlerinden birinde şehir adı geçmelidir.
- "Rehber" sözcüğü kanal adında ya da kanal tanıtımında aranır. Tanıtım için 1 birimlik ek çağrı yapılır; çağrı başarısız olursa yalnız ada bakılır.
- Video küçük resmi eksikliği gezi kartını "Eksik var" yapmaz, çünkü video zaten internet ister; denetim satırında eksik olarak görünür. İnternet isteyen ses de "Eksik var" yapmaz; satır uyarır.
- Hazırlık 21 günden eskiyse "eski" sayılır ve hatırlatma kartı çıkar.
- Soğuk açılışta (uygulama kapatılıp yeniden açılınca) son açık gezi gelir; bu, internet olsun olmasın geçerlidir. Gezi tarihlerindeyse Bugün ekranı gelir.
- "Başlangıcı ayarla" ve "oynamaya başladı" bilgisi için YouTube'un resmi oynatıcı arayüzü (IFrame Player API) kullanıldı. Oynatıcı yine YouTube'un kendisidir, video indirilmez. Arayüz yüklenemezse video yine oynar, yalnız "Başlangıcı ayarla" görünmez.
- Örnek gezideki bölümlü video gerçek değildir. "ÖRNEK" etiketlidir ve kimliği uydurmadır; açılırsa YouTube "video yok" der. Bölüm satırını göstermek içindir.
- Kanal içi arama adresi `youtube.com/@ad/search?query=…` biçiminde. Bu bilgisayarın ağında YouTube kapalı olduğu için açılışı denenemedi (madde 3 iPhone'da denenir).
- Testlerde sesli okuma, YouTube oynatıcı arayüzü ve YouTube veri yanıtları taklit edildi.

## 10. Yapılamayanlar ve sınırlar

- Video çevrimdışı oynamaz. YouTube koşulları videoyu indirmeye izin vermez; değişmez kural 12 de aynıdır.
- Safari'de cihaz sesine yalnız ses seçimi, hız, perde ve ses düzeyi verilebilir. SSML ya da "fısıltı, sıcak ton" gibi ayarlar yoktur.
- Tarayıcı iPhone'da indirilmiş "Gelişmiş" sesleri her zaman listelemeyebilir; bu Apple'ın belgelemediği bir davranıştır.
- Bölge paketi yalnız `haritalar/bolgeler.json` içindeki şehirler için vardır, şu an yalnız Viyana. Başka şehir için bir satır eklemek yeter (bölüm 4).
- Haritada yalnız Latin, Latin genişletilmiş, Yunan ve Kiril harfleri var. Başka alfabelerdeki yer adları (Arapça, Çince…) çevrimdışı haritada görünmez; harita bozulmaz.
- Bölge dosyası 15. düzeye kadar ayrıntı içerir: bina ve sokaklar görünür, ama bazı küçük ara sokak adları ancak daha yakın düzeyde çıkar ve büyütülmüş karoda görünmeyebilir.

## 11. Şema değişiklikleri

`plan.schema.json` sürüm 3, kullanıcının verdiği dosyadır; uygulama tarafında değiştirilmedi. Sürüm 3 yalnız isteğe bağlı alan ekler:

- Videoda: `channelId`, `startSeconds`, `endSeconds`, `chapterTitle`.
- Durakta: `altNames`.
- Gezide: `pronunciations`.

Sürüm 1 ve 2 dosyaları değişmeden geçerlidir.

## 12. Sonraki adım önerileri

- Önceden üretilmiş doğal sesle anlatım paketi (ücretsiz ve koşulları uygun bir yol bulunursa).
- Video konuşma dökümünden bölüm bulma.
- Canlı sefer saatleri ve gecikme.
- Masraf takibi ve kur çevirisi.
- İngilizce arayüz.
- Yeni şehir bölgeleri: planı üretirken Claude'un `bolgeler.json` satırını da önermesi.
