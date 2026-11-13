# İlerleme

Son güncelleme: 13.11.2026 (Geliştirme 4 tamam)

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

## Sırada (Geliştirme 2 sonrası)

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
| D — Tam çevrimdışı | Tamam | Harita için üçüncü basamak (depoda üretilen bölge paketi; ilk bölge Viyana, 817 karo, 24,1 MB). Bölge dosyası parça parça iner, Cache Storage'da durur; harita stil, yazı tipi ve simgelerle ağsız açılır; alan dışı notu; 15. düzeyin ötesinde büyütme. Çevrimdışı hazır denetimi ve gezi kartı rozeti, hatırlatma kartı, Safari/Ana Ekran ayrımı, kalıcı depolama, soğuk açılışta son gezi, çevrimdışı video kartı ve sonra izle. Testte bulunan iki ek hata düzeltildi: opak görsel önbelleği fotoğraf kaydını bozuyordu; WebKit MapLibre işçi betiğini ağdan istiyordu. Birim 117/117; uçtan uca 78/78 (bütün takım; düzeltilen iki test ayrıca koşturuldu). |
| E — Teslim | Tamam | Yayın: https://mustafakuran89-svg.github.io/tur-rehberi/ (Viyana bölgesi iş akışında üretildi, 817 karo, 24,1 MB) · yayına karşı duman testi 8/8 · gerçek Viyana dosyasıyla canlı deneme 2/2 · `v3.0` etiketi · `teslim/` yenilendi · `TESLIM-3.md`. Yayında bulunan: GitHub Pages sıkıştırma kabul edilince aralığı sıkıştırılmış veriye göre veriyor; tarayıcılar aralıklı istekte sıkıştırmayı kapattığı için sorun yok, yine de indirme bunu denetler ve gerekirse tek parça iner. |

### Test durumu (Geliştirme 3)

- Tip kontrolü: geçti.
- Birim testleri: 117/117.
- Uçtan uca: 80/80 (40 test × Chromium ve WebKit, iPhone 13 boyutu).
- Yayına karşı duman testi: 8/8; gerçek Viyana bölgesiyle canlı deneme 2/2.

## Sırada (Geliştirme 3 sonrası)

Gerçek iPhone'da `TESLIM-3.md` bölüm 8'deki 8 madde.

## Geliştirme 4

İş emri: `GELISTIRME-4.md`. Başlangıç noktası: `v3.0` etiketi (var). Şema sürüm 4'e geçti (yalnız isteğe bağlı alanlar). Çevrimdışı harita yolu: depoda üretilen bölge paketi (`haritalar/bolgeler.json`, TESLIM-3 bölüm 4); plan kutusu aracı yeni gezinin alanını bu listeye ekler, Keşfet ve rotaya eklenen yer bu alana göre denetlenir.

| Aşama | Durum | Not |
|---|---|---|
| Başlamadan | Tamam | `v3.0` var; testler geçiyordu (117 birim, 80 uçtan uca). |
| A — Veri katmanı | Tamam | Şema 4 tipleri (ipucu, keşfet, gezi boyunca etkinlikler, kalıcı kimlik); kimlikli kayıtta işaretler kimliğe bağlanır, eski (ada bağlı) veri kayıpsız taşınır (`migrateKeys`); 4 yeni uyarı; örnek gezi sürüm 4. Kişisel rota katmanı ve kutu şifrelemesi de bu aşamada kodlandı (testleri B ve E'de). Birim 130/130, uçtan uca 80/80 + 2. |
| B — Plan kutusu | Tamam | Cihaz anahtarı (ECDH P-256, dışa aktarılamaz, IndexedDB `keys`), Ayarlar › Plan kutusu (kopyala, parmak izi, kutuyu denetle, açıklık notu), açılışta denetim, "Yeni gezi"/"Güncellendi" kartları, bozuk dosya reddi, `araclar/kutuya-koy.mjs` (yerleşik kitaplıklar, şema doğrulayıcı, bölge ekleme, `--kaldir`), `KUTU.md`, yeni gezi iste formu. Node ve tarayıcı aynı zarfı açıyor; WebKit'te de geçti. |
| C — İpuçları | Tamam | İpucu kartları (soru başlığı, işaretlenebilir ve kalıcı adımlar, bağlantı, dinle); bilet ipucu "Bilet al"ın altında; gezi ipuçları sayfası (türe göre, arama durak ipuçlarını da kapsar); `before-trip` Hazırlık listesinde, `on-arrival` Varış'ta, `on-site` tur modunda varınca; tanıtım kartları (kapat, Ayarlar'dan yeniden aç). |
| D — Etkinlikler | Tamam | Etkinlikler sekmesi (gün, tür, ücretsiz, rehberin seçimi, gündüz/akşam süzgeçleri; gezi boyunca başlığı), genişletilmiş kart (görsel, tanıtım, süre, bilet durumu, ipuçları, kaydet), çakışma denetimi (SABİT satır, rezervasyon, seçili etkinlik), Bugün'de "Bu akşam" ve etkinlik sonrası "Otele dön", haritada etkinlik katmanı. |
| E — Keşfet, kaydet, rotama ekle | Tamam | Keşfet (sekmeler, liste/harita, yakınlık, açık-kapalı, dinle, ipuçları, puanım, Google Haritalar), kaydet ve Kaydettiklerim (not, harita), Yakınımda (Vikipedi GeoData, kaynak ve lisans, çevrimdışı "internet gerekli"), kendi yerim (haritaya dokun, bağlantı, Nominatim ile adla arama), Rotama ekle (en az yürüyüş, SABİT, açılış saati, önizleme ve uyarılar), kişisel rota katmanı (numara, harita, tur, Bugün; yukarı/aşağı, kaldır, özgün plana dön; plan güncellemesinde korunur, bağı kopan yer sona), tur modunda kaynağa göre okuma, plancıya gönder. Erişilebilirlik denetimi yeni ekranları da kapsıyor (koyu temada rozet kontrastı düzeltildi). Birim 146/146, uçtan uca 104/104. |
| F — Teslim | Tamam | Yayın: https://mustafakuran89-svg.github.io/tur-rehberi/ (kutu dizini sitede) · yayına karşı duman testi 10/10 · `v4.0` etiketi · `teslim/` yenilendi · `TESLIM-4.md`, `KUTU.md`. |

### Test durumu (Geliştirme 4)

- Tip kontrolü: geçti.
- Birim testleri: 146/146.
- Uçtan uca: 102/102 (51 test × Chromium ve WebKit, iPhone 13 boyutu). Not: yavaşlamış makinede bir tam koşuda altı test zaman aşımına düştü, tek başına geçti; erişilebilirlik testinin süresi 16 ekran için 180 sn'ye çıkarıldı; son tam koşu temiz.
- Yayına karşı duman testi: 10/10.

## Sırada (Geliştirme 4 sonrası)

- Kullanıcının cihaz anahtarı `kutu/anahtarlar.txt`'ye eklenecek (kullanıcı Ayarlar › Plan kutusu › Kopyala ile verecek).
- Gerçek iPhone'da `TESLIM-4.md` bölüm 4'teki 8 madde.
