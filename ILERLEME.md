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
| A — Veri katmanı | Sürüyor | |
| B — Durak ve mekan ekranı | Bekliyor | |
| C — Gezi günü asistanı | Bekliyor | |
| D — Kapıdan kapıya ve akşam | Bekliyor | |
| E — Gezi öncesi hazırlık | Bekliyor | |
| F — Cila ve güven | Bekliyor | |
| G — Teslim | Bekliyor | |
