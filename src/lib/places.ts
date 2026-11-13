// Keşfet, kaydet, yakınımda, kendi yerini ekle (Geliştirme 4, Aşama E).
// - Yakınımda: Vikipedi'nin konuma göre arama arayüzü (GeoData, list/generator=geosearch; yarıçap
//   en çok 10 km). Önce Türkçe, yetmezse İngilizce. Kaynak ve lisans (CC BY-SA 4.0) gösterilir;
//   tarayıcı User-Agent değiştiremediği için Wikimedia'nın önerdiği Api-User-Agent başlığı gönderilir.
// - Adla arama: OpenStreetMap Nominatim (operations.osmfoundation.org/policies/nominatim, 13.11.2026):
//   saniyede en çok 1 istek, uygulamayı tanıtan Referer (site adresi), atıf, otomatik tamamlama yasak,
//   sonuçlar önbelleğe alınır. Uygulama yalnız kullanıcı "Ara"ya basınca tek istek yapar.
// Uygulama yer bilgisi uydurmaz; yalnız planla geleni ya da kaynağı belirtilen açık içeriği gösterir.
import type { EveningEvent, Place, Stop, Venue } from '../plan/types';
import { cacheGet, cachePut, DAY_MS, fresh } from './cache';
import { distanceM, type LatLng } from './geo';
import { eventKey, placeKey, stopKey, venueKey, type SavedPlace } from './userState';

const API_UA = 'TurRehberi/4.0 (https://github.com/mustafakuran89-svg/tur-rehberi)';
const now = () => new Date().toISOString();

export function placeToSaved(p: Place): SavedPlace {
  return { key: placeKey(p), source: 'discover', name: p.name, lat: p.lat, lng: p.lng, description: p.description, visitMinutes: p.visitMinutes ?? 30, hours: p.hours ?? null, closedWeekdays: p.closedWeekdays ?? [], category: p.category, url: p.website ?? null, savedAt: now() };
}
export function stopToSaved(s: Stop): SavedPlace {
  return { key: stopKey(s), source: 'stop', name: s.name, lat: s.lat, lng: s.lng, description: s.narrationShort ?? s.narration, visitMinutes: s.visitMinutes, hours: s.hours ?? null, closedWeekdays: s.closedWeekdays ?? [], savedAt: now() };
}
export function venueToSaved(v: Venue): SavedPlace {
  return { key: venueKey(v), source: 'venue', name: v.name, lat: v.lat, lng: v.lng, description: v.suitsWhom, visitMinutes: 60, hours: v.hours ?? null, closedWeekdays: v.closedWeekdays ?? [], savedAt: now() };
}
export function eventToSaved(e: EveningEvent): SavedPlace {
  return { key: eventKey(e), source: 'event', name: e.title, lat: e.lat, lng: e.lng, description: e.description ?? null, visitMinutes: e.durationMinutes ?? null, savedAt: now() };
}

/** Yakınlık sıralaması: konum yoksa sıra değişmez. */
export function byDistance<T extends { lat: number | null; lng: number | null }>(items: T[], from: LatLng | null): { item: T; m: number | null }[] {
  const out = items.map((item) => ({ item, m: from && item.lat !== null && item.lng !== null ? distanceM(from, { lat: item.lat, lng: item.lng }) : null }));
  return from ? out.sort((a, b) => (a.m ?? Infinity) - (b.m ?? Infinity)) : out;
}

/**
 * Harita bağlantısından koordinat: Apple Haritalar (?ll=, ?q=lat,lng, ?daddr=, ?sll=), Google Haritalar
 * (@lat,lng ve ?q= / query= / destination=), geo: adresi ya da düz "lat, lng".
 */
export function parseMapLink(input: string): LatLng | null {
  const s = input.trim();
  const pair = (a: string, b: string): LatLng | null => {
    const lat = Number(a);
    const lng = Number(b);
    return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0) ? { lat, lng } : null;
  };
  const plain = s.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (plain) return pair(plain[1], plain[2]);
  const geo = s.match(/^geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (geo) return pair(geo[1], geo[2]);
  const at = s.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) return pair(at[1], at[2]);
  const d3 = s.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (d3) return pair(d3[1], d3[2]);
  try {
    const u = new URL(s);
    for (const k of ['ll', 'q', 'query', 'daddr', 'destination', 'sll', 'coordinate']) {
      const v = u.searchParams.get(k);
      const m = v?.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
      if (m) return pair(m[1], m[2]);
    }
  } catch {
    /* adres değil */
  }
  return null;
}

export interface NamedPoint extends LatLng {
  name: string;
  detail: string;
}

let lastNominatim = 0;
/** Adla yer arama (Nominatim). Önbellekli; saniyede en çok bir istek. */
export async function searchPlace(q: string, near: LatLng | null, fetchFn: typeof fetch = fetch): Promise<NamedPoint[]> {
  const query = q.trim();
  if (!query) return [];
  const ck = `nom:${query.toLocaleLowerCase('tr')}:${near ? `${near.lat.toFixed(2)},${near.lng.toFixed(2)}` : ''}`;
  const c = await cacheGet<NamedPoint[]>(ck);
  if (fresh(c, 30 * DAY_MS)) return c!.data;
  const wait = 1100 - (Date.now() - lastNominatim);
  if (wait > 0) await new Promise((ok) => setTimeout(ok, wait));
  lastNominatim = Date.now();
  const sp = new URLSearchParams({ q: query, format: 'jsonv2', limit: '5', 'accept-language': 'tr' });
  if (near) sp.set('viewbox', `${near.lng - 0.15},${near.lat + 0.1},${near.lng + 0.15},${near.lat - 0.1}`);
  const r = await fetchFn(`https://nominatim.openstreetmap.org/search?${sp}`);
  if (!r.ok) throw new Error(`Nominatim ${r.status}`);
  const j = (await r.json()) as { lat: string; lon: string; name?: string; display_name: string }[];
  const out = j.map((x) => ({ lat: Number(x.lat), lng: Number(x.lon), name: x.name || x.display_name.split(',')[0], detail: x.display_name }));
  await cachePut(ck, out);
  return out;
}

export interface WikiPlace extends LatLng {
  pageid: number;
  title: string;
  extract: string;
  thumb: string | null;
  lang: 'tr' | 'en';
  url: string;
  distance: number;
}

/** Konumun çevresindeki ansiklopedi maddeleri (önce Türkçe; 3'ten azsa İngilizce eklenir). */
export async function wikiNearby(at: LatLng, radius = 1000, fetchFn: typeof fetch = fetch): Promise<WikiPlace[]> {
  const one = async (lang: 'tr' | 'en'): Promise<WikiPlace[]> => {
    const sp = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'geosearch',
      ggscoord: `${at.lat}|${at.lng}`,
      ggsradius: String(Math.min(10000, radius)),
      ggslimit: '20',
      prop: 'coordinates|pageimages|extracts',
      exintro: '1',
      explaintext: '1',
      exsentences: '3',
      exlimit: '20',
      piprop: 'thumbnail',
      pithumbsize: '240',
    });
    const r = await fetchFn(`https://${lang}.wikipedia.org/w/api.php?${sp}`, { headers: { 'Api-User-Agent': API_UA } });
    if (!r.ok) throw new Error(`Vikipedi ${r.status}`);
    const j = (await r.json()) as { query?: { pages?: Record<string, { pageid: number; title: string; extract?: string; thumbnail?: { source: string }; coordinates?: { lat: number; lon: number }[] }> } };
    return Object.values(j.query?.pages ?? {})
      .filter((p) => p.coordinates?.[0])
      .map((p) => {
        const c = { lat: p.coordinates![0].lat, lng: p.coordinates![0].lon };
        return { pageid: p.pageid, title: p.title, extract: (p.extract ?? '').trim(), thumb: p.thumbnail?.source ?? null, lang, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`, distance: distanceM(at, c), ...c };
      });
  };
  let out = await one('tr');
  if (out.length < 3) {
    const en = await one('en').catch(() => []);
    out = [...out, ...en.filter((e) => !out.some((t) => distanceM(t, e) < 30))];
  }
  return out.sort((a, b) => a.distance - b.distance);
}

export function wikiToSaved(w: WikiPlace): SavedPlace {
  return {
    key: `w#${w.lang}-${w.pageid}`,
    source: 'wiki',
    name: w.title,
    lat: w.lat,
    lng: w.lng,
    description: w.extract || w.title,
    attribution: `Vikipedi (${w.lang.toUpperCase()}), “${w.title}”, CC BY-SA 4.0`,
    url: w.url,
    visitMinutes: 20,
    savedAt: now(),
  };
}

export const googleMapsUrl = (p: LatLng & { name?: string }) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
