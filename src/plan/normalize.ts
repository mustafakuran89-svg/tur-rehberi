import type { Day, Stop, Trip } from './types';
import { estimateLegMinutes, hasCoord } from '../lib/geo';

/** Durakları order alanına göre sıralı döndürür (numaranın tek kaynağı order'dır). */
export function stopsInOrder(day: Day): Stop[] {
  return [...day.stops].sort((a, b) => a.order - b.order);
}

/**
 * Süresi verilmemiş etapları hesaplar: kuş uçuşu × 1,3; yürüyüşte 4,5 km/sa.
 * Hesaplanan etap approx: true olur. Koordinatı eksik etapta süre null kalır.
 */
export function fillLegDurations(trip: Trip): { trip: Trip; filled: number } {
  let filled = 0;
  const days = trip.days.map((day) => {
    const sorted = stopsInOrder(day);
    const stops = day.stops.map((s) => {
      if (!s.legToNext || s.legToNext.minutes !== null) return s;
      const idx = sorted.findIndex((x) => x.order === s.order);
      const next = sorted[idx + 1];
      if (!next || !hasCoord(s) || !hasCoord(next)) return s;
      filled++;
      return { ...s, legToNext: { ...s.legToNext, minutes: estimateLegMinutes(s, next, s.legToNext.mode), approx: true } };
    });
    return { ...day, stops };
  });
  return { trip: { ...trip, days }, filled };
}

/** Tarihi (YYYY-AA-GG) haftanın gününe çevirir; saat dilimi kaymasından etkilenmez. */
export function weekdayOf(iso: string): 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const)[wd];
}
