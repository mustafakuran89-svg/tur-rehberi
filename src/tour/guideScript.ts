// Tur modunda bir durağa varınca okunan metin: rehber karşılaması + seçilen anlatım + (varsa)
// öğün notu + sıradaki durağa geçiş ya da günün kapanışı. Rehber cümleleri bilgi eklemez:
// yalnız plandaki adı, süreyi ve sırayı söyler (src/i18n/guide.ts). Paragraflar boş satırla
// ayrılır; okuma paragraf arasında uzun duraklar.
import type { Day, Stop } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { bearingDeg, compassIndex, estimateLegMinutes, hasCoord } from '../lib/geo';
import { narrationFor } from '../lib/narration';
import { guideLine } from '../i18n/guide';
import { tr } from '../i18n/tr';

const MEAL_LABEL: Partial<Record<string, string>> = { breakfast: tr.food.breakfast, lunch: tr.food.lunch, dinner: tr.food.dinner };

function venueName(day: Day, code: string | undefined): string | null {
  if (!code) return null;
  const all = [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner, ...day.snacks];
  return all.find((v) => v.code === code)?.name ?? null;
}

export interface TourSpeech {
  text: string; // okunacak bütün metin
  narration: string; // yalnız anlatım (ekranda gösterilen)
  abridged: boolean;
}

export function tourSpeech(day: Day, stop: Stop, length: 'short' | 'long', done: Set<number> = new Set()): TourSpeech {
  const parts: string[] = [guideLine('arrival', stop.name)];
  const n = narrationFor(stop, length);
  parts.push(n.text);
  // Öğün: akışta bu duraktan hemen sonra gelen satır bir öğünse
  const ti = day.timeline.findIndex((x) => x.kind === 'stop' && x.stopOrder === stop.order);
  const after = ti >= 0 ? day.timeline[ti + 1] : undefined;
  const meal = after && MEAL_LABEL[after.kind];
  const venue = after ? venueName(day, after.venueCodes?.[0]) : null;
  if (meal && venue) parts.push(guideLine('meal', meal, venue));
  // Sıradaki durak (henüz dinlenmemiş ilk durak) ya da günün sonu
  const stops = stopsInOrder(day);
  const next = stops.find((s) => s.order > stop.order && !done.has(s.order));
  if (next) {
    const dir = hasCoord(stop) && hasCoord(next) ? tr.compass[compassIndex(bearingDeg(stop, next))] : null;
    const leg = stop.legToNext;
    const isNextDirect = stops[stops.indexOf(stop) + 1] === next;
    const min = isNextDirect && leg?.mode === 'walk' ? (leg.minutes ?? (hasCoord(stop) && hasCoord(next) ? estimateLegMinutes(stop, next, 'walk') : null)) : null;
    parts.push(guideLine('next', next.name, dir, min));
  } else parts.push(guideLine('dayEnd'));
  return { text: parts.join('\n\n'), narration: n.text, abridged: n.abridged };
}

/** Tur başlarken okunan cümle: "Tur başladı." ve günün başı. */
export function tourStartSpeech(day: Day, dayNo: number): string {
  const stops = stopsInOrder(day);
  return stops.length ? `${tr.tour.started}\n\n${guideLine('dayStart', dayNo, stops[0].name, stops.length)}` : tr.tour.started;
}
