// Kural denetimi (URUN-TANIMI.md bölüm 6.2). Planı reddetmez; uyarı üretir.
import type { Day, Trip, Venue } from './types';
import { stopsInOrder, weekdayOf } from './normalize';
import { distanceM, estimateLegMinutes, hasCoord, median, type LatLng } from '../lib/geo';
import { tr } from '../i18n/tr';
import { formatDate, formatKm, formatMinutes } from '../lib/format';

export type RuleId =
  | 'day-stop-count'
  | 'breakfast-count'
  | 'dinner-count'
  | 'lunch-pair'
  | 'phrase-count'
  | 'phrase-fields'
  | 'venue-sources'
  | 'closed-day'
  | 'day-time'
  | 'stop-order'
  | 'timeline-ref'
  | 'venue-code'
  | 'coord-outlier'
  | 'booking-contact'
  | 'image-credit'
  | 'michelin-url'
  | 'event-date'
  | 'departure-time'
  | 'lodging-transfer';

export interface RuleWarning {
  rule: RuleId;
  message: string;
  /** 0 tabanlı gün indeksi; gezi geneli uyarıda yok. */
  day?: number;
  stopOrder?: number;
  venueCode?: string;
  phraseList?: number;
}

// Eşikler (ürün tanımı 6.2 ve REHBER-PROMPTU bölüm 3)
export const LIMITS = {
  stopsMin: 4,
  stopsMax: 6,
  stopsMinLightDay: 2, // ilk ve son gün hafif olabilir
  breakfastMin: 3,
  dinnerMin: 3,
  phrasesMin: 15,
  phrasesMax: 20,
  venueSourcesMin: 2,
  dayDefaultMinutes: 12 * 60, // akıştan saat okunamazsa gün 12 saat sayılır
  outlierMinKm: 3, // ortancaya bu kadardan yakın nokta asla işaretlenmez
  outlierFactor: 4, // ortanca uzaklığın bu katından uzak nokta işaretlenir
  outlierAbsKm: 40, // bu mesafeden uzak nokta her durumda işaretlenir
  airportBufferMin: 120, // dönüşte havalimanına uçuştan en az bu kadar önce varılmalı
};

/** "SS:DD" → gece yarısından dakika. Okunamazsa null. */
export function clockMinutes(t: string | null | undefined): number | null {
  const m = t?.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Dönüş yolunun süresi: totalMinutes, yoksa adım sürelerinin toplamı (biri eksikse null). */
export function transferMinutes(t: { totalMinutes?: number | null; steps: { durationMinutes?: number | null }[] }): number | null {
  if (t.totalMinutes != null) return t.totalMinutes;
  if (t.steps.length === 0 || t.steps.some((s) => s.durationMinutes == null)) return null;
  return t.steps.reduce((a, s) => a + (s.durationMinutes ?? 0), 0);
}

const W = tr.rules;

function allVenues(day: Day): { venue: Venue; list: 'breakfast' | 'lunch' | 'dinner' | 'snacks' }[] {
  const out: { venue: Venue; list: 'breakfast' | 'lunch' | 'dinner' | 'snacks' }[] = [];
  day.breakfast.forEach((v) => out.push({ venue: v, list: 'breakfast' }));
  if (day.lunch) {
    out.push({ venue: day.lunch.main, list: 'lunch' });
    if (day.lunch.backup) out.push({ venue: day.lunch.backup, list: 'lunch' });
  }
  day.dinner.forEach((v) => out.push({ venue: v, list: 'dinner' }));
  day.snacks.forEach((v) => out.push({ venue: v, list: 'snacks' }));
  return out;
}

const CODE_PREFIX = { breakfast: 'K', lunch: 'O', dinner: 'A', snacks: 'S' } as const;

/** Akış metninden ilk ve son saati (SS:DD) okuyup dakika farkını verir. */
export function timelineSpanMinutes(day: Day): number | null {
  const times: number[] = [];
  for (const item of day.timeline) {
    const ms = item.time.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g);
    if (!ms) continue;
    for (const m of ms) {
      const [h, mm] = m.split(/[:.]/).map(Number);
      times.push(h * 60 + mm);
    }
  }
  if (times.length < 2) return null;
  const span = Math.max(...times) - Math.min(...times);
  return span > 0 ? span : null;
}

/** Günün ziyaret + etap toplamı (dakika). Süresi olmayan etap kuş uçuşundan hesaplanır. */
export function dayBusyMinutes(day: Day): number {
  const s = stopsInOrder(day);
  let total = 0;
  s.forEach((stop, i) => {
    total += stop.visitMinutes ?? 0;
    const leg = stop.legToNext;
    const next = s[i + 1];
    if (!leg || !next) return;
    if (leg.minutes !== null) total += leg.minutes;
    else if (hasCoord(stop) && hasCoord(next)) total += estimateLegMinutes(stop, next, leg.mode);
  });
  return total;
}

export function checkPlan(trip: Trip): RuleWarning[] {
  const out: RuleWarning[] = [];
  const lastDay = trip.days.length - 1;

  trip.days.forEach((day, d) => {
    const dayNo = d + 1;
    const stops = stopsInOrder(day);
    const mains = stops.filter((s) => s.kind === 'main').length;
    const light = trip.days.length > 1 && (d === 0 || d === lastDay);
    const min = light ? LIMITS.stopsMinLightDay : LIMITS.stopsMin;
    if (mains < min || mains > LIMITS.stopsMax) {
      out.push({ rule: 'day-stop-count', day: d, message: W.dayStopCount(dayNo, mains, min, LIMITS.stopsMax) });
    }
    if (day.breakfast.length < LIMITS.breakfastMin) {
      out.push({ rule: 'breakfast-count', day: d, message: W.breakfastCount(dayNo, day.breakfast.length, LIMITS.breakfastMin) });
    }
    if (day.dinner.length < LIMITS.dinnerMin) {
      out.push({ rule: 'dinner-count', day: d, message: W.dinnerCount(dayNo, day.dinner.length, LIMITS.dinnerMin) });
    }
    if (!day.lunch || !day.lunch.backup) {
      out.push({ rule: 'lunch-pair', day: d, message: W.lunchPair(dayNo, !!day.lunch) });
    }

    // Durak numaraları ardışık mı (1..n)?
    const orders = stops.map((s) => s.order);
    const dup = orders.filter((o, i) => orders.indexOf(o) !== i);
    const consecutive = orders.every((o, i) => o === i + 1);
    if (!consecutive || dup.length) {
      out.push({ rule: 'stop-order', day: d, message: W.stopOrder(dayNo, orders.join(', ')) });
    }
    // Dosyadaki dizi sırası ile order uyuşuyor mu? (harita ve akış order'ı kullanır)
    const arrayOrders = day.stops.map((s) => s.order);
    if (consecutive && arrayOrders.some((o, i) => o !== i + 1)) {
      out.push({ rule: 'stop-order', day: d, message: W.stopArrayOrder(dayNo) });
    }

    // Akış satırlarının gösterdiği durak ve mekanlar var mı?
    const venueCodes = new Set(allVenues(day).map((x) => x.venue.code));
    day.timeline.forEach((item) => {
      if (item.kind === 'stop') {
        if (item.stopOrder == null || !orders.includes(item.stopOrder)) {
          out.push({ rule: 'timeline-ref', day: d, message: W.timelineStop(dayNo, item.time, item.title, item.stopOrder ?? null) });
        }
      }
      (item.venueCodes ?? []).forEach((c) => {
        if (!venueCodes.has(c)) out.push({ rule: 'timeline-ref', day: d, venueCode: c, message: W.timelineVenue(dayNo, item.time, c) });
      });
    });
    const inTimeline = new Set(day.timeline.filter((i) => i.kind === 'stop').map((i) => i.stopOrder));
    stops.forEach((s) => {
      if (!inTimeline.has(s.order)) out.push({ rule: 'timeline-ref', day: d, stopOrder: s.order, message: W.stopNotInTimeline(dayNo, s.order, s.name) });
    });

    // Mekan kodları: listeye uygun önek, gün içinde benzersiz
    const seenCodes = new Set<string>();
    allVenues(day).forEach(({ venue, list }) => {
      if (seenCodes.has(venue.code)) out.push({ rule: 'venue-code', day: d, venueCode: venue.code, message: W.venueCodeDup(dayNo, venue.code) });
      seenCodes.add(venue.code);
      if (venue.code[0] !== CODE_PREFIX[list]) {
        out.push({ rule: 'venue-code', day: d, venueCode: venue.code, message: W.venueCodePrefix(dayNo, venue.code, CODE_PREFIX[list]) });
      }
    });

    // Yemek mekanlarında kaynak ve doğrulama tarihi
    allVenues(day).forEach(({ venue }) => {
      if (venue.sources.length < LIMITS.venueSourcesMin || !venue.verifiedAt) {
        out.push({
          rule: 'venue-sources',
          day: d,
          venueCode: venue.code,
          message: W.venueSources(dayNo, venue.code, venue.name, venue.sources.length, !!venue.verifiedAt, LIMITS.venueSourcesMin),
        });
      }
    });

    // Kapalı gün
    const wd = weekdayOf(day.date);
    stops.forEach((s) => {
      if (s.closedWeekdays?.includes(wd)) out.push({ rule: 'closed-day', day: d, stopOrder: s.order, message: W.closedStop(dayNo, s.order, s.name) });
    });
    allVenues(day).forEach(({ venue }) => {
      if (venue.closedWeekdays?.includes(wd)) out.push({ rule: 'closed-day', day: d, venueCode: venue.code, message: W.closedVenue(dayNo, venue.code, venue.name) });
    });

    // Gün tutuyor mu?
    const busy = dayBusyMinutes(day);
    const span = timelineSpanMinutes(day) ?? LIMITS.dayDefaultMinutes;
    if (busy > span) out.push({ rule: 'day-time', day: d, message: W.dayTime(dayNo, formatMinutes(busy), formatMinutes(span)) });

    // Koordinat tutarlılığı: günün ortanca noktasından çok uzak kalan nokta
    const pts: { label: string; p: LatLng; stopOrder?: number; venueCode?: string }[] = [];
    stops.forEach((s) => hasCoord(s) && pts.push({ label: W.stopLabel(s.order, s.name), p: s, stopOrder: s.order }));
    allVenues(day).forEach(({ venue }) => hasCoord(venue) && pts.push({ label: `${venue.code} ${venue.name}`, p: venue, venueCode: venue.code }));
    if (pts.length >= 3) {
      const c = { lat: median(pts.map((x) => x.p.lat)), lng: median(pts.map((x) => x.p.lng)) };
      const dists = pts.map((x) => distanceM(c, x.p));
      const md = median(dists);
      pts.forEach((x, i) => {
        const km = dists[i] / 1000;
        const far = km > LIMITS.outlierAbsKm || (km > LIMITS.outlierMinKm && dists[i] > md * LIMITS.outlierFactor);
        if (far) out.push({ rule: 'coord-outlier', day: d, stopOrder: x.stopOrder, venueCode: x.venueCode, message: W.coordOutlier(dayNo, x.label, formatKm(km), day.area) });
      });
    }
  });

  // Sürüm 2 uyarıları
  trip.days.forEach((day, d) => {
    const dayNo = d + 1;
    allVenues(day).forEach(({ venue }) => {
      if (venue.reservation === 'required' && !venue.bookingUrl && !venue.phone) {
        out.push({ rule: 'booking-contact', day: d, venueCode: venue.code, message: W.bookingContact(dayNo, venue.code, venue.name) });
      }
      if (venue.michelin && !venue.michelin.url) {
        out.push({ rule: 'michelin-url', day: d, venueCode: venue.code, message: W.michelinUrl(dayNo, venue.code, venue.name) });
      }
      (venue.images ?? []).forEach((img, i) => {
        if (!img.credit.trim() || !img.license.trim()) out.push({ rule: 'image-credit', day: d, venueCode: venue.code, message: W.imageCredit(dayNo, `${venue.code} ${venue.name}`, i + 1) });
      });
    });
    day.stops.forEach((s) => {
      (s.images ?? []).forEach((img, i) => {
        if (!img.credit.trim() || !img.license.trim()) out.push({ rule: 'image-credit', day: d, stopOrder: s.order, message: W.imageCredit(dayNo, W.stopLabel(s.order, s.name), i + 1) });
      });
    });
    (day.eveningEvents ?? []).forEach((e) => {
      if (e.date !== day.date) out.push({ rule: 'event-date', day: d, message: W.eventDate(dayNo, e.title, formatDate(e.date), formatDate(day.date)) });
    });
  });
  const dep = trip.departure;
  if (dep) {
    const leave = clockMinutes(dep.leaveBy);
    let flight = clockMinutes(dep.flightTime);
    const travel = transferMinutes(dep);
    if (leave !== null && flight !== null && travel !== null) {
      if (flight < leave) flight += 24 * 60; // uçuş ertesi gün
      const arrive = leave + travel;
      if (flight - arrive < LIMITS.airportBufferMin) {
        out.push({ rule: 'departure-time', message: W.departureTime(dep.leaveBy!, formatMinutes(travel), dep.flightTime!, formatMinutes(Math.max(0, flight - arrive))) });
      }
    }
  }
  if (trip.lodging && (!trip.arrival || !trip.departure)) {
    out.push({ rule: 'lodging-transfer', message: W.lodgingTransfer(!trip.arrival, !trip.departure) });
  }

  // İfadeler
  trip.phrases.forEach((list, i) => {
    const n = list.items.length;
    if (n < LIMITS.phrasesMin || n > LIMITS.phrasesMax) {
      out.push({ rule: 'phrase-count', phraseList: i, message: W.phraseCount(list.language, n, LIMITS.phrasesMin, LIMITS.phrasesMax) });
    }
    list.items.forEach((p, j) => {
      if (!p.pronunciationTr.trim() || !p.meaning.trim()) {
        out.push({ rule: 'phrase-fields', phraseList: i, message: W.phraseFields(list.language, j + 1, p.original) });
      }
    });
  });
  if (trip.phrases.length === 0) out.push({ rule: 'phrase-count', message: W.noPhrases });

  return out;
}
