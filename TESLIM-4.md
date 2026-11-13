# Teslim notu — Geliştirme 4 (sürüm 4.0)

Tarih: 13.11.2026 · Etiket: `v4.0` · Geri dönüş noktası: `v3.0`

## 1. Bağlantı

https://mustafakuran89-svg.github.io/tur-rehberi/

Ana Ekrana eklediğiniz uygulamayı bir kez kapatıp açın; yeni sürüme kendiliğinden geçer. Kayıtlı geziler, notlar, işaretler ve ayarlar korunur.

## 2. Plan kutusu: nasıl çalışır, sizin tek işiniz

**Sizin yapacağınız tek iş:** iPhone'da uygulamayı **Ana Ekrandaki simgeden** açın ve şu adımları izleyin:

1. **Ayarlar › Plan kutusu**'na gidin.
2. **Kopyala**'ya dokunun. Kopyalanan metin `tur-rehberi-anahtar:v1:` ile başlayan tek satırdır.
3. Bu metni bir kez plan üreticisine verin. Örneğin claude.ai'deki "Tur Programı" projesine yapıştırıp "bu benim cihaz anahtarım, kutu/anahtarlar.txt'ye ekle" deyin.

Bundan sonra şöyle işler:

- Plan üreticisi yeni planı şifreleyip sitedeki kutuya koyar (`KUTU.md`).
- Uygulama açılınca kutuya kendisi bakar. Size gelen gezi Gezilerim'de **"Yeni gezi"** kartıyla görünür; güncellenen gezi **"Güncellendi"** kartıyla.
- İşaretleriniz, notlarınız ve kişisel rotanız güncellemede korunur.
- Dosyayla içe aktarma da yedek yol olarak durur.

Anahtarı Safari sekmesinden değil, **Ana Ekrandaki uygulamadan** kopyalayın. İkisinin depoları ayrıdır, dolayısıyla anahtarları da ayrıdır. Plan, anahtarını verdiğiniz ortamda açılır.

**Kim neyi görebilir.** Site herkese açıktır.

- **Herkes görebilir:** kutudaki dosyaların sayısı, boyutları ve güncellenme zamanları.
- **Kimse göremez (anahtar olmadan):** gezi adı, şehir, tarihler ve planın herhangi bir satırı.
- **Cihazdan hiç çıkmayan:** özel anahtar. Dışa aktarılamaz; yedek dosyasına ve hata günlüğüne girmez.

Ekranda da bu açıklık notu yazılıdır.

**Anahtar kaybolursa** (site verisi silinirse) uygulama yeni anahtar üretir ve bunu ekranda yazar. Yeni anahtarı yeniden verin; eski planlar yeniden gönderilmelidir.

### `KUTU.md` özeti (plan üreticisi için)

1. Cihaz anahtarını `kutu/anahtarlar.txt`'ye bir satır olarak ekleyin: etiket ve anahtar. Bu bir açık anahtardır, depoda durabilir.
2. Planı depo dışında bir yere kaydedin ve `node araclar/kutuya-koy.mjs <plan.json>` çalıştırın. Araç şunları yapar:
   - planı şemaya göre doğrular, geçersizse reddeder;
   - şifreler ve `public/kutu/` altına rastgele adlı dosya yazar;
   - `index.json`'u günceller;
   - gezinin alanı yoksa `haritalar/bolgeler.json`'a çevrimdışı harita bölgesi ekler; bölge adında tarih yoktur.
3. `git add public/kutu haritalar/bolgeler.json`, `git commit`, `git push`. Yayın iş akışı kendiliğinden çalışır (1-3 dakika).
4. Bir geziyi kutudan çıkarmak için: `--kaldir <gezi-kimliği>`. Cihazdaki kopya silinmez.

Araç yalnız Node'un yerleşik kitaplıklarını kullanır. Plan içeriğini ekrana ya da günlüğe yazmaz.

### Kullanılan şifreleme

Tarayıcının ve Node'un yerleşik Web Crypto arayüzü kullanıldı; ek kitaplık yoktur.

- **Cihaz anahtarı:** ECDH, P-256 eğrisi. Özel anahtar dışa aktarılamaz, IndexedDB'de durur.
- **Plan:** gzip ile sıkıştırılır, tek kullanımlık 256 bitlik anahtarla AES-GCM ile şifrelenir.
- **Anahtar sarma:** Her gönderimde geçici bir P-256 anahtarı üretilir. Her alıcı cihaz için ECDH ve HKDF-SHA-256 ile türetilen AES-GCM anahtarı içerik anahtarını sarar.
- **Bütünlük:** AES-GCM kimlik doğrulamalıdır. Zarfın sürümü, zamanı ve geçici anahtarı ek veri olarak bağlıdır; tek bayt değişirse dosya açılmaz.
- **Safari teyidi:** MDN'e göre bu işlemler 2020'den, sıkıştırma Mayıs 2023'ten beri bütün tarayıcılarda var. WebKit uçtan uca testinde anahtar üretme, IndexedDB'de saklama, açma ve sıkıştırma çalıştı.

## 3. Yapılanlar

| Yenilik | Doğrulama |
|---|---|
| **Şema sürüm 4:** gezide `tips`, `discover`, `happenings`; durak ve mekanda `id`, `tips`; etkinlikte `id`, `description`, `endDate`, `durationMinutes`, `recommended`, `availabilityNote`, `images`, `tips` ve yeni türler. Sürüm 1-3 dosyaları değişmeden içe aktarılır. | Otomatik testle doğrulandı |
| **Kalıcı kimlik.** Kimlikli kayıtta işaretler, notlar, puanlar, ipucu adımları ve kişisel rota kimliğe bağlanır. Durağın adı değişse de yerinde kalır. Kimliksiz plandan kimlikli plana geçişte eski veri kayıpsız taşınır. | Otomatik testle doğrulandı (birim ve uçtan uca) |
| **Dört yeni uyarı:** yinelenen kimlik; biletli durakta bilet ipucu yok; gezi boyunca etkinliğin tarihi geziyle kesişmiyor; keşfet tanıtımı 20 kelimeden kısa. | Otomatik testle doğrulandı |
| Örnek gezi sürüm 4. Bütün ipuçları, etkinlikler ve keşfet yerleri "ÖRNEK" etiketlidir. | Otomatik testle doğrulandı |
| **Plan kutusu:** cihaz anahtarı (kopyala, parmak izi); açılışta ve "Kutuyu denetle" ile okuma; "Yeni gezi" ve "Güncellendi" kartları; güncellemede işaretler korunur. Başka cihaza giden kayıt sessizce atlanır; bozuk ya da değiştirilmiş dosya reddedilir; ağ yoksa denetim sessizce atlanır. Açıklık notu var. | Otomatik testle doğrulandı (Chromium ve WebKit). **Gerçek kutudan gelişi yalnızca gerçek iPhone'da doğrulanabilir.** |
| `araclar/kutuya-koy.mjs` ve `KUTU.md`. Araçla şifrelenen plan uygulama koduyla açılıyor; yanlış anahtarla açılmıyor; tek baytı değişen dosya reddediliyor; dizinde ve dosya adlarında açık metin yok; özel anahtar yedekte ve günlükte yok. | Otomatik testle doğrulandı |
| **Yeni gezi iste:** form bir istek metni üretir. Metne cihazın parmak izi ve anahtarı, isterseniz kaydettiğiniz yerler eklenir. Paylaşım menüsüyle ya da kopyalanarak iletilir; ağ çağrısı yapılmaz. | Otomatik testle doğrulandı. **Paylaşım menüsü yalnızca gerçek iPhone'da doğrulanabilir.** |
| **İpuçları:** soru başlıklı kartlar, işaretlenebilir ve kalıcı adımlar, bağlantı, "Dinle". Bilet ipucu "Bilet al"ın hemen altındadır. Durak, mekan, etkinlik ve keşfet yerinde gösterilir. | Otomatik testle doğrulandı |
| **Gezi ipuçları sayfası:** türe göre gruplar; arama durak, mekan, etkinlik ve keşfet ipuçlarını da kapsar ve Türkçe harf farkını gözetmez. | Otomatik testle doğrulandı |
| **Doğru anda:** "yola çıkmadan" ipuçları Hazırlık listesinde, "varınca" olanlar Varış ekranında, "durakta" olanlar tur modunda varınca kart olarak çıkar. Kendiliğinden okunmaz. | Otomatik testle doğrulandı |
| **Uygulamayı tanıtan dört kart** (hazırla, Ana Ekran, ses, plan kutusu); kapatılır, Ayarlar'dan yeniden açılır. | Otomatik testle doğrulandı |
| **Etkinlikler sekmesi:** günlere göre akşam etkinlikleri ve "Gezi boyunca" başlığı. Süzgeçler: gün, tür, ücretsiz, rehberin seçimi, gündüz/akşam. Kartta görsel, tanıtım, süre, fiyat, bilet durumu, ipuçları, eylem düğmeleri, Gidiyorum ve Kaydet var. | Otomatik testle doğrulandı |
| **Çakışma denetimi:** "Gidiyorum" denen etkinlik SABİT satırla, yapılmış rezervasyonla (saat nottan) ya da başka seçili etkinlikle çakışırsa uyarı ve plan notu çıkar. Çok günlü etkinlik esnek sayılır. | Otomatik testle doğrulandı |
| **Bu akşam** (Bugün ekranı, 16:00 sonrası): seçilen etkinlik, geri sayım, mekana yol tarifi; seçim yoksa öneriler, rehberin seçimi başta. Etkinlik bitince "Otele dön" öne gelir. | Otomatik testle doğrulandı (saat sahtelenerek) |
| Gün haritasında etkinlik katmanı açılıp kapanır; gezi boyunca süren etkinlik doğru günlerde H1, H2 olarak görünür. | Otomatik testle doğrulandı |
| **Keşfet:** tür sekmeleri, liste ve harita, yakınlığa göre sıralama, açık-kapalı rozeti, fotoğraf, tanıtım ve "Dinle", ipuçları, eylem düğmeleri, kendi puanınız, "Google Haritalar'da aç". | Otomatik testle doğrulandı. **Konuma göre sıralama yalnızca gerçek iPhone'da doğrulanabilir.** |
| **Kaydet ve Kaydettiklerim:** durak, mekan, etkinlik, keşfet ve ansiklopedi yeri tek dokunuşla kaydedilir. Liste ve harita, her kayda not. | Otomatik testle doğrulandı |
| **Yakınımda:** çevredeki Vikipedi maddeleri (önce Türkçe, yetmezse İngilizce): ad, uzaklık, küçük resim, özet, kaynak ve lisans. "Rehber anlatımı değildir" notu var. Dinlenir, kaydedilir, rotaya eklenir. Yalnız çevrimiçi çalışır; çevrimdışıyken "İnternet gerekli" der. | Otomatik testle doğrulandı (sahte Vikipedi yanıtıyla). **Gerçek konum ve gerçek maddeler yalnızca gerçek iPhone'da doğrulanabilir.** |
| **Kendi yerini ekle:** haritaya dokunarak iğne koyulur, ad ve not girilir. Apple ya da Google Haritalar bağlantısı yapıştırılırsa koordinat bağlantıdan okunur. Adla arama OpenStreetMap Nominatim ile yapılır. | Bağlantıdan okuma otomatik testle doğrulandı. **Adla arama ve haritaya dokunarak iğne yalnızca gerçek iPhone'da doğrulanabilir.** |
| **Rotama ekle:** yer seçilen güne girer; keşfet yerinde önerilen gün önceden seçilidir. Uygulama en az ek yürüyüş getiren konumu bulur; SABİT saate geç kalınacak konumu seçmez; yerin açılış saatine bakar. Önizlemede şunlar görünür: hangi iki durağın arasına girdiği, ek yürüyüş, günün uzaması, kapalı gün/saat ve taşma uyarısı. | Otomatik testle doğrulandı (birim: SABİT satır, kapalı saat, taşan gün, en az yürüyüş; uçtan uca) |
| **Kişisel rota:** eklemeler planı değiştirmez. Numaralar, harita (eklenen yer kesik halkalı), tur modu, Bugün ve etap süreleri kişisel rotaya göredir; etap süreleri "yaklaşık"tır. Sıra yukarı/aşağı ile değiştirilir; eklenen yer kaldırılır; "Özgün plana dön" hepsini geri alır. | Otomatik testle doğrulandı |
| Plan güncellenince eklemeler korunur. Bağlandığı durak plandan çıkmışsa yer günün sonuna alınır ve bildirilir. Eklenen yer indirilen harita alanının dışındaysa "haritayı güncelle" önerilir. | İlk ikisi otomatik testle doğrulandı; harita alanı uyarısı kodda var, **gerçek bölgeyle yalnızca gerçek iPhone'da doğrulanabilir** |
| **Tur modunda eklenen yer:** keşfet yerinde tanıtım, ansiklopedi yerinde "Vikipedi'ye göre: …", kendi yerinizde yalnız ad ve not okunur. | Otomatik testle doğrulandı |
| **Plancıya gönder:** kaydedilen ve rotaya eklenen yerlerin listesi (ad, koordinat, gün, not) metin olarak paylaşılır. | Otomatik testle doğrulandı (panoya kopyalama yolu). **Paylaşım menüsü yalnızca gerçek iPhone'da doğrulanabilir.** |

Test sayıları: tip kontrolü geçti · birim 146/146 · uçtan uca 102/102 (51 test × iPhone 13 boyutunda Chromium ve WebKit; erişilebilirlik denetimi yeni ekranları da kapsıyor) · yayına karşı duman testi 10/10.

## 4. iPhone kontrol listesi 4

1. Ayarlar'daki Plan kutusu bölümünde cihaz anahtarı görünüyor ve kopyalanıyor.
2. Kutuya konan örnek gezi, uygulama açılınca "Yeni gezi" kartıyla geliyor. Bunun için önce 1. maddedeki anahtarı plan üreticisine verin; o da `KUTU.md`'ye göre bir gezi koysun.
3. Biletli bir durakta "Bileti nasıl alırım" ipucu adımlarıyla görünüyor (örnek gezi › 1. gün › 2. durak).
4. Etkinlikler sekmesinde süzgeçler çalışıyor; "Gidiyorum" denen etkinlik "Bu akşam" kartında çıkıyor. Kart yalnız gezi gününde ve 16:00'dan sonra çıkar. Örnek gezi Mayıs 2027'de olduğu için kendi gezinizde deneyin.
5. Keşfet'ten bir yer kaydediliyor ve bir güne eklenince rota numaraları güncelleniyor.
6. Haritada dokunarak eklenen yer rotaya giriyor; "Özgün plana dön" geri alıyor.
7. "Yakınımda" çevredeki yerleri kaynağıyla gösteriyor.
8. "Plancıya gönder" paylaşım menüsünü açıyor.

## 5. Kararlar (sorulmadan verilen)

- **Konum izni kuralı genişletildi** (CLAUDE.md değişmez kural 8). İzin, kullanıcı konum isteyen bir düğmeye dokununca istenir: tur modu, "Yakınıma göre sırala", "Yakınımda". İş emri bu iki özelliği istediği için eski "yalnız tur modunda" kuralı bu biçime getirildi. Uygulama kendiliğinden konum istemez.
- **CLAUDE.md'ye eklenen kurallar:** 2 (gerçek plan depoya yalnız şifreli kutu dosyası olarak girer), 16 (başka uygulamaların adı, logosu, metni, puanı, yorumu ve tasarımı kopyalanmaz) ve 17 (ipucu, etkinlik ve yer bilgisi uydurulmaz).
- **Sürükleyerek sıralama yerine yukarı/aşağı düğmeleri** kondu. Safari'de dokunmatik sürükle-bırak güvenilir değil; düğmeler parmakla da kolay.
- **Haritada "uzun basma" yerine dokunma:** kendi yerini eklerken haritaya bir kez dokunmak iğne koyar. Harita kütüphanesi uzun basmayı iPhone'da tutarlı bildirmiyor; form açıkken dokunuşun başka işi yok.
- **Adla arama** OpenStreetMap Nominatim ile yapılıyor; koşulları 13.11.2026'da okundu. Uygulama yalnız "Adla ara" düğmesine basınca tek istek yapar, otomatik tamamlama yapmaz. Saniyede en çok bir istek gönderir, sonucu 30 gün önbelleğe alır, atıf yazar. Tarayıcı istek kimliğini değiştiremez; site adresi Referer olarak gider, koşul bunu kabul ediyor.
- **Yakınımda:** Vikipedi'nin GeoData arayüzü kullanılıyor. Yarıçap 1 km, en çok 20 madde. Türkçe 3'ten azsa İngilizce eklenir. Tarayıcıdan `Api-User-Agent` başlığı gönderilir (Wikimedia'nın tarayıcı istemcilerine önerisi).
- **Plan kutusu dizininde gezi kimliği** açık yazılmaz; SHA-256 özeti yazılır. Kimlik tahmin edilebilirse (`viyana-2027-05`) özet denenerek eşleştirilebilir. `KUTU.md` buna karşı kimliğe rastgele ek koymayı önerir.
- **Kutu dosyaları** `public/kutu/` altında durur ve siteyle `kutu/` olarak yayımlanır. Açık anahtar listesi `kutu/anahtarlar.txt`'dedir ve yayımlanmaz. Kutu, service worker önbelleğine alınmaz; her denetimde ağdan okunur.
- **Yerleştirme ölçütü** en az ek yürüyüştür. SABİT saate geç kalınacak ya da yerin kapalı olduğu konumlar elenir. Hepsi elenirse en az yürüyüşlü konum uyarılarla önerilir. Günün başına eklenen yerin varış saati, ilk durağın saatinden geriye hesaplanır.
- **Kişisel rota gün tarihine bağlıdır.** Plan güncellemesinde tarih aynı kaldıkça korunur.
- **Gezi boyunca süren etkinlikler** (sergi, festival) çakışma denetimine girmez; esnek sayılır.
- **"Ücretsiz" süzgeci** fiyat metninde "ücretsiz", "free" ya da "bedava" arar. **"Gündüz"** 17:00'den önce başlayan etkinliktir.
- **Tanıtım kartlarının kapatılma durumu** yalnız bu cihazda tutulur (`localStorage`). Bir görünüm tercihidir, yedeğe girmesi gerekmez.
- **Kendi puanınız** var olan puan alanını kullanır. Başka sitelerin puanı ve yorumu çekilmez; kartta "Google Haritalar'da aç" bağlantısı vardır.

## 6. Yapılamayanlar ve sınırlar

- Etkinlikleri uygulamanın kendisinin araması yapılmadı; iş emrinde sonraya bırakılmış. Uygulama yalnız planla gelen etkinliği gösterir.
- Kutu denetimi yalnız uygulama açıkken çalışır; bildirim gönderilmez (kapsam dışı).
- Nominatim'in kullanım koşulu "mümkünse ara sunucu ve önbellek" önerir. Sunucumuz olmadığı için yalnız cihaz içi önbellek kullanılıyor; kişisel ve seyrek kullanım koşulun sınırları içinde kalıyor.
- Vikipedi'de koordinatı olmayan maddeler Yakınımda'da çıkmaz.
- Rotaya eklenen yer için "haritayı güncelle" önerisi, yalnız harita bölgesi indirilmiş gezide görünür.

## 7. Şema değişiklikleri

`plan.schema.json` sürüm 4, verdiğiniz dosyadır; uygulama tarafında değiştirilmedi. Sürüm 4 yalnız isteğe bağlı alan ekler; sürüm 1, 2 ve 3 dosyaları değişmeden geçerlidir.

## 8. Sonraki adım önerileri

- Etkinlikleri uygulamanın kendisinin araması.
- Başka kaynaklardan puan ve yorum (koşulları uygun ve ücretsiz bir kaynak bulunursa).
- Aynı geziyi birden çok kişiyle ortak kullanma. Plan kutusu ikinci cihaz anahtarını zaten destekliyor; ortak notlar gerekir.
- Masraf takibi ve kur çevirisi.
- İngilizce arayüz.
