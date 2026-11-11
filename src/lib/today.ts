// Gezi günü asistanının saf hesapları: bugün hangi gün, sıradaki adım, sıradaki SABİT saate geri
// sayım, plan gerisinde miyiz, dönüş bandı. Saat cihaz saatidir; gezi yerindeyken cihaz yerel
// saati gösterdiği için plan saatleriyle aynı ölçektedir.
import type { Day, Stop, TimelineItem, Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { stopKey, type UserState } from './userState';
import { firstClock } from './ics';
import { clockMinutes } from '../plan/rules';
import { tr } from '../i18n/tr';

export const LATE_AFTER_MIN = 30; // planlanan saatten bu kadar geç kalınırsa öneri kartı
export const LEAVE_URGENT_MIN = 30; // otelden çıkışa bu kadar kala bant renk değiştirir

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const nowMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** Gezi tarihleri (varış ve dönüş dahil) içinde miyiz? */
export function tripActive(t: Trip, now: Date): boolean {
  const d = isoDate(now);
  const start = [t.startDate, t.arrival?.date].filter(Boolean).sort()[0]!;
  const end = [t.endDate, t.departure?.date].filter(Boolean).sort().reverse()[0]!;
  return d >= start && d <= end;
}

export function dayIndexOn(t: Trip, now: Date): number {
  return t.days.findIndex((d) => d.date === isoDate(now));
}

export function stopTime(day: Day, s: Stop): string | null {
  const row = day.timeline.find((i) => i.kind === 'stop' && i.stopOrder === s.order);
  return firstClock(row?.time);
}

export function remainingStops(day: Day, us: UserState | undefined): Stop[] {
  return stopsInOrder(day).filter((s) => !us?.visited[stopKey(s)]);
}

/** Sıradaki SABİT satır ve kalan dakika. */
export function nextFixed(day: Day, now: Date): { item: TimelineItem; minutesLeft: number; time: string } | null {
  const n = nowMinutes(now);
  let best: { item: TimelineItem; minutesLeft: number; time: string } | null = null;
  for (const item of day.timeline) {
    if (!item.fixed) continue;
    const t = firstClock(item.time);
    const m = clockMinutes(t);
    if (m === null || m < n) continue;
    if (!best || m - n < best.minutesLeft) best = { item, minutesLeft: m - n, time: t! };
  }
  return best;
}

/** Sıradaki durağın planlanan saatinden geç kalındıysa kaç dakika. */
export function lateBy(day: Day, us: UserState | undefined, now: Date): number | null {
  const next = remainingStops(day, us)[0];
  if (!next) return null;
  const m = clockMinutes(stopTime(day, next));
  if (m === null) return null;
  const late = nowMinutes(now) - m;
  return late >= LATE_AFTER_MIN ? late : null;
}

/** Sıradaki durağa yol süresi: bir önceki görülen duraktan etap, hiç görülmediyse otelden çıkış. */
export function walkToNext(day: Day, us: UserState | undefined): { minutes: number | null; mode: string; fromLodging: boolean } | null {
  const all = stopsInOrder(day);
  const next = remainingStops(day, us)[0];
  if (!next) return null;
  const idx = all.indexOf(next);
  if (idx === 0) return day.fromLodging ? { minutes: day.fromLodging.minutes ?? null, mode: day.fromLodging.mode, fromLodging: true } : null;
  const prev = all[idx - 1];
  return prev.legToNext ? { minutes: prev.legToNext.minutes, mode: prev.legToNext.mode, fromLodging: false } : null;
}

/** Dönüş günü bandı: otelden en geç çıkışa kalan dakika (geçtiyse negatif). */
export function leaveBand(t: Trip, now: Date): { leaveBy: string; minutesLeft: number; urgent: boolean } | null {
  const dep = t.departure;
  if (!dep?.leaveBy || !dep.date || dep.date !== isoDate(now)) return null;
  const m = clockMinutes(dep.leaveBy);
  if (m === null) return null;
  const left = m - nowMinutes(now);
  return { leaveBy: dep.leaveBy, minutesLeft: left, urgent: left <= LEAVE_URGENT_MIN };
}

export function isArrivalDay(t: Trip, now: Date): boolean {
  return !!t.arrival?.date && t.arrival.date === isoDate(now);
}

/** "2 sa 05 dk" biçiminde geri sayım. */
export function countdown(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `${h} ${tr.units.hour} ${String(m % 60).padStart(2, '0')} ${tr.units.min}` : `${m} ${tr.units.min}`;
}
