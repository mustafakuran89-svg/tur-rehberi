// Hava tahmini: Open-Meteo (ücretsiz, anahtarsız, ticari olmayan kullanım; veri CC BY 4.0,
// gösterildiği yerde "Weather data by Open-Meteo.com" bağlantısı zorunlu — open-meteo.com/en/licence,
// 11.11.2026). Tahmin en çok 16 gün ileriyi kapsar; alınamazsa plandaki hava notu gösterilir.
import type { Trip } from '../plan/types';
import { cacheGet, cachePut, fresh } from './cache';
import { hasCoord, type LatLng } from './geo';

export const WEATHER_TTL = 3 * 60 * 60 * 1000;
export const RAIN_PROB = 60; // bu olasılık ve üstünde günün "yağmur yağarsa" notu öne çıkar
export const FORECAST_DAYS = 16;

export interface DayWeather {
  date: string;
  rainProb: number | null;
  tMax: number | null;
  tMin: number | null;
  code: number | null;
}
export interface TripWeather {
  timezone: string | null;
  days: DayWeather[];
}

export function tripCenter(t: Trip): LatLng | null {
  if (t.lodging && hasCoord(t.lodging)) return { lat: t.lodging.lat, lng: t.lodging.lng };
  for (const d of t.days) for (const s of d.stops) if (hasCoord(s)) return { lat: s.lat, lng: s.lng };
  return null;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Gezinin tahmin penceresine düşen tarih aralığı; hiç düşmüyorsa null. */
export function forecastRange(t: Trip, now: Date): { start: string; end: string } | null {
  const today = iso(now);
  const last = new Date(now);
  last.setDate(last.getDate() + FORECAST_DAYS - 1);
  const lastIso = iso(last);
  const start = t.startDate > today ? t.startDate : today;
  const end = t.endDate < lastIso ? t.endDate : lastIso;
  return start <= end ? { start, end } : null;
}

export function parseForecast(j: unknown): TripWeather {
  const o = j as { timezone?: string; daily?: { time?: string[]; precipitation_probability_max?: (number | null)[]; temperature_2m_max?: (number | null)[]; temperature_2m_min?: (number | null)[]; weather_code?: (number | null)[] } };
  const d = o.daily ?? {};
  return {
    timezone: o.timezone ?? null,
    days: (d.time ?? []).map((date, i) => ({
      date,
      rainProb: d.precipitation_probability_max?.[i] ?? null,
      tMax: d.temperature_2m_max?.[i] ?? null,
      tMin: d.temperature_2m_min?.[i] ?? null,
      code: d.weather_code?.[i] ?? null,
    })),
  };
}

export const weatherCacheKey = (tripId: string) => `wx:${tripId}`;

export async function cachedWeather(tripId: string): Promise<TripWeather | null> {
  return (await cacheGet<TripWeather>(weatherCacheKey(tripId)))?.data ?? null;
}

/** Tahmini getirir (3 saat önbellek). Ağ yoksa ya da servis yanıt vermezse önbellekteki ya da null. */
export async function getWeather(t: Trip, tripId: string, now = new Date(), fetchFn: typeof fetch = fetch): Promise<TripWeather | null> {
  const ck = weatherCacheKey(tripId);
  const c = await cacheGet<TripWeather>(ck);
  if (fresh(c, WEATHER_TTL)) return c!.data;
  const center = tripCenter(t);
  const range = forecastRange(t, now);
  if (!center || !range) return c?.data ?? null;
  const q = new URLSearchParams({
    latitude: center.lat.toFixed(4),
    longitude: center.lng.toFixed(4),
    daily: 'precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'auto',
    start_date: range.start,
    end_date: range.end,
  });
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetchFn(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return c?.data ?? null;
    const w = parseForecast(await r.json());
    await cachePut(ck, w);
    return w;
  } catch {
    return c?.data ?? null;
  }
}

export function rainy(d: DayWeather | undefined): boolean {
  return !!d && d.rainProb !== null && d.rainProb >= RAIN_PROB;
}
