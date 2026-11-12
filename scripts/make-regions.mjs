// Çevrimdışı harita bölgelerini üretir (GitHub Actions iş akışında, derlemeden sonra çalışır).
// Girdi: haritalar/bolgeler.json. Çıktı: <hedef>/haritalar/<id>.pmtiles ve <hedef>/haritalar/bolgeler.json
// (boyut, karo sayısı, derleme tarihi). Kaynak: Protomaps günlük derlemesinin en yenisi.
// Kullanım: node scripts/make-regions.mjs [hedef=dist] [--bbox=batı,güney,doğu,kuzey --id=x --ad=x --out=dosya]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractRegion } from './region-extract.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const target = args.find((a) => !a.startsWith('--')) ?? 'dist';

async function latestBuild() {
  const r = await fetch('https://build-metadata.protomaps.dev/builds.json');
  if (!r.ok) throw new Error(`derleme listesi okunamadı: ${r.status}`);
  const list = await r.json();
  const last = list.filter((b) => /^\d{8}\.pmtiles$/.test(b.key)).sort((a, b) => a.key.localeCompare(b.key)).at(-1);
  if (!last) throw new Error('derleme bulunamadı');
  return { url: `https://build.protomaps.com/${last.key}`, date: last.key.slice(0, 8), version: last.version };
}

const build = await latestBuild();
console.log(`Kaynak: ${build.url} (sürüm ${build.version})`);

// Tek bölge (geliştirme ve test verisi için)
if (opt.bbox) {
  const bbox = opt.bbox.split(',').map(Number);
  const r = await extractRegion(build.url, opt.out, { bbox, minzoom: Number(opt.minzoom ?? 0), maxzoom: Number(opt.maxzoom ?? 15) });
  console.log(`${opt.out}: ${r.tiles} karo, ${(r.bytes / 1e6).toFixed(1)} MB`);
  process.exit(0);
}

const conf = JSON.parse(readFileSync('haritalar/bolgeler.json', 'utf8'));
mkdirSync(join(target, 'haritalar'), { recursive: true });
const out = [];
for (const b of conf.bolgeler) {
  const file = `${b.id}.pmtiles`;
  console.log(`${b.ad}: ${b.bbox.join(', ')}, en çok ${b.maxzoom}. düzey`);
  const r = await extractRegion(build.url, join(target, 'haritalar', file), { bbox: b.bbox, maxzoom: b.maxzoom });
  console.log(`  ${r.tiles} karo, ${(r.bytes / 1e6).toFixed(1)} MB`);
  out.push({ id: b.id, ad: b.ad, bbox: b.bbox, minzoom: 0, maxzoom: r.maxzoom, dosya: file, bayt: r.bytes, karo: r.tiles, surum: build.date });
}
writeFileSync(join(target, 'haritalar', 'bolgeler.json'), JSON.stringify({ kaynak: 'Protomaps günlük derlemesi, OpenStreetMap verisi (ODbL)', derleme: build.date, bolgeler: out }, null, 2));
console.log('bolgeler.json yazıldı');
