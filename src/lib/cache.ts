// Önbellek (IndexedDB 'cache' deposu): video adayları, galeri listeleri, hava tahmini, görsel
// dosyaları. Anahtar (YouTube) buraya yazılmaz.
import { db } from './store';

export interface CacheEntry<T> {
  key: string;
  t: number; // yazıldığı an (ms)
  data: T;
}

export async function cacheGet<T>(key: string): Promise<CacheEntry<T> | undefined> {
  try {
    return (await (await db()).get('cache', key)) as CacheEntry<T> | undefined;
  } catch {
    return undefined;
  }
}

export async function cachePut<T>(key: string, data: T): Promise<void> {
  try {
    await (await db()).put('cache', { key, t: Date.now(), data } satisfies CacheEntry<T>);
  } catch {
    /* depolama dolu ya da kapalı olabilir */
  }
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export function fresh(e: { t: number } | undefined, maxAgeMs: number, now = Date.now()): boolean {
  return !!e && now - e.t < maxAgeMs;
}

/** Görseli (CORS ile) indirip cihazda saklar; çevrimdışı galeride bu kopya gösterilir. */
export async function storeImage(url: string): Promise<boolean> {
  const have = await cacheGet<Blob>(`img:${url}`);
  if (have) return true;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return false;
    const b = await r.blob();
    if (!b.type.startsWith('image/')) return false;
    await cachePut(`img:${url}`, b);
    return true;
  } catch {
    // CORS izni olmayan kaynak: service worker önbelleğini ısıtmayı dene
    try {
      await fetch(url, { mode: 'no-cors' });
    } catch {
      /* yok say */
    }
    return false;
  }
}

export async function storedImage(url: string): Promise<Blob | null> {
  const e = await cacheGet<Blob>(`img:${url}`);
  return e?.data ?? null;
}
