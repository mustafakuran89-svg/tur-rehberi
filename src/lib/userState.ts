// Kullanıcı durumu: ziyaret işareti, not, puan, iğne düzeltmesi, sabitlenen video, gizlenen
// fotoğraf, rezervasyon işareti, seçilen akşam etkinliği, varış/dönüş adımları.
// Plandan AYRI tutulur (IndexedDB 'user' deposu, gezi kimliğiyle). Aynı kimlikli plan yeniden
// içe aktarılınca bu kayıt değişmez; anahtarlar durak/mekan ADINDAN türetildiği için durak sırası
// değişse de işaretler yerinde kalır.
import { useEffect, useSyncExternalStore } from 'react';
import type { EveningEvent, Place, Stop, Trip, Venue, Video, WeeklyHours, Weekday } from '../plan/types';
import type { LatLng } from './geo';
import { db } from './store';

export interface BookingMark {
  done: boolean;
  note: string;
}

export interface UserState {
  tripId: string;
  visited: Record<string, string>; // anahtar → ISO zaman
  notes: Record<string, string>;
  ratings: Record<string, number>; // 1-5
  pins: Record<string, LatLng>; // durak/mekan/etkinlik anahtarı ya da 'lodging'
  videos: Record<string, Video>; // durak anahtarı → sabitlenen ya da elle eklenen video
  hiddenImages: Record<string, string[]>; // durak anahtarı → gizlenen görsel adresleri
  booked: Record<string, BookingMark>;
  going: Record<string, boolean>; // etkinlik anahtarı → gidiyorum
  transferDone: { arrival: number[]; departure: number[] };
  // sürüm 3: "Başlangıcı ayarla" ile elle seçilen video başlangıcı (durak anahtarı → video ve saniye)
  videoStarts: Record<string, { youtubeId: string; start: number }>;
  // sürüm 4
  tipSteps: Record<string, number[]>; // ipucu anahtarı → işaretlenen adımlar
  saved: Record<string, SavedPlace>; // kaydettiklerim (anahtar → yer)
  route: Record<string, DayRoute>; // gün tarihi → kişisel rota katmanı
  hiddenOnboarding?: boolean;
}

/** Kaydedilen ya da rotaya eklenen yer: plandaki kaydın anlık görüntüsü (plan değişse de görünür). */
export interface SavedPlace {
  key: string;
  source: 'discover' | 'stop' | 'venue' | 'event' | 'wiki' | 'own';
  name: string;
  lat: number | null;
  lng: number | null;
  note?: string;
  description?: string | null; // keşfet tanıtımı ya da ansiklopedi özeti
  attribution?: string | null; // ansiklopedi kaynağı ve lisansı
  url?: string | null;
  visitMinutes?: number | null;
  hours?: WeeklyHours | null;
  closedWeekdays?: Weekday[];
  category?: string | null;
  savedAt: string;
}

/** Günün kişisel rotası: eklenen yerler (hangi duraktan sonra) ve elle verilen sıra. */
export interface DayRoute {
  added: { place: SavedPlace; after: string | null }[]; // after: önceki durağın anahtarı; null = günün başı
  order: string[] | null; // elle sıralandıysa durak anahtarları
}

export function emptyUserState(tripId: string): UserState {
  return { tripId, visited: {}, notes: {}, ratings: {}, pins: {}, videos: {}, hiddenImages: {}, booked: {}, going: {}, transferDone: { arrival: [], departure: [] }, videoStarts: {}, tipSteps: {}, saved: {}, route: {} };
}

/** Eksik alanları tamamlar (eski ya da paylaşımla gelen kayıtlar için). */
export function normalizeUserState(x: Partial<UserState> & { tripId: string }): UserState {
  const e = emptyUserState(x.tripId);
  return { ...e, ...x, transferDone: { ...e.transferDone, ...(x.transferDone ?? {}) }, tipSteps: x.tipSteps ?? {}, saved: x.saved ?? {}, route: x.route ?? {} };
}

export function slug(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Kalıcı kimlik (şema 4, `id`) varsa anahtar ona bağlanır; yoksa addan türetilir (önceki yöntem).
// Kişisel rotaya eklenen yer kendi anahtarını taşır.
type Keyed<T> = T & { id?: string; personal?: { key: string } };
export const stopKey = (s: Keyed<Pick<Stop, 'name'>>) => s.personal?.key ?? (s.id ? `s#${s.id}` : `s:${slug(s.name)}`);
export const venueKey = (v: Keyed<Pick<Venue, 'name'>>) => (v.id ? `v#${v.id}` : `v:${slug(v.name)}`);
export const eventKey = (e: Keyed<Pick<EveningEvent, 'date' | 'title'>>) => (e.id ? `e#${e.id}` : `e:${e.date}:${slug(e.title)}`);
export const placeKey = (p: Pick<Place, 'id'>) => `p#${p.id}`;
const legacyStopKey = (s: Pick<Stop, 'name'>) => `s:${slug(s.name)}`;
const legacyVenueKey = (v: Pick<Venue, 'name'>) => `v:${slug(v.name)}`;
const legacyEventKey = (e: Pick<EveningEvent, 'date' | 'title'>) => `e:${e.date}:${slug(e.title)}`;

const KEYED_MAPS = ['visited', 'notes', 'ratings', 'pins', 'videos', 'hiddenImages', 'booked', 'going', 'videoStarts', 'saved'] as const;

/**
 * Plan kimlik kazanınca (şema 4) addan türetilmiş anahtarlardaki kullanıcı verisi kimlik anahtarına
 * taşınır; hiçbir kayıt silinmez. Değişiklik yoksa null döner.
 */
export function migrateKeys(trip: Trip, us: UserState): UserState | null {
  const moves: [string, string][] = [];
  trip.days.forEach((d) => {
    d.stops.forEach((x) => x.id && moves.push([legacyStopKey(x), stopKey(x)]));
    [...d.breakfast, ...d.dinner, ...d.snacks, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : [])].forEach((x) => x.id && moves.push([legacyVenueKey(x), venueKey(x)]));
    (d.eveningEvents ?? []).forEach((x) => x.id && moves.push([legacyEventKey(x), eventKey(x)]));
  });
  let changed = false;
  const next: UserState = { ...us };
  for (const m of KEYED_MAPS) {
    const map = { ...((us[m] ?? {}) as Record<string, unknown>) };
    let mc = false;
    for (const [from, to] of moves) {
      if (from in map && !(to in map)) {
        map[to] = map[from];
        delete map[from];
        mc = true;
      }
    }
    if (mc) {
      (next as unknown as Record<string, unknown>)[m] = map;
      changed = true;
    }
  }
  // ipucu adımları ve rota bağlantıları da anahtara bağlıdır
  const tipSteps = { ...us.tipSteps };
  for (const [from, to] of moves)
    for (const k of Object.keys(tipSteps))
      if (k.startsWith(from + '|')) {
        tipSteps[to + k.slice(from.length)] = tipSteps[k];
        delete tipSteps[k];
        changed = true;
      }
  next.tipSteps = tipSteps;
  const route: Record<string, DayRoute> = {};
  for (const [date, r] of Object.entries(us.route ?? {})) {
    const ren = (k: string | null) => (k ? (moves.find(([a]) => a === k)?.[1] ?? k) : k);
    const nr = { added: r.added.map((a) => ({ ...a, after: ren(a.after) })), order: r.order ? r.order.map((k) => ren(k)!) : null };
    if (JSON.stringify(nr) !== JSON.stringify(r)) changed = true;
    route[date] = nr;
  }
  next.route = route;
  return changed ? next : null;
}
export const LODGING_KEY = 'lodging';

const listeners = new Set<() => void>();
let version = 0;
function changed() {
  version++;
  listeners.forEach((l) => l());
}
export function subscribeUser(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Bellekteki kopya: işaretler dokunuşla anında görünür, veritabanına arkadan yazılır.
const mem = new Map<string, UserState>();

async function persist(s: UserState): Promise<void> {
  const d = await db();
  await d.put('user', s);
}

export async function getUserState(tripId: string): Promise<UserState> {
  const m = mem.get(tripId);
  if (m) return m;
  const d = await db();
  const r = (await d.get('user', tripId)) as UserState | undefined;
  const st = mem.get(tripId) ?? (r ? normalizeUserState(r) : emptyUserState(tripId));
  mem.set(tripId, st);
  return st;
}

export async function putUserState(s: UserState): Promise<void> {
  mem.set(s.tripId, s);
  changed();
  await persist(s);
}

export function updateUserState(tripId: string, fn: (s: UserState) => UserState): Promise<UserState> {
  const apply = (cur: UserState) => {
    const next = fn(cur);
    mem.set(tripId, next);
    changed();
    return persist(next).then(() => next);
  };
  const cur = mem.get(tripId);
  return cur ? apply(cur) : getUserState(tripId).then(apply);
}

export async function deleteUserState(tripId: string): Promise<void> {
  mem.delete(tripId);
  const d = await db();
  await d.delete('user', tripId);
  changed();
}

/** Veritabanı dışarıdan silindiğinde (bütün verileri sil, gezi sil) bellekteki kopyayı unutur. */
export function forgetUserState(tripId?: string): void {
  if (tripId) mem.delete(tripId);
  else mem.clear();
  changed();
}

/** Bir gezinin kullanıcı durumunu okur; değişince anında yeniden çizer. */
export function useUserState(tripId: string): { us: UserState | undefined; update: (fn: (s: UserState) => UserState) => Promise<UserState> } {
  const us = useSyncExternalStore(subscribeUser, () => mem.get(tripId));
  useEffect(() => {
    if (!mem.has(tripId)) getUserState(tripId).then(() => changed());
  }, [tripId]);
  return { us, update: (fn) => updateUserState(tripId, fn) };
}

/**
 * Kullanıcının iğne düzeltmelerini plana uygular (coordSource: manual). Plan kendisi değişmez;
 * ekranlar bu birleşik görünümü kullanır.
 */
export function applyPins(trip: Trip, us: UserState | undefined): Trip {
  if (!us || Object.keys(us.pins).length === 0) return trip;
  const fix = <T extends { lat: number | null; lng: number | null; coordSource?: unknown }>(x: T, key: string): T => {
    const p = us.pins[key];
    return p ? { ...x, lat: p.lat, lng: p.lng, coordSource: 'manual' } : x;
  };
  const fv = (v: Venue) => fix(v, venueKey(v));
  const days = trip.days.map((d) => ({
    ...d,
    stops: d.stops.map((s) => fix(s, stopKey(s))),
    breakfast: d.breakfast.map(fv),
    dinner: d.dinner.map(fv),
    snacks: d.snacks.map(fv),
    lunch: d.lunch ? { main: fv(d.lunch.main), backup: d.lunch.backup ? fv(d.lunch.backup) : null } : null,
    eveningEvents: d.eveningEvents?.map((e) => fix(e, eventKey(e))),
  }));
  const lp = us.pins[LODGING_KEY];
  let lodging = trip.lodging ?? null;
  if (lp) lodging = lodging ? { ...lodging, lat: lp.lat, lng: lp.lng, coordSource: 'manual' } : { name: '', address: '', lat: lp.lat, lng: lp.lng, coordSource: 'manual' };
  return { ...trip, days, lodging };
}
