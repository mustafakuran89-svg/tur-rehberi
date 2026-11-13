// Etkinlikler (Geliştirme 4, Aşama D): akşam etkinlikleri ve gezi boyunca süren etkinlikler
// (`happenings`) tek listede; gün kapsamı, süzgeçler ve "Gidiyorum" çakışma denetimi.
import type { EveningEvent, Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { firstClock } from './ics';
import { eventKey, venueKey, type UserState } from './userState';
import { foldText } from './chapters';
import { tr } from '../i18n/tr';

export interface EvRef {
  e: EveningEvent;
  key: string;
  dayIndex: number | null; // akşam etkinliğinin günü; gezi boyunca sürende null
  i: number; // gündeki sırası (E1, E2…) ya da happenings içindeki sırası
  multi: boolean; // gezi boyunca
}

export function tripEvents(t: Trip): EvRef[] {
  const out: EvRef[] = [];
  t.days.forEach((d, di) => (d.eveningEvents ?? []).forEach((e, i) => out.push({ e, key: eventKey(e), dayIndex: di, i, multi: false })));
  (t.happenings ?? []).forEach((e, i) => out.push({ e, key: eventKey(e), dayIndex: null, i, multi: true }));
  return out;
}

/** Etkinlik o gün var mı (çok günlü etkinlikte başlangıç ile bitiş arasındaki her gün). */
export function onDate(e: Pick<EveningEvent, 'date' | 'endDate'>, date: string): boolean {
  return e.date <= date && date <= (e.endDate ?? e.date);
}

export function eventsOnDate(t: Trip, date: string): EvRef[] {
  return tripEvents(t).filter((r) => onDate(r.e, date));
}

const clock = (t: string | null | undefined): number | null => {
  const m = t?.match(/^(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Etkinliğin saat aralığı (dakika). Bitiş yoksa süreden, o da yoksa 2 saat varsayılır. */
export function interval(e: Pick<EveningEvent, 'startTime' | 'endTime' | 'durationMinutes'>): [number, number] | null {
  const s = clock(e.startTime);
  if (s === null) return null;
  let end = clock(e.endTime);
  if (end !== null && end <= s) end += 24 * 60;
  return [s, end ?? s + (e.durationMinutes ?? 120)];
}

const overlaps = (a: [number, number], b: [number, number]) => a[0] < b[1] && b[0] < a[1];

export const isFree = (e: Pick<EveningEvent, 'priceText'>) => /\bucretsiz\b|\bfree\b|\bbedava\b/.test(foldText(e.priceText ?? ''));
export const isDaytime = (e: Pick<EveningEvent, 'startTime'>) => {
  const s = clock(e.startTime);
  return s !== null && s < 17 * 60;
};

export interface Conflict {
  kind: 'fixed' | 'booking' | 'event';
  text: string;
}

/**
 * "Gidiyorum" denen etkinlik o günün SABİT satırlarıyla, yapılmış bir rezervasyonla ya da başka bir
 * seçili etkinlikle çakışıyor mu. Çok günlü etkinlik (sergi, festival) esnek sayılır, denetlenmez.
 */
export function eventConflicts(t: Trip, us: UserState | undefined, ev: EvRef, date: string): Conflict[] {
  if (ev.multi) return [];
  const iv = interval(ev.e);
  if (!iv) return [];
  const day = t.days.find((d) => d.date === date);
  if (!day) return [];
  const out: Conflict[] = [];
  const stops = stopsInOrder(day);
  day.timeline.forEach((it) => {
    if (!it.fixed) return;
    const times = (it.time.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g) ?? []).map((x) => clock(x.replace('.', ':'))!);
    if (!times.length) return;
    const st = it.stopOrder != null ? stops.find((s) => s.order === it.stopOrder) : undefined;
    const span: [number, number] = [times[0], times.length > 1 ? times[times.length - 1] : times[0] + (st?.visitMinutes ?? 60)];
    if (overlaps(iv, span)) out.push({ kind: 'fixed', text: tr.events4.conflictFixed(it.time, it.title) });
  });
  const venues = [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner, ...day.snacks];
  for (const v of venues) {
    const mark = us?.booked[venueKey(v)];
    if (!mark?.done) continue;
    const row = day.timeline.find((i) => i.venueCodes?.includes(v.code));
    const s = clock(firstClock(mark.note) ?? firstClock(row?.time));
    if (s !== null && overlaps(iv, [s, s + 90])) out.push({ kind: 'booking', text: tr.events4.conflictBooking(v.name) });
  }
  for (const o of eventsOnDate(t, date)) {
    if (o.key === ev.key || o.multi || !us?.going[o.key]) continue;
    const oi = interval(o.e);
    if (oi && overlaps(iv, oi)) out.push({ kind: 'event', text: tr.events4.conflictEvent(o.e.title) });
  }
  return out;
}

/** Bu akşam: seçilen etkinlik ya da (yoksa) o akşamın önerileri, rehberin seçimi başta. */
export function tonight(t: Trip, us: UserState | undefined, date: string, nowMin: number): { chosen: EvRef | null; picks: EvRef[]; ended: EvRef | null } {
  const today = eventsOnDate(t, date).filter((r) => !r.multi);
  const chosen = today.find((r) => us?.going[r.key]) ?? null;
  const iv = chosen ? interval(chosen.e) : null;
  const ended = chosen && iv && nowMin >= iv[1] ? chosen : null;
  const picks = [...today].filter((r) => !isDaytime(r.e)).sort((a, b) => Number(!!b.e.recommended) - Number(!!a.e.recommended) || (interval(a.e)?.[0] ?? 0) - (interval(b.e)?.[0] ?? 0));
  return { chosen, picks, ended };
}
