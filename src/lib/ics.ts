// Takvim dosyası (iCalendar, RFC 5545). SABİT saatler, rezervasyonlar, seçilen akşam etkinlikleri,
// varış ve otelden çıkış saati tek dosyada. Gezinin saat dilimi biliniyorsa (hava servisinden gelen
// IANA adı) saatler UTC'ye çevrilir; bilinmiyorsa "yüzer" yerel saat yazılır: takvim, saati
// bulunduğunuz yerin saatiyle gösterir. Otelden çıkış kaydında iki hatırlatma vardır.
import type { Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { eventKey, venueKey, type UserState } from './userState';
import { tr } from '../i18n/tr';

export interface IcsEvent {
  uid: string;
  title: string;
  date: string; // YYYY-AA-GG
  start: string; // SS:DD
  minutes: number;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  alarmsMin?: number[]; // başlamadan kaç dakika önce
}

/** Saat diliminin o andaki farkı (ms): yerel duvar saati − UTC. */
export function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utcMs;
}

/** Bir saat dilimindeki duvar saatini UTC milisaniyeye çevirir. */
export function zonedToUtc(date: string, time: string, tz: string): number {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wall - tzOffsetMs(wall, tz);
  guess = wall - tzOffsetMs(guess, tz);
  return guess;
}

const pad = (n: number) => String(n).padStart(2, '0');
const utcStamp = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const floatStamp = (date: string, time: string, addMin = 0) => {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const x = new Date(Date.UTC(y, mo - 1, d, h, mi + addMin));
  return `${x.getUTCFullYear()}${pad(x.getUTCMonth() + 1)}${pad(x.getUTCDate())}T${pad(x.getUTCHours())}${pad(x.getUTCMinutes())}00`;
};

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 75 sekizliği aşan satırı katlar (UTF-8 karakterini bölmeden). */
export function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function buildIcs(events: IcsEvent[], tz: string | null, now = new Date()): string {
  const L: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tur Rehberi//TR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const stamp = utcStamp(now.getTime());
  for (const e of events) {
    L.push('BEGIN:VEVENT', `UID:${e.uid}@tur-rehberi`, `DTSTAMP:${stamp}`);
    if (tz) {
      const s = zonedToUtc(e.date, e.start, tz);
      L.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(s + e.minutes * 60000)}`);
    } else {
      L.push(`DTSTART:${floatStamp(e.date, e.start)}`, `DTEND:${floatStamp(e.date, e.start, e.minutes)}`);
    }
    L.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.location) L.push(`LOCATION:${escapeText(e.location)}`);
    if (e.description) L.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.url) L.push(`URL:${e.url}`);
    for (const a of e.alarmsMin ?? []) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(e.title)}`, `TRIGGER:${a === 0 ? 'PT0M' : `-PT${a}M`}`, 'END:VALARM');
    }
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n') + '\r\n';
}

/** Metindeki ilk SS:DD saati. */
export function firstClock(text: string | null | undefined): string | null {
  const m = text?.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  return m ? `${pad(Number(m[1]))}:${m[2]}` : null;
}

export const LEAVE_ALARMS = [30, 0];

/** Gezinin takvim kayıtları. */
export function tripIcsEvents(trip: Trip, us: UserState | undefined): IcsEvent[] {
  const out: IcsEvent[] = [];
  const T = tr.ics;
  trip.days.forEach((day, di) => {
    const stops = stopsInOrder(day);
    // SABİT akış satırları
    day.timeline.forEach((item, i) => {
      if (!item.fixed) return;
      const t = firstClock(item.time);
      if (!t) return;
      const s = item.stopOrder != null ? stops.find((x) => x.order === item.stopOrder) : undefined;
      out.push({ uid: `${trip.id}-d${di}-t${i}`, title: `${T.fixed} ${item.title}`, date: day.date, start: t, minutes: s?.visitMinutes ?? 60, location: s?.address ?? null, description: item.note ?? null, url: s?.ticketUrl ?? null });
    });
    // Rezervasyon yapıldı işaretli mekanlar: saat nottan, yoksa akıştaki öğün satırından
    const venues = [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner, ...day.snacks];
    for (const v of venues) {
      const mark = us?.booked[venueKey(v)];
      if (!mark?.done) continue;
      const row = day.timeline.find((i) => i.venueCodes?.includes(v.code));
      const t = firstClock(mark.note) ?? firstClock(row?.time);
      if (!t) continue;
      out.push({ uid: `${trip.id}-d${di}-v${v.code}`, title: T.booking(v.name), date: day.date, start: t, minutes: 90, location: v.address, description: mark.note || v.reservationNote || null, url: v.bookingUrl ?? null });
    }
    // Seçilen akşam etkinlikleri
    (day.eveningEvents ?? []).forEach((e, i) => {
      if (!us?.going[eventKey(e)] || !e.startTime) return;
      const end = e.endTime ? minutesBetween(e.startTime, e.endTime) : 120;
      out.push({ uid: `${trip.id}-d${di}-e${i}`, title: e.title, date: e.date, start: e.startTime, minutes: end, location: [e.venueName, e.address].filter(Boolean).join(', '), description: e.note ?? null, url: e.bookingUrl ?? e.website ?? null, alarmsMin: [60] });
    });
  });
  const arr = trip.arrival;
  if (arr?.date && arr.flightTime) {
    out.push({ uid: `${trip.id}-arrival`, title: T.arrival(arr.flight ?? arr.hubName), date: arr.date, start: arr.flightTime, minutes: arr.totalMinutes ?? 60, location: arr.hubName, description: arr.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n') });
  }
  const dep = trip.departure;
  if (dep?.date && dep.leaveBy) {
    out.push({ uid: `${trip.id}-leave`, title: T.leave(trip.lodging?.name || tr.lodging.myHotel), date: dep.date, start: dep.leaveBy, minutes: dep.totalMinutes ?? 60, location: trip.lodging?.address ?? null, description: [dep.flight, dep.hubName].filter(Boolean).join(' · '), alarmsMin: LEAVE_ALARMS });
  }
  return out.sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : 1));
}

export function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  let d = bh * 60 + bm - (ah * 60 + am);
  if (d <= 0) d += 1440;
  return d;
}

export function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
