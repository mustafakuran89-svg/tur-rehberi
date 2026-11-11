# Tur Rehberi (çalışma adı) — Ürün Tanımı

Sürüm 0.4 · 11.11.2026

Kapsam (karar, 11.11.2026): kişisel kullanım; Apple cihazlar; Safari'de bir bağlantıdan açılan web uygulaması. Mağaza, kurulum, ücretli servis ve üyelik yok.

## 1. Ürün fikri

Kullanıcı gideceği yeri ve tarihleri verir. O gezi için güncel kaynaklardan araştırılarak saat saat ama esnek bir plan üretilir; uygulama planı numaralı duraklı rota haritasında gösterir ve kullanıcı durağa yaklaştığında o durağın hikayesini sesli anlatır.

Planın omurgası yerel lezzetlerdir: her gün kahvaltı ve akşam için en az üç, öğle için bir ana bir yedek mekan önerilir. Plan cihaza kaydedildikten sonra metin ve ses internet olmadan da çalışır.

Planlama kurallarının tamamı `REHBER-PROMPTU.md` dosyasındadır. Bu belge uygulamanın kendisini tanımlar.

## 2. Örnek alınan uygulama ve farklar

Örnek alınan düzen, sesli yürüyüş turu uygulamalarının (Piri Guide gibi) düzenidir.

| Konu | Piri Guide | Bu uygulama |
|---|---|---|
| Biçim | Mağazadan kurulan yerel uygulama | Safari'de bağlantıdan açılan web uygulaması |
| Tur içeriği | Rehberlerin hazırladığı, önceden kaydedilmiş sabit turlar | Her gezi için araştırılıp üretilen plan |
| Harita | Rota ve duraklar harita üzerinde, konum takibiyle | Aynı düzen: ziyaret sırasına göre numaralı duraklar, aralarında rota |
| Anlatım | Konuma göre başlayan sesli hikaye | Aynı düzen, cihazın Türkçe sesiyle. Yalnızca ekran açıkken |
| Telefon cepteyken | Çalışır | Çalışmaz; ekran açık ve Safari önde olmalı |
| Çevrimdışı | Turlar önceden indirilir | Plan ve anlatımlar çevrimdışı çalışır. Harita altlığı internet ister |
| Planlayıcı | Yapay zeka destekli gezi planlayıcı | Plan Claude'da üretilir ve içe aktarılır; yemek odaklıdır |
| Ücret | Abonelik ve tur başına satın alma | Yok |

Piri'nin adı, logosu, tur metinleri, ses kayıtları ve ekran tasarımı kopyalanmaz. Yalnızca genel ürün fikri örnek alınır; uygulamanın kendi adı, kendi görsel dili ve kendi içeriği olur.

## 3. Kullanıcı akışı

1. **Plan üretimi.** Kullanıcı planı Claude'daki "Tur Programı" projesinde `uzman-tur-rehberi` skill'iyle ürettirir; yer, tarih ve tercihler orada konuşulur. Plan uygulamanın şemasına uygun `.json` dosyası olarak gelir.
2. **İçe aktarma.** Kullanıcı dosyayı iPhone'da Dosyalar'a kaydeder, uygulamada "Plan içe aktar" ile açar. Uygulama dosyayı doğrular, uyarıları gösterir ve planı cihaza kaydeder.
3. **Gezi öncesi.** Gezi özeti, günler, duraklar, yemek seçenekleri, ifadeler okunur; anlatımlar evde de dinlenebilir.
4. **Gezide.** "Turu başlat" ile tur modu açılır. Telefon elde ve ekran açıkken durağa yaklaşınca anlatım başlar. Yol tarifi gerekirse durağın "Haritalarda aç" bağlantısı Apple Haritalar'ı açar.
5. **Değişiklik.** Değişiklik Claude'da yaptırılır ve plan yeniden içe aktarılır; aynı kimlikli plan eskisinin yerini alır. Durak çıkarma ve sıra değiştirmenin uygulama içinde yapılması sonraya bırakılmıştır.

## 4. Ekranlar

| No | Ekran | İçerik |
|---|---|---|
| 1 | Gezilerim | Kayıtlı geziler, "Plan içe aktar" düğmesi |
| 2 | Gezi özeti | Gün gün tablo (tarih, bölge, tema), hava ve mevsim notu, varsayımlar, rezervasyon gerektirenler, yörenin tatları |
| 3 | Gün | Üstte numaralı rota haritası, altta saat saat akış, SABİT rozetleri, esneme payı notu |
| 4 | Durak | Anlatım metni, ses oynatıcı (oynat, duraklat, hız), tek satır pratik bilgi, "Haritalarda aç" |
| 5 | Yemek | Kahvaltı (K1, K2, K3), öğle (ana ve yedek), akşam (A1, A2, A3): ne yenir, fiyat düzeyi, rezervasyon, kapalı gün, kime uygun |
| 6 | Tur modu | Canlı konum, sıradaki durağa yön ve mesafe, yaklaşınca otomatik anlatım, "Dinle" düğmesi |
| 7 | İfadeler | Yerel dilde 15-20 ifade: yazılış, Türkçe okunuş, anlam, dokununca seslendirme |
| 8 | Pratik bilgiler | Ulaşım, para ve bahşiş, kapalı günler, acil numaralar, kaynaklar ve doğrulama tarihi |
| 9 | Ayarlar | Ses hızı, otomatik anlatım, yedeği dışa aktarma, verileri silme, geliştirici ayarları (konum simülasyonu, hata günlüğü) |

Harita kuralları:

- Duraklar 1, 2, 3 diye ziyaret sırasıyla numaralanır. Akıştaki, anlatımdaki ve haritadaki numara aynıdır.
- Rota çizgisi bu sırayla çizilir. Yürüyüş ve araç etapları farklı çizgi stiliyle ayrılır; etap üzerinde süre yazar ("8 dk yürüyüş").
- Kahvaltı ve akşam alternatifleri farklı renkte, harfli işaretlerle (K1-K3, A1-A3) gösterilir ve rota çizgisine dahil edilmez.
- Koordinatı olmayan yer haritaya konmaz; listede adresiyle yer alır.
- Her durak ve mekanda Apple Haritalar'da açan bağlantı bulunur.
- Harita altlığının atıf yazısı görünür durur.

## 5. Veri modeli

Bağlayıcı tanım `plan.schema.json` dosyasıdır; aşağıdaki taslak onun okunabilir özetidir. İkisi çelişirse şema geçerlidir. Şema dosyası tektir: uygulama ve Claude'daki "Tur Programı" projesi aynı dosyayı kullanır.

```ts
Trip {
  id, title, destinations[], startDate, endDate
  summary            // gezinin tek cümlelik özeti
  assumptions[]      // yapılan varsayımlar
  weatherNote        // hava ve mevsim, gün doğumu ve batımı
  reservations[]     // rezervasyon veya bilet gerektirenler
  cuisine: Dish[]    // imza yemekler: ne olduğu, nerede yenir
  days: Day[]
  intercity?: Leg[]  // çok şehirli gezide yol notları ve yol üstü duraklar
  phrases: PhraseList[]   // dil bölgesi başına bir liste
  practical          // ulaşım, para ve bahşiş, acil numaralar
  sources: Source[]
  verifiedAt         // saat ve fiyatların kontrol edildiği tarih
}

Day {
  date, title, theme, area
  timeline: TimelineItem[]   // saat veya aralık, başlık, ilgili durak ya da öğün; fixed: yalnızca saate bağlı satırlarda (bilet, gün batımı, son vapur)
  stops: Stop[]              // günde 4-6 ana durak
  breakfast: Venue[]         // en az 3
  lunch: { main: Venue, backup: Venue }
  dinner: Venue[]            // en az 3
  snacks: Venue[]            // kahve, tatlı, sokak lezzeti
  flex: { swappable, skipIfTired, ifExtraTime, ifRain }   // esneme payı
}

Stop {
  order                  // 1..n; numaranın tek kaynağı
  name, kind: 'main' | 'minor'
  lat, lng               // doğrulanamazsa null
  coordSource            // koordinatın kaynağı: yer arama, elle düzeltme
  address
  visitMinutes, openHours, closedDays, fee, ticketOrBooking, bestTime
  narration              // ana durakta 120-200 kelime, küçük durakta birkaç cümle
  practicalLine          // tek satır pratik bilgi
  legToNext: { mode: 'walk' | 'drive' | 'transit', minutes, approx: boolean }
  sources: Source[], verifiedAt
}

Venue {
  code                   // K1, K2, K3, A1, A2, A3, O1, O2, S1
  name, lat, lng, coordSource, address
  whatToEat[]            // 2-3 özgül öneri
  priceLevel, reservation, closedDays, queueNote
  suitsWhom              // kime uygun, bir cümle
  sources: Source[]      // en az 2 bağımsız kaynak
  verifiedAt
}

Phrase { original, script?, pronunciationTr, meaning, context }
Source { title, url }
```

## 6. Mimari

Sunucu yoktur. Uygulama statik dosyalardan oluşur ve ücretsiz bir barındırıcıdan yayımlanır; bütün veri cihazda durur.

### 6.1 İçe aktarma

```
Claude, "Tur Programı" projesi (uzman-tur-rehberi skill'i + şema dosyası)
   │   plan.json  →  iPhone'da Dosyalar
   ▼
Web uygulaması (Safari)
   1. Şema doğrulaması     Hata varsa hangi alan, neden
   2. Kural denetimi       Bölüm 6.2; geçmeyen madde uyarı olarak gösterilir
   3. Etap süreleri        Verilmemişse kuş uçuşu × 1,3 ve 4,5 km/sa, "yaklaşık"
   4. Kayıt                Tarayıcının yerel veritabanı
```

Araştırma ve mekan doğrulaması planı üreten Claude oturumunda yapılır; koordinatlar o oturumun yer arama aracından gelir, ezberden yazılmaz. Şema dosyası hazırdır ve "Tur Programı" projesinde de durur; uygulamadaki şema değişirse projedeki kopya da güncellenir.

### 6.2 Kural denetimi

Kodla yapılır. `src/plan/` altında durur ve her içe aktarmada çalışır.

- Her gün 4-6 ana durak; kahvaltı en az 3, akşam en az 3, öğle ana ve yedek.
- İfadeler 15-20 arasında; her birinde okunuş ve anlam var.
- Her yemek mekanında en az iki kaynak ve doğrulama tarihi var.
- Kapalı gününe denk gelen durak veya mekan yok.
- Ziyaret ve etap süreleri toplanınca gün tutuyor.
- Durak numaraları ardışık; akış, anlatım ve harita aynı numarayı kullanıyor.
- Koordinatlar günün bölgesiyle tutarlı; diğer duraklardan çok uzakta kalan nokta işaretlenir.

Denetimden geçmeyen madde planı reddetmez; ilgili ekranda uyarı olarak görünür. Kullanıcı planı Claude'da düzelttirip yeniden içe aktarabilir.

### 6.3 Yayın ve gizlilik

- Uygulama ücretsiz statik barındırmadan yayımlanır (aday: GitHub Pages). Ücretsiz planda depo ve site herkese açıktır.
- Depoda ve sitede kişisel veri, gerçek gezi planı ve gizli bilgi bulunmaz. Planlar yalnızca içe aktarıldıkları cihazda durur; bir cihazdaki plan diğerine kendiliğinden geçmez, dosyadan yeniden içe aktarılır.
- Uygulama hiçbir veriyi dışarı göndermez. Dış bağlantılar yalnızca harita altlığı ve kullanıcının dokunduğu Apple Haritalar bağlantılarıdır.

## 7. Tur modu

- Kullanıcı "Turu başlat" der. Bu dokunuşta konum izni istenir, ses kilidi açılır ve ekranın kapanması engellenir.
- Uygulama sıradaki durağa kuş uçuşu mesafeyi ve yönü gösterir.
- Durağın çevresindeki yarıçapa girilince (yürüyüşte yaklaşık 40 m, ayarlanabilir) anlatım bir kez otomatik başlar. Aynı durak tekrar tetiklenmez. Tarayıcı otomatik sesi engellerse ekranda büyük bir "Dinle" düğmesi çıkar.
- Her anlatım elle de başlatılabilir; oraya gitmeden evde dinlemek mümkündür.
- **Sınır:** Ekran kilitlenince veya Safari arka plana geçince konum ve ses durur. Geri dönülünce tur kaldığı yerden sürer, konum hemen yeniden değerlendirilir ve geçilen durak bildirilir.
- Pil: tur modunda ekran açık kalır. Koyu tema ve düşük parlaklık önerilir; uzun günlerde taşınabilir şarj gerekir.

## 8. Çevrimdışı kullanım

- Uygulama ilk açılışta cihaza önbelleklenir; sonraki açılışlar internet istemez.
- Planlar tarayıcının yerel veritabanında saklanır. Anlatımı cihazın kendi sesi okur; internet gerekmez.
- Konum uydudan alınır; internet gerekmez.
- Harita altlığı internet ister. Çevrimdışıyken duraklar ve rota boş zemin üzerinde görünür.
- Safari uzun süre açılmayan sitelerin verisini silebilir. Önlem: uygulama Ana Ekrana eklenir, kalıcı depolama istenir ve plan dosyaları Dosyalar'da saklanır; yeniden içe aktarma saniyeler sürer. Güncel kural Aşama 3'te teyit edilir ve teslim notuna yazılır.

## 9. Aşamalar

| Aşama | Konu | Çıktı |
|---|---|---|
| 0 | Ortam, iskelet ve yayın | Safari'de açılan boş uygulama |
| 1 | Plan modeli ve ekranlar | Örnek gezide gezinilebilen tüm ekranlar |
| 2 | Harita ve tur modu | Numaralı harita, yaklaşınca sesli anlatım |
| 3 | İçe aktarma ve çevrimdışı kullanım | Gerçek gezide kullanılabilir uygulama |
| 4 | Paketleme ve teslim | Yayın bağlantısı, `teslim` klasörü, `TESLIM.md` |

Aşamalar tek oturumda, kullanıcıya sorulmadan yürütülür. Ayrıntılar `ADIMLAR.md` dosyasındadır.

## 10. Maliyet

| Kalem | Ücret | Not |
|---|---|---|
| Barındırma | Yok | Ücretsiz statik barındırma; herkese açık depo |
| Harita altlığı | Yok | Anahtarsız, OpenStreetMap tabanlı ücretsiz servis |
| Sesli anlatım | Yok | Cihazın kendi sesi |
| Plan üretimi | Ek ücret yok | Mevcut Claude aboneliği içinde |
| Apple geliştirici üyeliği, mağaza | Gerekmez | Uygulama Safari'de açılır |

Ücret doğuracak her öneri (doğal seslendirme servisi, ücretli harita, sunucu) kapsam dışıdır.

## 11. Riskler ve kararlar

- **Kapalı veya var olmayan mekan önerisi.** En ağır hata budur. Önlem: planı üreten oturumda en az iki kaynakla doğrulama, doğrulama tarihinin ekranda gösterilmesi, "gitmeden teyit edin" notu.
- **Yanlış konumlanan durak.** Önlem: bölge tutarlılığı denetimi, iğneyi elle düzeltme, koordinatı olmayan yerin haritaya konmaması, her durakta Apple Haritalar bağlantısı.
- **Ekran kilitlenince tur durur.** Web uygulamasının kabul edilmiş sınırıdır. Arayüz bunu açıkça söyler; "Dinle" düğmesi ve geri dönünce yeniden değerlendirme bu yüzden vardır.
- **iOS'ta ses kilidi.** Sesli okuma kullanıcı dokunuşu olmadan başlamaz. Otomatik anlatımın gerçek iPhone'da çalıştığı, teslimden sonra kontrol listesiyle doğrulanır.
- **Verinin silinmesi.** Önlem bölüm 8'dedir.
- **Ücretsiz servislerin sürekliliği.** Harita altlığı ve barındırma ücretsiz ve garantisizdir. Önlem: altlık adresi tek ayar dosyasında, yayın düzeni başka bir barındırıcıya taşınabilir; harita gelmese de uygulama çalışır.
- **Mac yok.** iPhone Safari'sine hata ayıklayıcı bağlanamaz. Önlem: uygulama içi hata günlüğü ve bilgisayar tarayıcısında konum taklidi.
- **Karar (11.11.2026): kapsam.** Web uygulaması, ücretsiz, kurulumsuz. Cepte çalışan tur modu, uygulama içinden plan üretimi ve mağaza yayını kapsam dışı.
- **Açık karar: ad ve görsel kimlik.** "Tur Rehberi" çalışma adıdır.

## 12. Kaynaklar

Kontrol tarihi 11.11.2026. Koşullar değişir; ilgili aşamada yeniden teyit edilir.

- Piri Guide, App Store sayfası: https://apps.apple.com/app/id1095698831
- Webrazzi, Piri haberi (konum tabanlı sesli yönlendirme): https://webrazzi.com/2017/06/23/piri-80-bin-kullanici/
- GitHub Pages, ücretsiz planda herkese açık depo ve site: https://hostsmith.net/blog/github-pages-private/
- GitHub Pages sınırları: https://www.supadrop.host/blog/github-pages-limits/
- OpenFreeMap (ücretsiz, anahtarsız harita altlığı): https://openfreemap.org
- Ekranı açık tutma, iOS Safari desteği: https://progressier.com/pwa-capabilities/screen-wake-lock
- iOS Safari'de sesli okuma ve kullanıcı dokunuşu şartı: https://www.testmuai.com/learning-hub/speech-synthesis-api-browser-support/
- iOS'ta web uygulaması sınırları: https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
