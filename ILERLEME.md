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

## Sırada

Sonraki geliştirmeler TESLIM.md bölüm 9'da.
