// Tarayıcının yerel veritabanı (IndexedDB). Planlar yalnızca bu cihazda durur.
import { openDB, type IDBPDatabase } from 'idb';
import type { Trip } from '../plan/types';
import sampleJson from '../sample/ornek-plan.json';

export const SAMPLE_KEY = '__ornek__';

export interface TripRecord {
  key: string; // örnek için SAMPLE_KEY, diğerleri için plan id'si
  trip: Trip;
  isSample: boolean;
  importedAt: string; // ISO
  sampleRev?: string; // örnek gezinin sürümü; uygulama güncellenince örnek yenilenir
}

// Örnek gezinin içeriği değişince (yeni sürüm) cihazdaki eski örnek kendiliğinden yenilenir.
export const SAMPLE_REV = `${(sampleJson as { schemaVersion: number }).schemaVersion}-${JSON.stringify(sampleJson).length}`;

const DB_NAME = 'tur-rehberi';
let dbp: Promise<IDBPDatabase> | null = null;

// Sürüm 2: 'user' (kullanıcı durumu, planla ayrı) ve 'cache' (video, galeri, hava, görsel önbelleği).
export function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, 2, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('trips')) d.createObjectStore('trips', { keyPath: 'key' });
        if (!d.objectStoreNames.contains('user')) d.createObjectStore('user', { keyPath: 'tripId' });
        if (!d.objectStoreNames.contains('cache')) d.createObjectStore('cache', { keyPath: 'key' });
      },
    });
  }
  return dbp;
}

const listeners = new Set<() => void>();
export function subscribeTrips(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
function changed() {
  listeners.forEach((l) => l());
}

export function sampleTrip(): Trip {
  return structuredClone(sampleJson) as Trip;
}

export async function ensureSample(): Promise<void> {
  const d = await db();
  const existing = (await d.get('trips', SAMPLE_KEY)) as TripRecord | undefined;
  if (!existing || existing.sampleRev !== SAMPLE_REV) {
    await d.put('trips', { key: SAMPLE_KEY, trip: sampleTrip(), isSample: true, importedAt: new Date().toISOString(), sampleRev: SAMPLE_REV } satisfies TripRecord);
    changed();
  }
}

export async function listTrips(): Promise<TripRecord[]> {
  const d = await db();
  const all = (await d.getAll('trips')) as TripRecord[];
  return all.sort((a, b) => (a.trip.startDate < b.trip.startDate ? -1 : 1));
}

export async function getTrip(key: string): Promise<TripRecord | undefined> {
  const d = await db();
  return (await d.get('trips', key)) as TripRecord | undefined;
}

export async function putTrip(rec: TripRecord): Promise<void> {
  const d = await db();
  await d.put('trips', rec);
  changed();
}

export async function saveImported(trip: Trip): Promise<TripRecord> {
  const rec: TripRecord = { key: trip.id, trip, isSample: false, importedAt: new Date().toISOString() };
  await putTrip(rec);
  return rec;
}

export async function deleteTrip(key: string): Promise<void> {
  const d = await db();
  await d.delete('trips', key);
  await d.delete('user', key);
  changed();
}

export async function deleteAll(): Promise<void> {
  const d = await db();
  await d.clear('trips');
  await d.clear('user');
  await d.clear('cache');
  changed();
}

/** Kalıcı depolama ister. Sonuç: true verildi, false verilmedi, null desteklenmiyor. */
export async function requestPersist(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export async function isPersisted(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

export const BACKUP_FORMAT = 'tur-rehberi-yedek';
export interface Backup {
  format: typeof BACKUP_FORMAT;
  createdAt: string;
  trips: Trip[];
}

export async function makeBackup(): Promise<Backup> {
  const recs = await listTrips();
  return { format: BACKUP_FORMAT, createdAt: new Date().toISOString(), trips: recs.filter((r) => !r.isSample).map((r) => r.trip) };
}

export function isBackup(x: unknown): x is Backup {
  return !!x && typeof x === 'object' && (x as Backup).format === BACKUP_FORMAT && Array.isArray((x as Backup).trips);
}

/** Dosyayı indirir (iPhone'da Safari "İndir" ya da paylaş sayfasını açar). */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
