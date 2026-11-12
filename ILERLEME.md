# İlerleme

Son güncelleme: 11.11.2026 (Geliştirme 2 tamam)

| Aşama | Durum | Not |
|---|---|---|
| 0 — Ortam, iskelet, yayın | Tamam | Node 26.13.0 ve gh 2.103.3 taşınabilir; Vite + React + TS; `#` yönlendirme; Pages iş akışı; hata günlüğü paneli; CLAUDE.md "Komutlar". |
| 1 — Plan modeli ve ekranlar | Tamam | `src/plan/`, örnek gezi, 9 ekran, `src/i18n/tr.ts`. |
| 2 — Harita ve tur modu | Tamam | MapLibre + OpenFreeMap, SVG yedek harita, ses oynatıcı, tur modu, simülasyon, ifade seslendirme, Apple Haritalar. |
| 3 — İçe aktarma ve çevrimdışı | Tamam | Dosya/pano, Türkçe şema hataları, kural denetimi, etap hesabı, IndexedDB, yedek, service worker, manifest. |
| 4 — Paketleme ve teslim | Tamam | Yayın: https://mustafakuran89-svg.github.io/tur-rehberi/ · `teslim/` · `TESLIM.md`. |

## Test durumu (son koşu)

- Tip kontrolü: geçti.
- Birim testleri: 32/32.
- Uçtan uca: 30/30 (15 test × Chromium ve WebKit, iPhone 13 boyutu).
- Yayına karşı duman testi: 4/4.

## iPhone denemesi

11.11.2026: kontrol listesinin 6 maddesi gerçek iPhone'da sorunsuz.

## Geliştirme 2

İş emri: `GELISTIRME-2.md`. Geri dönüş noktası: `v1.0` etiketi (11.11.2026; tip kontrolü, 32 birim, 30 uçtan uca test geçti).

| Aşama | Durum | Not |
|---|---|---|
| Başlamadan | Tamam | Şema uzlaştırması: ilk sürümde şema değişmemişti; sürüm 2 dosyası doğrudan kondu. `v1.0` etiketi atıldı. |
| A — Veri katmanı | Tamam | Şema 2 tipleri, kullanıcı durumu ayrı depoda (`src/lib/userState.ts`), plan güncelleme özeti (`src/plan/diff.ts`), 6 yeni uyarı, zenginleştirilmiş örnek gezi. |
| B — Durak ve mekan ekranı | Tamam | Video kartı, kısa/uzun anlatım, hızlı bakış, galeri (Vikipedi/Commons), eylem düğmeleri, rezervasyon işareti, Michelin rozeti ve süzgeci. |
| C — Gezi günü asistanı | Tamam | Bugün ekranı, açık-kapalı rozeti, yakın/açık sıralama, geç kaldım, hava (Open-Meteo). |
| D — Kapıdan kapıya ve akşam | Tamam | Otel kartı, şoföre göster, otele dön, varış/dönüş ekranları, günün başı/sonu, akşam etkinlikleri. |
| E — Gezi öncesi hazırlık | Tamam | Geziyi hazırla, hazırlık listesi, günün videoları, takvim dosyası. |
| F — Cila ve güven | Tamam | `src/theme.css` tasarım değerleri, koyu tema, Dinamik Yazı, açılış ekranları, garsona göster, paylaş, gezi günlüğü, sürüm notları, erişilebilirlik denetimi. |
| G — Teslim | Tamam | Yayın: https://mustafakuran89-svg.github.io/tur-rehberi/ · yayına karşı duman testi 6/6 · `v2.0` etiketi · `teslim/` yenilendi · `TESLIM-2.md`. |

B–F aynı oturumda birbirine bağlı yazıldığı için tek commit'te toplandı; her aşamanın testi ayrı ayrı yazıldı ve hepsi geçti.

### Test durumu (Geliştirme 2)

- Tip kontrolü: geçti.
- Birim testleri: 71/71.
- Uçtan uca: 56/56 (28 test × Chromium ve WebKit, iPhone 13 boyutu; erişilebilirlik denetimi açık ve koyu temada).
- Yayına karşı duman testi: 6/6.

## Sırada

Gerçek iPhone'da `TESLIM-2.md` bölüm 4'teki 14 madde. Sonraki geliştirmeler `TESLIM-2.md` bölüm 9'da.

## Geliştirme 3

İş emri: `GELISTIRME-3.md`. Başlangıç noktası: `v2.0` etiketi (var; Geliştirme 2 baştan yapılmadı). Şema sürüm 3'e geçti (`plan.schema.json`, yalnız isteğe bağlı alanlar eklendi).

### Bildirilen çevrimdışı sorunun nedeni (otomatik testte yeniden üretildi)

Test: `e2e/repro-offline.spec.ts`, Chromium ve WebKit, v2.0 kodu. Gezi hazırlandı (OpenFreeMap sahte yanıtla), ağ kapatıldı. Sonuç her iki tarayıcıda aynı: hazırlık ekranı harita adımını "tamam" gösterdi, ama gün haritası altlıksız açıldı (`data-basemap="none"`). Durağa sabitlenmiş video, ağ yokken oynatıcıyı açtı (`video-frame` = 1); kart "İnternet gerekli" demedi.

Nedenler:

1. **Harita (asıl neden).** `src/map/glMap.ts` içindeki `loadStyle`, `navigator.onLine` yanlışsa harita stilini hiç istemiyor, doğrudan boş zemin kuruyordu. Hazırlıkta önbelleğe alınan stil, karolar ve yazı tipleri bu yüzden çevrimdışıyken hiç kullanılmıyordu. Hazırlık ekranı da karoları "indirildi" diye sayıp sonucu kendi okuyarak sınamıyordu.
2. **Harita (ikinci neden).** Önbellek yalnız OpenFreeMap'in o anki karo adresini tutuyordu: 12-15 yakınlaştırma, en çok 500 karo ve üç yazı tipi aralığı. Karo adresi sürümlüdür (her yeni OpenFreeMap derlemesinde değişir); stil ve kaynak tanımı da tarayıcı önbelleğinin ömrüne bağlıydı. Bu yüzden stil açılsa bile alanın bir kısmı boş kalacaktı. OpenFreeMap'in toplu indirme koşulundaki "özgün User-Agent" şartı tarayıcıdan karşılanamıyor.
3. **Video.** Video kartı ağ durumuna bakmadan YouTube oynatıcısını açıyordu; ağ yokken oynatıcı boş ya da hatalı görünüyordu.

Düzeltme bu nedenlere göre: harita stil, kaynak, karo, yazı tipi ve simgeleri cihazdaki bölge paketinden okur (Aşama D); hazırlık sonunda ağa çıkmadan kendini sınar; video kartı çevrimdışıyken oynatıcıyı açmaz.

| Aşama | Durum | Not |
|---|---|---|
| Başlamadan | Tamam | `v2.0` var. Sorun yeniden üretildi, neden yukarıda. TESLIM-2'den çıkan harita, video, ses maddeleri: harita önbelleği "yalnızca gerçek cihazda" ve "tamamı garanti değil"; video oynatıcıdan "başladı" bilgisi alınmıyor; ses yalnız cihazın Türkçe sesi, hız tek ayar. |
| A — Veri katmanı | Tamam | Şema 3 tipleri (video bölümü, `altNames`, `pronunciations`); 4 yeni uyarı; cihaz ayarları (anlatım uzunluğu, ses, hız, perde, kanal listesi, sonra izle) ve elle video başlangıcı; yedek dosyasına kullanıcı durumu ve ayarlar girdi (anahtar girmez); IndexedDB sürüm 3 (`regions` deposu); örnek gezi sürüm 3. Birim 81/81, uçtan uca 58/60 (iki WebKit çevrimdışı testi tam koşuda zaman aşımı, tek başına geçti; izleniyor). |
| B — Rehber kanalı ve bölüm videosu | Tamam | Öncelikli kanal listesi (başlangıç: Ayrıcalıklı Rotalar), kanal dizini (cihazda, 2.000 video, 30 günde bir), açıklamadan bölüm bulma, beş basamaklı sıralama, start/end ile bölüm oynatma, tamamını izle, başlangıcı ayarla (kalıcı), anahtarsız "Kanalda ara" ve "YouTube'da ara", "bu kanalı öncelikli yap", sonra izle. |
| C — Rehber anlatımı ve ses | Tamam | Kısa/Uzun anlatım anahtarı ve süre, kısaltılmış anlatım işareti, tur modunda rehber ağzı (`src/i18n/guide.ts`), Ses bölümü (Türkçe sesler, örnek dinle, üç ton, hız ve perde), cümle cümle okuma (önceki/sonraki, duraklat/sürdür), okunuş sözlüğü, çevrimdışıyken cihazdaki sese düşme. Birim 111/111; v3 uçtan uca 16/16; bütün takım 72/76 (kalan dört: tur testi yeni karşılama cümlesine uyarlandı, yeniden üretim testi düzeltme sonrası emekliye ayrıldı). |
