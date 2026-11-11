# Geliştirme 2 — profesyonel sürüm

Bu dosya, çalışan ilk sürümün üzerine yapılacak ikinci turun iş emridir. `ADIMLAR.md` içindeki özerk çalışma kuralları aynen geçerlidir: sorma, bekleme, her aşamada test ve commit, dürüst rapor.

Kapsam değişmedi: kişisel kullanım, Apple cihazlar, Safari'de açılan web uygulaması, ücret yok.

## Değişen tek kural: isteğe bağlı ücretsiz anahtar

`CLAUDE.md` içindeki "API anahtarı isteyen bağımlılık eklenmez" kuralı şu biçimde gevşer; `CLAUDE.md` dosyasını da buna göre güncelle:

- Ücretsiz olan ve kullanıcının kendi cihazında Ayarlar'a girdiği anahtar serbesttir.
- Anahtar depoya, derlemeye, yedek dosyasına ve hata günlüğüne girmez; yalnızca o cihazda saklanır.
- Anahtar yokken uygulamanın her özelliği çalışır; anahtarlı özellik yerine sade bir yedek gösterilir.
- Ücretli servis yasağı sürer.

## Eklenen kural: uygulama bilgi uydurmaz

`CLAUDE.md` içindeki değişmez kurallara ekle: yol tarifi, bilet ve ücret bilgisi, Michelin derecesi, etkinlik ve rezervasyon bağlantısı için uygulama yalnızca planla geleni gösterir; bunları kendisi üretmez ve tahmin etmez. Canlı yön için kullanıcı Haritalar'a devredilir.

## Başlamadan

1. `TESLIM.md`, `ILERLEME.md` ve kodu oku; ilk sürümde neyin yapıldığını, neyin yapılamadığını çıkar.
2. Bu klasöre yeni gelen `plan.schema.json` sürüm 2'dir. İlk sürümde şemada değişiklik yaptıysan `git diff` ile karşılaştır ve uzlaştır; sonucu teslim notuna yaz. Sürüm 1 dosyaları değişmeden içe aktarılabilmelidir.
3. Mevcut testlerin geçtiğini doğrula, sonra `v1.0` etiketi at. Geri dönüş noktası budur.
4. `ILERLEME.md` içine "Geliştirme 2" başlığı aç.

## Aşama A — Veri katmanı

1. Şema 2 tiplerini ve doğrulayıcıyı güncelle. Örnek geziyi yeni alanlarla zenginleştir. Duraklarda `hours`, `phone`, `website`, `ticketUrl`, `lookFor`, `narrationShort`, `videoQuery`, `videos`, `wikipediaTr`, `images`; mekanlarda `bookingUrl`, `michelin`, `images`; günlerde `eveningEvents`, `fromLodging`, `toLodging`; gezide `lodging`, `arrival`, `departure`. Örnek gezide Michelin derecesi, etkinlik, uçuş ve rezervasyon bağlantısı uydurulmaz: ya kaynağından teyit edilir ya da kaydın adı açıkça ÖRNEK diye etiketlenir.
2. Kullanıcı durumunu plandan ayır: ziyaret edildi işareti, not, puan, iğne düzeltmesi, sabitlenen video ayrı bir depoda, gezi kimliği ve durak kimliğiyle tutulur.
3. Plan güncelleme: aynı `id` ile yeni dosya gelince kullanıcı durumu korunur ve neyin değiştiği özetlenir (eklenen, çıkan, saati değişen duraklar).
4. Kural denetimine şu uyarıları ekle; uyarı içe aktarmayı engellemez:
   - Rezervasyonu şart olan mekanda ne `bookingUrl` ne `phone` var.
   - Görselde eser sahibi ya da lisans eksik.
   - `michelin` kaydında rehber bağlantısı yok.
   - Akşam etkinliğinin tarihi bulunduğu günün tarihine uymuyor.
   - Dönüşte otelden çıkış saatine yol süresi eklenince havalimanına uçuştan en az iki saat önce varılmıyor.
   - Konaklama var ama varış ya da dönüş tarifi yok.

**Kendi doğrulaman:** Sürüm 1 ve sürüm 2 örnekleri içe aktarılıyor. Plan güncellenince işaretler ve notlar yerinde kalıyor (uçtan uca test). Yeni uyarıların her biri için bir birim testi var.

## Aşama B — Durak ve mekan ekranı

1. **Video.** Durak ekranında anlatımın altında "Video" kartı.
   - Sıra: planla gelen ya da kullanıcının sabitlediği video varsa o gösterilir. Yoksa ve Ayarlar'da YouTube veri anahtarı varsa uygulama kendisi bulur. O da yoksa sorguyla YouTube'da arama açan düğme gösterilir.
   - Otomatik bulma: sorgu `videoQuery`, yoksa durak adı ile şehir. Türkçe ve Türkiye bölgesi tercihiyle, yalnızca gömülebilir videolar aranır. Adayların istatistikleri alınır.
   - Eleme: dili Türkçe olanlar (dil alanı yoksa başlık ve açıklamadan Türkçe sezgisi), süresi 2-30 dakika, canlı yayın değil, başlığında durak adının ayırt edici bir sözcüğü geçenler.
   - Sıralama: beğeni sayısı büyükten küçüğe; beğeni gizliyse izlenme sayısı. İlk beş aday saklanır, birincisi gösterilir. Kartta kanal, süre, beğeni sayısı ve kontrol tarihi yazar.
   - Kullanıcı "başka video" ile adaylar arasında geçer, birini sabitler ya da bir YouTube bağlantısı yapıştırır.
   - Oynatma: önce küçük resim, dokununca sayfa içinde oynatıcı; gizlilik dostu gömme adresi. Video başlayınca sesli anlatım durur. Tur modunda video kendiliğinden başlamaz, kart olarak önerilir. Mobil veride "yaklaşık şu kadar dakika, veri kullanır" uyarısı.
   - Kota: durak başına en çok 30 günde bir arama; sonuçlar önbellekte. Resmi belgeden günlük ücretsiz kotayı, arama ve istatistik çağrılarının maliyetini ve anahtarın alan adına kısıtlanmasını teyit et; Ayarlar'da anahtarın nasıl alınacağını beş adımda anlat.
2. **Hızlı bakış ve iki uzunlukta anlatım.** `lookFor` maddeleri anlatımın üstünde kart olarak. "Kısa dinle" (`narrationShort`) ve "Uzun dinle" düğmeleri; alan yoksa yalnızca uzun.
3. **Fotoğraf galerisi ve Vikipedi.** Her durakta tek görsel değil, yana kaydırılan bir galeri: en çok altı fotoğraf.
   - Sıra: önce planla gelen `images`. Altıdan azsa ve `wikipediaTr` varsa uygulama Türkçe Vikipedi maddesinde kullanılan görsellerle tamamlar; madde yoksa durak adıyla Wikimedia Commons'ta arar.
   - Yalnızca özgür lisanslı görsel: Commons'ta barınan, lisansı ve eser sahibi okunabilen dosyalar. Simge, logo, harita, plan çizimi ve çok küçük görseller elenir. Lisansı okunamayan görsel gösterilmez.
   - Her fotoğrafın altında eser sahibi ve lisans. Dokununca tam ekran açılır, iki parmakla yakınlaştırılır. Galeride küçük boy indirilir, tam ekranda büyüğü istenir.
   - Kullanıcı ilgisiz fotoğrafı "gizle" ile kaldırır; seçim kullanıcı durumunda saklanır ve plan güncellenince korunur.
   - Mekan kartlarında `images` varsa tek kapak görseli; mekanlar için uygulama kendisi görsel aramaz.
   - "Vikipedi'de oku" bağlantısı. Hiç görsel yoksa boş yer bırakılmaz.
   - Görsel servisinin çağrı biçimini, başka alan adından erişim koşulunu ve kullanım kurallarını resmi belgeden teyit et; sonuçlar önbellekte tutulur.
4. **Eylem düğmeleri ve rezervasyon.** Ara, Web sitesi, Bilet al, Rezervasyon yap, Haritalarda aç, Takvime ekle. Yalnızca verisi olan düğme görünür.
   - Durakta `ticketUrl` varsa "Bilet al".
   - Mekanda `bookingUrl` varsa "Rezervasyon yap". Yoksa ve rezervasyon şart ya da öneriliyorsa telefonla "Arayıp yer ayırt". İkisi de yoksa rezervasyon notu düz yazı olarak kalır.
   - Uygulama rezervasyonu kendisi yapmaz, yapılacağı sayfaya götürür. Bağlantı yeni sekmede açılır; yalnızca `https` adres kabul edilir.
   - Kullanıcı "rezervasyon yapıldı" diye işaretler; saat ve onay numarası için kısa not alanı vardır. İşaret mekan kartında ve Hazırlık listesinde görünür.
5. **Michelin rozeti.** `michelin` alanı dolu mekanların kartında düz yazı rozet: "Michelin 1 yıldız", "Michelin 2 yıldız", "Michelin 3 yıldız", "Bib Gourmand", "Michelin önerisi"; yanında yıl, varsa "Yeşil yıldız". Rozete dokununca rehberdeki sayfa açılır. Öğün seçeneklerinde "Yalnızca Michelin" süzgeci; haritada bu mekanların işareti ayırt edilir. Michelin'in logosu, yıldız çizimi ve maskotu kullanılmaz; rozet uygulamanın kendi yazı ve renk diliyle çizilir. Uygulama Michelin verisini kendisi aramaz, yalnızca planla geleni gösterir.

**Kendi doğrulaman:** Video seçme mantığı sahte veriyle birim testinden geçiyor: Türkçe olmayan eleniyor, kısa ve canlı olan eleniyor, en çok beğenilen seçiliyor, sabitlenen değişmiyor. Anahtar yokken arama düğmesi çıkıyor. Anahtar hiçbir dosyaya ve günlüğe yazılmıyor (test). Galeri sahte veriyle test ediliyor: lisansı okunamayan ve Commons dışı görsel eleniyor, gizlenen fotoğraf geri gelmiyor, plandaki görseller önce geliyor. Rezervasyon düğmesi yalnızca verisi olan mekanda çıkıyor. Michelin süzgeci doğru mekanları bırakıyor.

## Aşama C — Gezi günü asistanı

1. **Bugün ekranı.** Gezi tarihlerindeyken açılış ekranı olur: sıradaki adım, yürüme süresi, sıradaki SABİT saate geri sayım, günün kalan durakları. Durak "gördüm" diye işaretlenir.
2. **Şu an açık mı.** `hours` varsa durak ve mekanlarda "Açık", "Yakında kapanıyor", "Kapalı" rozeti; gece yarısını aşan saatler doğru hesaplanır. Saat bilgisi yoksa rozet gösterilmez.
3. **Bana en yakın açık seçenek.** Öğün seçenekleri konuma göre sıralanır; kapalı olan sona düşer.
4. **Geç kaldım.** Gün planın gerisindeyse günün `flex` notlarından öneri kartı: hangi durak atlanır, hangisi yer değiştirir.
5. **Hava.** Ücretsiz ve anahtarsız bir hava servisinden (aday: Open-Meteo; koşulunu ve atıf şartını teyit et) gezi günlerinin tahmini. Yağış olasılığı yüksekse günün `ifRain` notu kart olarak öne çıkar. Tahmin alınamazsa plandaki hava notu gösterilir.

**Kendi doğrulaman:** Saat sahtelenerek açık-kapalı rozetleri, gece yarısı sonrası kapanış ve geri sayım test ediliyor. Hava servisi kapalıyken ekran bozulmuyor.

## Aşama D — Kapıdan kapıya ve akşam

Amaç: kullanıcı havalimanı çıkışından otele, gün içinde duraktan durağa, gezi bitince otelden havalimanına başka bir yere bakmadan gidebilsin. Bütün bölümler planla gelen veriye dayanır; alanı boş olan bölüm hiç görünmez.

1. **Konaklama.** `lodging` varsa gezi ana ekranında otel kartı: ad, adres, giriş ve çıkış saati, Ara, Web sitesi, Haritalarda aç. Otel bütün haritalarda kendine özgü işaretle görünür. "Şoföre göster": otelin adı ve adresi tam ekranda, büyük yazıyla, planda yazıldığı biçimde. Planda konaklama yoksa kullanıcı haritada bir noktayı "otelim" diye işaretleyebilir; bu bilgi kullanıcı durumunda saklanır.
2. **Varış: havalimanından otele.** `arrival` varsa "Varış" ekranı, adım adım kartlarla. Her kartta ulaşım türü simgesi, yapılacak iş, hat ve yön, kaç durak, süre, hangi bilet ve nereden alınacağı, ücret. Adım "tamam" diye işaretlenir, sıradaki adım öne çıkar. Üstte toplam süre ve ücret; altta diğer seçenekler (taksi, servis) ve not. Haritada çıkış noktası, koordinatı olan adımlar ve otel. Varış gününde Bugün ekranı bu kartla açılır.
3. **Dönüş: otelden havalimanına.** `departure` varsa "Dönüş" ekranı aynı düzende. En üstte "Otelden en geç şu saatte çıkın" (`leaveBy`) ve geri sayım. Dönüş gününde bu bant Bugün ekranında sabit durur; son 30 dakikada renk değiştirir. Otelden çıkış saati takvim dosyasına hatırlatmalı kayıt olarak girer.
4. **Günün başı ve sonu.** `fromLodging` günün ilk kartıdır ("Otelden ilk durağa"), `toLodging` son kartıdır ("Otele dönüş").
5. **Otele dön.** Bugün ekranında ve tur modunda her zaman erişilen düğme. Dokununca bulunulan konumdan otele Haritalar'da toplu taşıma yol tarifi açılır; varsa günün `toLodging` notu da gösterilir. Konum alınamıyorsa yalnızca otelin konumu açılır.
6. **Akşam etkinlikleri.** Gün ekranında "Akşam" bölümü: `eveningEvents` kartları. Kartta ad, tür, mekan, başlama saati, fiyat, kime uygun olduğu ve not; Bilet al (`bookingUrl`), Web sitesi, Haritalarda aç, Takvime ekle. Etkinlikler haritada E1, E2 diye ayrı renkte, rota çizgisine girmeden gösterilir. Kullanıcı birini "gidiyorum" diye seçer; seçilen etkinlik günün akışına, Bugün ekranına ve takvim dosyasına girer. Saati geçmiş etkinlik soluk görünür.

**Kendi doğrulaman:** Varış ve dönüş adımları örnek veriyle uçtan uca testte sırayla işaretleniyor. Saat sahtelenerek otelden çıkış geri sayımı ve renk değişimi test ediliyor. "Otele dön" bağlantısı sahte konumla doğru hedefi üretiyor (birim testi). Konaklama, varış, dönüş ve etkinlik alanları boş olan sürüm 1 planında bu bölümlerin hiçbiri görünmüyor ve ekran bozulmuyor. Ağ kapalıyken Varış ve Dönüş ekranları açılıyor.

## Aşama E — Gezi öncesi hazırlık

1. **Geziyi hazırla.** Evde, Wi-Fi'de tek dokunuş: bütün durakların videosu bulunur, galeri fotoğrafları ve video küçük resimleri önbelleğe alınır, hava tahmini çekilir, gezi bölgesinin harita karoları sağlayıcının koşulları elverdiği ölçüde ısıtılır. İlerleme ve eksikler listelenir.
2. **Hazırlık listesi.** Plandaki rezervasyonlar, biletli duraklar ve seçilen akşam etkinlikleri tarihe göre sıralı, işaretlenebilir tek liste olur; rezervasyonu şart olanlar üstte. Her satırda Rezervasyon yap ya da Bilet al, Ara ve Web sitesi düğmesi; yapılan işaretlenir.
3. **Videolar sayfası.** Günün bütün durak videoları tek listede; akşam otelde izlemek için.
4. **Takvime ekle.** SABİT saatler, rezervasyonlar, seçilen akşam etkinlikleri, varış ve otelden çıkış saati tek bir takvim dosyası olarak dışa aktarılır; iPhone takvimine eklenir. Otelden çıkış kaydı hatırlatmalıdır.

**Kendi doğrulaman:** Hazırlıktan sonra ağ kapalıyken gezi, galeri fotoğrafları ve video küçük resimleri görünüyor. Takvim dosyası geçerli, saat dilimi doğru ve otelden çıkış kaydında hatırlatma var (birim testi).

## Aşama F — Cila ve güven

1. **Tasarım sistemi.** Renk, yazı ve boşluk değerleri tek dosyada; bütün ekranlar aynı bileşenlerle. Koyu tema, sistemin büyük yazı ayarına uyum, boş durum ve yükleniyor görünümleri, uygulama simgesi ve açılış ekranı. Ekran okuyucu etiketleri.
2. **Garsona göster.** İfadeye dokununca tam ekran, büyük yazıyla özgün dil ve altında Türkçesi; sesli okuma düğmesi. Plandaki yeme içme kısıtından üretilen kart en üstte sabit durur.
3. **Paylaş.** Plan ve kullanıcı notları tek dosya olarak paylaşım menüsünden gönderilir; karşı tarafta içe aktarılır. Anahtar dosyaya girmez.
4. **Gezi günlüğü.** Durağa not, mekana beş üzerinden puan; gezi sonunda özet metin olarak dışa aktarılır.
5. **Sürüm notları.** Ayarlar'da sürüm numarası ve "bu sürümde neler yeni" ekranı.

**Kendi doğrulaman:** Uçtan uca testler açık ve koyu temada, iPhone ekran boyutunda geçiyor. Otomatik erişilebilirlik denetiminde kritik hata yok.

## Aşama G — Teslim

1. Yayımla, yayımlanmış adrese karşı kısa test kümesini çalıştır, `v2.0` etiketi at.
2. `teslim` klasörünü yenile: derlenmiş site, sürüm 2 örnek planı, geçerli şema.
3. `TESLIM-2.md` yaz: bağlantı; yapılanlar (her biri "otomatik testle doğrulandı" ya da "yalnızca gerçek iPhone'da doğrulanabilir"); YouTube anahtarının beş adımda alınışı; aşağıdaki kontrol listesi; kararlar; yapılamayanlar; şema uzlaştırması.
4. Kullanıcıya tek mesajla haber ver.

### iPhone kontrol listesi 2

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

## Sonraya bırakılanlar

- Gezi bölgesinin tamamen çevrimdışı haritası (tek dosyalık harita paketi).
- Masraf takibi ve kur çevirisi.
- Doğal sesle önceden üretilmiş anlatım.
- İngilizce arayüz.
- Canlı sefer saatleri ve gecikme bilgisi.
- Etkinlik ve restoranı uygulamanın kendisinin araması; bunlar plan üretilirken araştırılır.
