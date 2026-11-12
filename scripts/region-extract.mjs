// Açık lisanslı dünya harita arşivinden (Protomaps günlük derlemesi, PMTiles; OpenStreetMap
// verisi, ODbL) bir dikdörtgenin karolarını çıkarıp tek dosyalık PMTiles arşivi yazar.
// Kaynak arşive aralıklı (Range) isteklerle erişilir; yalnız alanın karoları indirilir.
// Protomaps belgesi (docs.protomaps.com/basemaps/downloads, 12.11.2026): günlük derlemeler
// tarayıcıdan doğrudan kullanılmaz ("hotlinking ... discouraged"), bölge kesip kendi
// sunucunuza koymanız önerilir. Bu betik o yolu izler: iş akışında çalışır, çıktı siteyle yayımlanır.
import { PMTiles, FetchSource, zxyToTileId } from 'pmtiles';
import { gzipSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

/** Enlem/boylamdan karo numarası (Web Mercator). */
export function tileXY(lng, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

/** [batı, güney, doğu, kuzey] dikdörtgenini kapsayan karolar, minzoom..maxzoom. */
export function tilesInBbox([w, s, e, n], minzoom, maxzoom) {
  const out = [];
  for (let z = minzoom; z <= maxzoom; z++) {
    const a = tileXY(w, n, z);
    const b = tileXY(e, s, z);
    for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++) out.push({ z, x, y });
  }
  return out;
}

function varint(out, v) {
  // 2^53'e kadar güvenli (karo kimlikleri bu aralıkta)
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
}

/** PMTiles v3 dizini (sıkıştırılmadan önce). */
export function serializeDirectory(entries) {
  const b = [];
  varint(b, entries.length);
  let last = 0;
  for (const e of entries) {
    varint(b, e.tileId - last);
    last = e.tileId;
  }
  for (const e of entries) varint(b, e.runLength);
  for (const e of entries) varint(b, e.length);
  entries.forEach((e, i) => {
    if (i > 0 && e.offset === entries[i - 1].offset + entries[i - 1].length) varint(b, 0);
    else varint(b, e.offset + 1);
  });
  return Uint8Array.from(b);
}

function u64(view, off, v) {
  view.setUint32(off, v % 2 ** 32, true);
  view.setUint32(off + 4, Math.floor(v / 2 ** 32), true);
}

/** PMTiles v3 arşivi yazar. tiles: {z,x,y,data(Uint8Array, sıkıştırılmamış)}[] */
export function buildArchive(tiles, { bbox, minzoom, maxzoom, metadata, tileType = 1 }) {
  const enc = (d) => gzipSync(d);
  const list = tiles
    .map((t) => ({ tileId: zxyToTileId(t.z, t.x, t.y), data: enc(t.data) }))
    .sort((a, b) => a.tileId - b.tileId);
  let offset = 0;
  const entries = list.map((t) => {
    const e = { tileId: t.tileId, offset, length: t.data.length, runLength: 1 };
    offset += t.data.length;
    return e;
  });
  // Kök dizin ilk 16 KB'a sığmalı; sığmazsa yaprak dizinlere bölünür.
  let root = enc(serializeDirectory(entries));
  let leaves = new Uint8Array(0);
  if (127 + root.length > 16384) {
    for (let size = 4096; ; size *= 2) {
      const leafParts = [];
      const rootEntries = [];
      let lo = 0;
      for (let i = 0; i < entries.length; i += size) {
        const part = enc(serializeDirectory(entries.slice(i, i + size)));
        rootEntries.push({ tileId: entries[i].tileId, offset: lo, length: part.length, runLength: 0 });
        leafParts.push(part);
        lo += part.length;
      }
      root = enc(serializeDirectory(rootEntries));
      if (127 + root.length <= 16384) {
        leaves = Buffer.concat(leafParts);
        break;
      }
    }
  }
  const meta = enc(new TextEncoder().encode(JSON.stringify(metadata ?? {})));
  const tileData = Buffer.concat(list.map((t) => t.data));
  const header = new Uint8Array(127);
  const v = new DataView(header.buffer);
  header.set(new TextEncoder().encode('PMTiles'), 0);
  header[7] = 3;
  const rootOff = 127;
  const metaOff = rootOff + root.length;
  const leafOff = metaOff + meta.length;
  const dataOff = leafOff + leaves.length;
  u64(v, 8, rootOff);
  u64(v, 16, root.length);
  u64(v, 24, metaOff);
  u64(v, 32, meta.length);
  u64(v, 40, leafOff);
  u64(v, 48, leaves.length);
  u64(v, 56, dataOff);
  u64(v, 64, tileData.length);
  u64(v, 72, entries.length);
  u64(v, 80, entries.length);
  u64(v, 88, entries.length);
  header[96] = 1; // kümelenmiş
  header[97] = 2; // dizin sıkıştırma: gzip
  header[98] = 2; // karo sıkıştırma: gzip
  header[99] = tileType; // 1 = MVT
  header[100] = minzoom;
  header[101] = maxzoom;
  const e7 = (x) => Math.round(x * 1e7);
  v.setInt32(102, e7(bbox[0]), true);
  v.setInt32(106, e7(bbox[1]), true);
  v.setInt32(110, e7(bbox[2]), true);
  v.setInt32(114, e7(bbox[3]), true);
  header[118] = Math.min(maxzoom, 13);
  v.setInt32(119, e7((bbox[0] + bbox[2]) / 2), true);
  v.setInt32(123, e7((bbox[1] + bbox[3]) / 2), true);
  return Buffer.concat([header, root, meta, leaves, tileData]);
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        await fn(items[k], k);
      }
    }),
  );
}

/** Kaynak arşivden alanı çıkarır ve dosyaya yazar. Başarısız istek üç kez yeniden denenir. */
export async function extractRegion(sourceUrl, outFile, { bbox, minzoom = 0, maxzoom = 15, parallel = 8, log = console.log }) {
  const src = new PMTiles(new FetchSource(sourceUrl));
  const header = await src.getHeader();
  const max = Math.min(maxzoom, header.maxZoom);
  const metadata = await src.getMetadata();
  const want = tilesInBbox(bbox, minzoom, max);
  const got = [];
  let done = 0;
  await pool(want, parallel, async (t) => {
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await src.getZxy(t.z, t.x, t.y);
        if (r?.data) got.push({ ...t, data: new Uint8Array(r.data) });
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        await new Promise((ok) => setTimeout(ok, 1000 * attempt));
      }
    }
    if (++done % 200 === 0) log(`  ${done}/${want.length} karo`);
  });
  const buf = buildArchive(got, { bbox, minzoom, maxzoom: max, metadata: { ...metadata, tur_rehberi: { kaynak: sourceUrl, bbox } }, tileType: header.tileType });
  writeFileSync(outFile, buf);
  return { tiles: got.length, bytes: buf.length, maxzoom: max };
}
