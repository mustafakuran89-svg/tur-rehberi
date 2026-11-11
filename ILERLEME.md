# İlerleme

Son güncelleme: 11.11.2026

| Aşama | Durum | Not |
|---|---|---|
| 0 — Ortam, iskelet, yayın | Kısmen | Node 26.13.0 (LTS) ve gh 2.103.3 taşınabilir kuruldu; Vite + React + TS iskeleti, `#` yönlendirme, `.gitignore`, git, Pages iş akışı (`.github/workflows/pages.yml`), hata günlüğü paneli, CLAUDE.md "Komutlar" tamam. **GitHub oturumu henüz açılmadı** → depo ve yayın en sona kaldı. |
| 1 — Plan modeli ve ekranlar | Tamam | `src/plan/` tipler + Ajv doğrulayıcı (kökteki şemayı derler), örnek gezi (`src/sample/ornek-plan.json`, `scripts/make-sample.mjs`), 9 ekran, tek çeviri dosyası `src/i18n/tr.ts`. |
| 2 — Harita ve tur modu | Tamam | MapLibre GL 6.17 + OpenFreeMap Liberty; WebGL/altlık yoksa SVG yedek harita. Ses oynatıcı, tur modu (konum, ses kilidi, ekranı açık tutma, Dinle düğmesi, arka plandan dönüş), simülasyon, ifade seslendirme, Apple Haritalar bağlantıları. |
| 3 — İçe aktarma ve çevrimdışı | Tamam | Dosya/pano içe aktarma, Türkçe şema hataları, kural denetimi, etap süresi hesabı, IndexedDB + kalıcı depolama, yedek dışa aktarma, aynı kimlikte onay, service worker (otomatik güncelleme), manifest ve simgeler, iğneyi elle düzeltme. |
| 4 — Paketleme ve teslim | Bekliyor | GitHub oturumu gerekli. |

## Test durumu (son koşu)

- Tip kontrolü: geçti (`npm run typecheck`).
- Birim testleri: 32/32 geçti (`npm test`).
- Uçtan uca: 30/30 geçti (15 test × iPhone 13 boyutu, Chromium ve WebKit) (`npm run e2e`).

## Sırada

1. `gh auth login` tamamlanınca: herkese açık `tur-rehberi` deposu, Pages (build_type: workflow), ilk gönderim.
2. Yayın adresinin yanıt verdiğini doğrula; `npm run e2e:live`.
3. `teslim/` klasörü, `TESLIM.md`, son commit ve gönderim.
