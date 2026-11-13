// Plan kutusu (Geliştirme 4, Aşama B): plan üreticisi şifreli planı sitedeki kutu/ klasörüne koyar;
// uygulama açılışta ve "Kutuyu denetle" ile kutu/index.json'u önbelleği atlayarak okur, bu cihaza
// şifrelenmiş ve daha yeni olan kayıtları indirir, açar, şemaya göre doğrular ve içe aktarır.
// Cihazın özel anahtarı IndexedDB'de dışa aktarılamaz CryptoKey olarak durur; yedeğe, paylaşım
// dosyasına ve günlüğe girmez.
import { db, getTrip, saveImported } from './store';
import { cacheGet, cachePut } from './cache';
import { addLog } from './log';
import { processImportData } from '../plan/importPlan';
import { diffPlans, diffIsEmpty, type PlanDiff } from '../plan/diff';
import { BoxError, type Bytes, encodePublicKey, fingerprint, fpDisplay, newDeviceKey, open, type BoxIndex, type Envelope } from './boxCrypto';

export interface DeviceKey {
  id: 'device';
  priv: CryptoKey;
  pubRaw: Bytes;
  createdAt: string;
}

const HAD_KEY = 'tur-rehberi:had-key';
let fresh = false; // anahtar bu oturumda mı üretildi
let keyP: Promise<DeviceKey | null> | null = null;

export function boxSupported(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle && typeof DecompressionStream !== 'undefined' && typeof indexedDB !== 'undefined';
}

/** Cihaz anahtarı; yoksa üretilir. */
export function deviceKey(): Promise<DeviceKey | null> {
  if (!boxSupported()) return Promise.resolve(null);
  keyP ??= (async () => {
    const d = await db();
    const have = (await d.get('keys', 'device')) as DeviceKey | undefined;
    if (have?.priv && have.pubRaw) return { ...have, pubRaw: new Uint8Array(have.pubRaw) };
    const k = await newDeviceKey();
    const rec: DeviceKey = { id: 'device', priv: k.priv, pubRaw: k.pubRaw, createdAt: new Date().toISOString() };
    await d.put('keys', rec);
    fresh = true;
    return rec;
  })().catch((e) => {
    addLog('info', `Cihaz anahtarı: ${(e as Error).name}`);
    keyP = null;
    return null;
  });
  return keyP;
}

export interface DeviceKeyInfo {
  text: string; // tur-rehberi-anahtar:v1:…
  fp: string;
  fpShown: string;
  createdAt: string;
  regenerated: boolean; // site verisi silindiği için yeniden üretildi
}

export async function deviceKeyInfo(): Promise<DeviceKeyInfo | null> {
  const k = await deviceKey();
  if (!k) return null;
  let had = false;
  try {
    had = localStorage.getItem(HAD_KEY) !== null && localStorage.getItem(HAD_KEY) !== (await fingerprint(k.pubRaw));
    localStorage.setItem(HAD_KEY, await fingerprint(k.pubRaw));
  } catch {
    /* yok say */
  }
  const fp = await fingerprint(k.pubRaw);
  return { text: encodePublicKey(k.pubRaw), fp, fpShown: fpDisplay(fp), createdAt: k.createdAt, regenerated: had || (fresh && (await hadTrips())) };
}

async function hadTrips(): Promise<boolean> {
  try {
    return ((await (await db()).getAllKeys('trips')) as string[]).some((k) => k !== '__ornek__');
  } catch {
    return false;
  }
}

const BASE = import.meta.env.BASE_URL;
export const boxUrl = (p: string) => new URL(`${BASE}kutu/${p}`, location.origin).toString();

export interface BoxEvent {
  kind: 'new' | 'updated';
  tripId: string;
  title: string;
  at: string;
  diff?: { added: number; removed: number; timeChanged: number; empty: boolean };
}
export interface BoxResult {
  state: 'offline' | 'ok' | 'fail' | 'unsupported';
  events: BoxEvent[];
  errors: ('bad' | 'invalid')[];
  index: BoxIndex | null;
}

const SEEN = 'kutu:seen';
const EVENTS = 'kutu:events';

export async function boxEvents(): Promise<BoxEvent[]> {
  return (await cacheGet<BoxEvent[]>(EVENTS))?.data ?? [];
}
export async function dismissBoxEvent(tripId: string): Promise<void> {
  await cachePut(EVENTS, (await boxEvents()).filter((e) => e.tripId !== tripId));
}

const summarize = (d: PlanDiff) => ({ added: d.added.length, removed: d.removed.length, timeChanged: d.timeChanged.length, empty: diffIsEmpty(d) });

let running: Promise<BoxResult> | null = null;

/** Kutuyu denetler. Ağ yoksa sessizce atlar. Bu cihaza şifrelenmemiş kayıt sessizce atlanır. */
export function checkBox(): Promise<BoxResult> {
  running ??= doCheck().finally(() => (running = null));
  return running;
}

async function doCheck(): Promise<BoxResult> {
  const res: BoxResult = { state: 'ok', events: [], errors: [], index: null };
  if (!boxSupported()) return { ...res, state: 'unsupported' };
  if (!navigator.onLine) return { ...res, state: 'offline' };
  const key = await deviceKey();
  if (!key) return { ...res, state: 'unsupported' };
  const fp = await fingerprint(key.pubRaw);
  let index: BoxIndex;
  try {
    const r = await fetch(boxUrl('index.json'), { cache: 'no-store' });
    if (r.status === 404) return res; // kutu henüz yok
    if (!r.ok) throw new Error(String(r.status));
    index = (await r.json()) as BoxIndex;
    if (!Array.isArray(index.kayitlar)) throw new Error('dizin');
  } catch (e) {
    if (!navigator.onLine) return { ...res, state: 'offline' };
    addLog('info', `Plan kutusu okunamadı: ${(e as Error).message}`);
    return { ...res, state: 'fail' };
  }
  res.index = index;
  const seen = (await cacheGet<Record<string, string>>(SEEN))?.data ?? {};
  for (const e of index.kayitlar) {
    if (!e.alicilar?.includes(fp)) continue; // bu cihaza değil
    if (seen[e.kimlik] && seen[e.kimlik] >= e.guncelleme) continue;
    if (!/^[a-z0-9-]+\.json$/.test(e.dosya)) {
      res.errors.push('bad');
      continue;
    }
    let text: string;
    try {
      const r = await fetch(boxUrl(e.dosya), { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      text = await open((await r.json()) as Envelope, key.priv, key.pubRaw);
    } catch (err) {
      if (err instanceof BoxError && err.code === 'not-for-me') continue;
      addLog('info', 'Plan kutusu: bozuk ya da değiştirilmiş dosya reddedildi');
      res.errors.push('bad');
      continue;
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      res.errors.push('invalid');
      continue;
    }
    const imp = processImportData(data);
    if (imp.kind !== 'trips' || imp.items.length !== 1) {
      res.errors.push('invalid');
      continue;
    }
    const trip = imp.items[0].trip;
    const old = await getTrip(trip.id);
    await saveImported(trip); // kullanıcı durumu ayrı depoda: işaretler korunur
    res.events.push({ kind: old ? 'updated' : 'new', tripId: trip.id, title: trip.title, at: e.guncelleme, diff: old ? summarize(diffPlans(old.trip, trip)) : undefined });
    seen[e.kimlik] = e.guncelleme;
  }
  await cachePut(SEEN, seen);
  if (res.events.length) {
    const prev = (await boxEvents()).filter((x) => !res.events.some((y) => y.tripId === x.tripId));
    await cachePut(EVENTS, [...res.events, ...prev]);
  }
  return res;
}

/** Açıklık notu için: kutudaki dosya sayısı, toplam boyut ve son güncelleme (dizinden). */
export function indexStats(ix: BoxIndex | null): { files: number; bytes: number; at: string | null } {
  if (!ix) return { files: 0, bytes: 0, at: null };
  return { files: ix.kayitlar.length + 1, bytes: ix.kayitlar.reduce((a, e) => a + (e.bayt || 0), 0), at: ix.guncelleme ?? null };
}
