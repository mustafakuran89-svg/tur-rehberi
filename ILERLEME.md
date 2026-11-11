# İlerleme

Son güncelleme: 11.11.2026

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
| G — Teslim | Sürüyor | |

B–F aynı oturumda birbirine bağlı yazıldığı için tek commit'te toplandı; her aşamanın testi ayrı ayrı yazıldı ve hepsi geçti.

### Test durumu (Geliştirme 2)

- Tip kontrolü: geçti.
- Birim testleri: 71/71.
- Uçtan uca: 56/56 (28 test × Chromium ve WebKit, iPhone 13 boyutu; erişilebilirlik denetimi açık ve koyu temada).
