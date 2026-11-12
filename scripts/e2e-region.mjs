// Uçtan uca testler için: gerçek OpenStreetMap verisinden çıkarılmış küçük örnek bölgeyi
// (e2e/fixtures/ornek-bolge.pmtiles) derlenmiş siteye bölge dosyası olarak koyar. Yayın
// iş akışında çalışmaz; yalnız playwright.config.ts içindeki test sunucusu kullanır.
import { copyFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';

mkdirSync('dist/haritalar', { recursive: true });
copyFileSync('e2e/fixtures/ornek-bolge.pmtiles', 'dist/haritalar/ornek.pmtiles');
const bayt = statSync('dist/haritalar/ornek.pmtiles').size;
writeFileSync(
  'dist/haritalar/bolgeler.json',
  JSON.stringify({ kaynak: 'test', derleme: '20261111', bolgeler: [{ id: 'ornek', ad: 'ÖRNEK Kent', bbox: [11.322, 44.466, 11.376, 44.514], minzoom: 12, maxzoom: 15, dosya: 'ornek.pmtiles', bayt, karo: 60, surum: '20261111' }] }),
);
console.log(`test bölgesi: ${bayt} bayt`);
