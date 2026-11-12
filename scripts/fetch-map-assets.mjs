// Harita stilinin yazı tiplerini ve simgelerini Protomaps basemaps-assets deposundan indirip
// public/haritalar altına koyar (bir kez çalıştırılır, çıktı depoya girer). Böylece stil, yazı
// tipleri ve simgeler siteden gelir ve çevrimdışıyken service worker önbelleğinden okunur.
// Yazı tipi: Noto Sans (SIL Open Font License, fonts/OFL.txt). Simgeler: MIT lisanslı
// tangrams/icons türevi. Kaynak: github.com/protomaps/basemaps-assets (12.11.2026).
// Yalnız Latin, Latin genişletilmiş, Yunan, Kiril ve noktalama aralıkları alınır; başka aralık
// gereken yazı uygulamada boş kalır (src/map/regionStyle.ts boş yanıt verir).
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://protomaps.github.io/basemaps-assets';
export const FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
export const RANGES = ['0-255', '256-511', '768-1023', '1024-1279', '7680-7935', '8192-8447'];
const SPRITES = ['light.json', 'light.png', 'light@2x.json', 'light@2x.png'];

async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

let bytes = 0;
for (const f of FONTS) {
  mkdirSync(`public/haritalar/fonts/${f}`, { recursive: true });
  for (const rg of RANGES) {
    const b = await get(`${BASE}/fonts/${encodeURIComponent(f)}/${rg}.pbf`);
    writeFileSync(`public/haritalar/fonts/${f}/${rg}.pbf`, b);
    bytes += b.length;
  }
}
writeFileSync('public/haritalar/fonts/OFL.txt', await get(`${BASE}/fonts/OFL.txt`));
mkdirSync('public/haritalar/sprites', { recursive: true });
for (const s of SPRITES) {
  const b = await get(`${BASE}/sprites/v4/${s}`);
  writeFileSync(`public/haritalar/sprites/${s}`, b);
  bytes += b.length;
}
console.log(`yazı tipi ve simgeler: ${(bytes / 1e6).toFixed(2)} MB`);
