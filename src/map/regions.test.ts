import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PMTiles } from 'pmtiles';
import sample from '../sample/ornek-plan.json';
import type { Trip } from '../plan/types';
import { bboxInside, countAreaTiles, inBbox, regionFor, tripArea } from './regions';
import { tripPoints } from '../lib/prepare';
import { needsRefresh, type OfflineStatus } from '../lib/offlineCheck';
// @ts-expect-error -- düz JS betiği (iş akışında da kullanılır)
import { buildArchive, serializeDirectory, tilesInBbox } from '../../scripts/region-extract.mjs';

const VIYANA = { id: 'viyana', bbox: [16.28, 48.1, 16.59, 48.23] as [number, number, number, number] };
const ORNEK = { id: 'ornek', bbox: [11.322, 44.466, 11.376, 44.514] as [number, number, number, number] };

describe('gezi alanı ve bölge seçimi', () => {
  it('gezi alanı noktaları ~1 km payla sarar', () => {
    const a = tripArea([{ lat: 48.2, lng: 16.37 }])!;
    expect(a[3] - a[1]).toBeCloseTo((2 * 1) / 111.32, 4);
    expect(a[2] - a[0]).toBeGreaterThan(a[3] - a[1]); // boylam payı kuzeyde daha geniş
    expect(tripArea([])).toBeNull();
  });
  it('örnek gezinin alanı test bölgesine sığar; Viyana bölgesi Viyana noktalarını kapsar', () => {
    const pts = tripPoints(structuredClone(sample) as Trip);
    expect(bboxInside(tripArea(pts)!, ORNEK.bbox)).toBe(true);
    expect(regionFor(pts, [VIYANA, ORNEK])?.id).toBe('ornek');
    expect(regionFor([{ lat: 48.2082, lng: 16.3738 }, { lat: 48.1845, lng: 16.3122 }], [ORNEK, VIYANA])?.id).toBe('viyana');
    // Viyana Havalimanı da bölge içinde (havalimanı-otel yolu)
    expect(inBbox(VIYANA.bbox, { lat: 48.1103, lng: 16.5697 })).toBe(true);
    expect(regionFor([{ lat: 41.0, lng: 29.0 }], [ORNEK, VIYANA])).toBeNull();
  });
});

describe('bölge arşivi (PMTiles v3)', () => {
  it('dikdörtgenin karoları düzey düzey', () => {
    const t = tilesInBbox(VIYANA.bbox, 0, 15);
    expect(t.filter((x: { z: number }) => x.z === 0)).toHaveLength(1);
    expect(t.length).toBe(817); // gerçek çıkarımla aynı sayı (12.11.2026: 817 karo, 24,1 MB)
  });
  it('yazılan arşiv kütüphaneyle geri okunur; dizin yaprağa bölünür', async () => {
    const tiles = tilesInBbox([11.33, 44.48, 11.36, 44.5], 10, 15).map((t: { z: number; x: number; y: number }) => ({ ...t, data: new TextEncoder().encode(`${t.z}/${t.x}/${t.y}`) }));
    const buf: Uint8Array = buildArchive(tiles, { bbox: [11.33, 44.48, 11.36, 44.5], minzoom: 10, maxzoom: 15, metadata: { name: 'test' } });
    const src = { getKey: () => 'k', getBytes: async (o: number, l: number) => ({ data: buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + l) as ArrayBuffer }) };
    const pm = new PMTiles(src);
    const h = await pm.getHeader();
    expect([h.minZoom, h.maxZoom, h.numAddressedTiles]).toEqual([10, 15, tiles.length]);
    const one = tiles.at(-1);
    const got = await pm.getZxy(one.z, one.x, one.y);
    expect(new TextDecoder().decode(got!.data)).toBe(`${one.z}/${one.x}/${one.y}`);
    expect(await pm.getMetadata()).toEqual({ name: 'test' });
    const c = await countAreaTiles(pm, [11.33, 44.48, 11.36, 44.5], 12, 15);
    expect(c.have).toBe(c.want);
    expect(serializeDirectory([{ tileId: 5, offset: 0, length: 3, runLength: 1 }])).toEqual(Uint8Array.from([1, 5, 1, 3, 1]));
  });
  it('gerçek örnek bölge dosyası (OpenStreetMap verisi) açılır ve gezi alanını kapsar', async () => {
    const buf = readFileSync('e2e/fixtures/ornek-bolge.pmtiles');
    const src = { getKey: () => 'f', getBytes: async (o: number, l: number) => ({ data: buf.buffer.slice(buf.byteOffset + o, buf.byteOffset + o + l) as ArrayBuffer }) };
    const pm = new PMTiles(src);
    const c = await countAreaTiles(pm, tripArea(tripPoints(structuredClone(sample) as Trip))!, 12, 15);
    expect(c.have).toBe(c.want);
    expect(c.have).toBeGreaterThan(30);
  });
});

describe('hazırlığı yenile hatırlatması', () => {
  const now = new Date('2026-11-12T10:00:00');
  const ok: OfflineStatus = { at: '2026-11-10T10:00:00Z', ready: true, lines: [] };
  it('başlangıca 2 gün ya da daha az kala, hazırlık eksik ya da eskiyse', () => {
    expect(needsRefresh('2026-11-14', '2026-11-16', null, now)).toBe(2);
    expect(needsRefresh('2026-11-15', '2026-11-16', null, now)).toBeNull(); // 3 gün var
    expect(needsRefresh('2026-11-13', '2026-11-16', ok, now)).toBeNull(); // hazır ve yeni
    expect(needsRefresh('2026-11-13', '2026-11-16', { ...ok, ready: false }, now)).toBe(1);
    expect(needsRefresh('2026-11-13', '2026-11-16', { ...ok, at: '2026-10-01T10:00:00Z' }, now)).toBe(1); // eski
    expect(needsRefresh('2026-11-10', '2026-11-13', null, now)).toBe(0); // gezi sürüyor
    expect(needsRefresh('2026-11-01', '2026-11-05', null, now)).toBeNull(); // bitti
  });
});
