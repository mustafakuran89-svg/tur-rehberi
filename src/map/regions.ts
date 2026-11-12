// Çevrimdışı harita bölgeleri (Geliştirme 3, Aşama D; seçilen yol: üçüncü basamak, depoda üretilen
// bölge paketi). Depodaki iş akışı haritalar/bolgeler.json içindeki alanlar için açık lisanslı
// dünya arşivinden (Protomaps, OpenStreetMap verisi) bölge dosyası çıkarır ve siteyle yayımlar.
// Uygulama gezi alanını kapsayan dosyayı indirip cihazda (Cache Storage) saklar; harita bu dosyadan
// açılır. Stil kodda üretilir; yazı tipleri ve simgeler siteden gelir ve service worker önbelleğindedir.
import { PMTiles, FileSource } from 'pmtiles';
import type { LatLng } from '../lib/geo';
import { cacheGet, cachePut } from '../lib/cache';
import { db } from '../lib/store';

export interface Region {
  id: string;
  ad: string;
  bbox: [number, number, number, number]; // batı, güney, doğu, kuzey
  minzoom: number;
  maxzoom: number;
  dosya: string;
  bayt: number;
  karo: number;
  surum: string; // kaynak derleme tarihi (YYYYAAGG)
}
export interface RegionManifest {
  kaynak: string;
  derleme: string;
  bolgeler: Region[];
}
export interface SavedRegion {
  id: string;
  surum: string;
  bayt: number;
  karo: number;
  bbox: Region['bbox'];
  maxzoom: number;
  ad: string;
  url: string; // Cache Storage anahtarı
  savedAt: string;
}

const BASE = import.meta.env.BASE_URL;
export const REGION_CACHE = 'tur-harita-bolge';
export const PAD_KM = 1; // gezi alanının çevresindeki pay
export const CHUNK = 2 * 1024 * 1024; // indirme parçası
export const RETRIES = 3;

const siteUrl = (p: string) => new URL(`${BASE}${p}`, location.origin).toString();
export const manifestUrl = () => siteUrl('haritalar/bolgeler.json');
export const regionUrl = (r: Pick<Region, 'dosya' | 'surum'>) => siteUrl(`haritalar/${r.dosya}?v=${r.surum}`);

/** Bölge listesi: önce ağdan (yeni derleme), olmazsa cihazdaki son kopya. */
export async function getManifest(): Promise<RegionManifest | null> {
  if (navigator.onLine) {
    try {
      const r = await fetch(manifestUrl(), { cache: 'no-cache' });
      if (r.ok) {
        const m = (await r.json()) as RegionManifest;
        if (Array.isArray(m.bolgeler)) {
          await cachePut('regions:manifest', m);
          return m;
        }
      }
    } catch {
      /* çevrimdışı ya da yok */
    }
  }
  return (await cacheGet<RegionManifest>('regions:manifest'))?.data ?? null;
}

/** Noktaları saran dikdörtgen ve çevresinde pay (km). */
export function tripArea(points: LatLng[], padKm = PAD_KM): Region['bbox'] | null {
  if (!points.length) return null;
  const lat = points.map((p) => p.lat);
  const lng = points.map((p) => p.lng);
  const midLat = (Math.max(...lat) + Math.min(...lat)) / 2;
  const dLat = padKm / 111.32;
  const dLng = padKm / (111.32 * Math.cos((midLat * Math.PI) / 180));
  return [Math.min(...lng) - dLng, Math.min(...lat) - dLat, Math.max(...lng) + dLng, Math.max(...lat) + dLat];
}

export const inBbox = (b: Region['bbox'], p: LatLng) => p.lng >= b[0] && p.lng <= b[2] && p.lat >= b[1] && p.lat <= b[3];
export const bboxInside = (inner: Region['bbox'], outer: Region['bbox']) => inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];

/** Gezinin bütün noktalarını kapsayan bölge (gezi alanı bölgeye sığmalı; pay taşarsa noktalar yeter). */
export function regionFor<T extends { bbox: Region['bbox'] }>(points: LatLng[], regions: T[]): T | null {
  if (!points.length) return null;
  const area = tripArea(points)!;
  return regions.find((r) => bboxInside(area, r.bbox)) ?? regions.find((r) => points.every((p) => inBbox(r.bbox, p))) ?? null;
}

export async function savedRegions(): Promise<SavedRegion[]> {
  try {
    return ((await (await db()).getAll('regions')) as SavedRegion[]) ?? [];
  } catch {
    return [];
  }
}

/** Cihazda kayıtlı ve dosyası yerinde olan bölge. */
export async function savedRegionFor(points: LatLng[]): Promise<SavedRegion | null> {
  const all = await savedRegions();
  // Önce bütün noktaları kapsayan bölge; yoksa (ör. havalimanı yolu) noktaların çoğunu kapsayan
  const r = regionFor(points, all) ?? all.find((x) => points.filter((p) => inBbox(x.bbox, p)).length * 2 >= points.length && points.length > 0) ?? null;
  if (!r) return null;
  try {
    const c = await caches.open(REGION_CACHE);
    return (await c.match(r.url)) ? r : null;
  } catch {
    return null;
  }
}

export interface DownloadProgress {
  done: number; // bayt
  total: number;
}

async function fetchRange(url: string, from: number, to: number): Promise<ArrayBuffer> {
  let last: unknown;
  for (let i = 1; i <= RETRIES; i++) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${from}-${to}` } });
      if (r.status === 206) return await r.arrayBuffer();
      if (r.ok) throw new Error('aralıklı istek desteklenmiyor');
      throw new Error(`yanıt ${r.status}`);
    } catch (e) {
      last = e;
      if ((e as Error).message === 'aralıklı istek desteklenmiyor') throw e;
      await new Promise((ok) => setTimeout(ok, 600 * i));
    }
  }
  throw last;
}

/**
 * Bölge dosyasını indirir: parçalar sıraya konur, en çok 2 parça aynı anda, başarısız parça üç kez
 * yeniden denenir, ilerleme bildirilir. Sunucu aralıklı isteği desteklemezse dosya tek parça iner.
 */
export async function downloadRegion(r: Region, onProgress: (p: DownloadProgress) => void): Promise<SavedRegion> {
  const url = regionUrl(r);
  const total = r.bayt;
  const parts: ArrayBuffer[] = [];
  let done = 0;
  try {
    const ranges: [number, number][] = [];
    for (let s = 0; s < total; s += CHUNK) ranges.push([s, Math.min(total, s + CHUNK) - 1]);
    let next = 0;
    await Promise.all(
      [0, 1].map(async () => {
        while (next < ranges.length) {
          const k = next++;
          parts[k] = await fetchRange(url, ranges[k][0], ranges[k][1]);
          done += parts[k].byteLength;
          onProgress({ done, total });
        }
      }),
    );
  } catch (e) {
    if ((e as Error).message !== 'aralıklı istek desteklenmiyor') throw e;
    parts.length = 0;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`yanıt ${res.status}`);
    parts.push(await res.arrayBuffer());
    onProgress({ done: total, total });
  }
  const blob = new Blob(parts, { type: 'application/octet-stream' });
  if (blob.size !== total) throw new Error(`eksik dosya: ${blob.size}/${total}`);
  const c = await caches.open(REGION_CACHE);
  // Aynı bölgenin eski sürümleri silinir
  for (const k of await c.keys()) if (k.url.includes(`/haritalar/${r.dosya}`) && k.url !== url) await c.delete(k);
  await c.put(url, new Response(blob, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(total) } }));
  const saved: SavedRegion = { id: r.id, surum: r.surum, bayt: total, karo: r.karo, bbox: r.bbox, maxzoom: r.maxzoom, ad: r.ad, url, savedAt: new Date().toISOString() };
  await (await db()).put('regions', saved);
  archives.delete(r.id);
  return saved;
}

const archives = new Map<string, Promise<PMTiles | null>>();

/** Cihazdaki bölge dosyasını açar (ağa çıkmaz). */
export function openArchive(s: SavedRegion): Promise<PMTiles | null> {
  let p = archives.get(s.id);
  if (!p) {
    p = (async () => {
      const c = await caches.open(REGION_CACHE);
      const res = await c.match(s.url);
      if (!res) return null;
      const blob = await res.blob();
      return new PMTiles(new FileSource(new File([blob], `bolge-${s.id}-${s.surum}`)));
    })().catch(() => null);
    archives.set(s.id, p);
  }
  return p;
}

/** Bölge dosyasında bu alanın karolarından kaçı var (ağa çıkmadan; hazır denetimi için). */
export async function countAreaTiles(pm: PMTiles, area: Region['bbox'], minzoom: number, maxzoom: number): Promise<{ have: number; want: number }> {
  let have = 0;
  let want = 0;
  for (let z = minzoom; z <= maxzoom; z++) {
    const a = lngLatTile(area[0], area[3], z);
    const b = lngLatTile(area[2], area[1], z);
    for (let x = a.x; x <= b.x; x++)
      for (let y = a.y; y <= b.y; y++) {
        want++;
        try {
          if (await pm.getZxy(z, x, y)) have++;
        } catch {
          /* yok */
        }
      }
  }
  return { have, want };
}

export function lngLatTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}
