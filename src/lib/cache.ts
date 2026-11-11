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

export async function cachePut<T>(key: string, data: T): Promise<boolean> {
  try {
    await (await db()).put('cache', { key, t: Date.now(), data } satisfies CacheEntry<T>);
    return true;
  } catch {
    return false; // depolama dolu ya da kapalı olabilir
  }
}

// Görsel, Blob yerine bayt dizisi olarak saklanır: bazı Safari kiplerinde IndexedDB Blob kabul etmez.
interface StoredBytes {
  type: string;
  buf: ArrayBuffer;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export function fresh(e: { t: number } | undefined, maxAgeMs: number, now = Date.now()): boolean {
  return !!e && now - e.t < maxAgeMs;
}

/** Görseli (CORS ile) indirip cihazda saklar; çevrimdışı galeride bu kopya gösterilir. */
export async function storeImage(url: string): Promise<boolean> {
  const have = await cacheGet<StoredBytes>(`img:${url}`);
  if (have) return true;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) return false;
    const b = await r.blob();
    if (!b.type.startsWith('image/')) return false;
    return await cachePut<StoredBytes>(`img:${url}`, { type: b.type, buf: await b.arrayBuffer() });
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
  const e = await cacheGet<StoredBytes>(`img:${url}`);
  return e?.data?.buf ? new Blob([e.data.buf], { type: e.data.type }) : null;
}
