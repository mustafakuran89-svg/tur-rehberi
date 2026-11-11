// "Şu an açık mı": haftalık saatlerden Açık / Yakında kapanıyor / Kapalı.
// Saat yoksa (null) rozet gösterilmez. Gece yarısını aşan kapanış 24:00-29:59 yazılır (25:00 = 01:00);
// böyle bir aralık ertesi günün ilk saatlerini de kapsar.
import type { WeeklyHours, Weekday } from '../plan/types';

export type OpenState = 'open' | 'closing' | 'closed';
export interface OpenStatus {
  state: OpenState;
  /** Açıksa kapanış saati (SS:DD). */
  closesAt?: string;
  /** Kapalıysa bugün sonra açılış saati. */
  opensAt?: string;
}

export const CLOSING_SOON_MIN = 30;
const WD: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function openStatus(hours: WeeklyHours | null | undefined, now: Date, soonMin = CLOSING_SOON_MIN): OpenStatus | null {
  if (!hours) return null;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = hours[WD[now.getDay()]] ?? [];
  const yesterday = hours[WD[(now.getDay() + 6) % 7]] ?? [];
  const open: number[] = []; // kapanış dakikaları (bugünün ölçeğinde)
  for (const [o, c] of today) {
    if (toMin(o) <= nowMin && nowMin < toMin(c)) open.push(toMin(c));
  }
  for (const [, c] of yesterday) {
    const cm = toMin(c) - 1440;
    if (cm > 0 && nowMin < cm) open.push(cm);
  }
  if (open.length) {
    const close = Math.max(...open);
    return { state: close - nowMin <= soonMin ? 'closing' : 'open', closesAt: fmt(close) };
  }
  const later = today.map(([o]) => toMin(o)).filter((o) => o > nowMin).sort((a, b) => a - b)[0];
  return later !== undefined ? { state: 'closed', opensAt: fmt(later) } : { state: 'closed' };
}
