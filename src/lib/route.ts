// Kişisel rota (Geliştirme 4, Aşama E): kullanıcının güne eklediği yerler planı değiştirmez; planın
// üzerinde bir katmandır. Numaralar, harita, tur modu, Bugün ekranı ve etap süreleri bu katmana
// göre gösterilir. Eklenen yerle komşusu arasındaki yürüyüş kuş uçuşundan tahmin edilir ("yaklaşık").
import type { Day, Stop, Trip, TimelineItem, Weekday } from '../plan/types';
import { stopsInOrder, weekdayOf } from '../plan/normalize';
import { dayBusyMinutes, timelineSpanMinutes, LIMITS } from '../plan/rules';
import { estimateLegMinutes, hasCoord, type LatLng } from './geo';
import { firstClock } from './ics';
import { stopKey, type DayRoute, type SavedPlace, type UserState } from './userState';
import { tr } from '../i18n/tr';

/** Kaydedilen yeri rota durağına çevirir; tur modunda okunacak metin kaynağa göre kurulur. */
export function placeToStop(p: SavedPlace, order: number): Stop {
  const note = p.note?.trim() ? p.note.trim() : '';
  let narration: string;
  if (p.source === 'own') narration = [p.name + '.', note].filter(Boolean).join(' ');
  else if (p.source === 'wiki') narration = tr.route.wikiSays(p.description ?? p.name);
  else narration = p.description?.trim() || p.name;
  return {
    order,
    name: p.name,
    kind: 'minor',
    lat: p.lat,
    lng: p.lng,
    coordSource: p.source === 'own' ? 'manual' : 'other',
    address: '',
    visitMinutes: p.visitMinutes ?? 20,
    closedWeekdays: p.closedWeekdays ?? [],
    hours: p.hours ?? null,
    narration,
    narrationShort: narration,
    practicalLine: note,
    legToNext: null,
    sources: [],
    verifiedAt: null,
    personal: { key: p.key, source: p.source, note: p.note ?? null, attribution: p.attribution ?? null },
  };
}

interface Seq {
  key: string;
  stop: Stop;
  baseIndex: number | null; // planda kaçıncı durak (eklenen yerde null)
}

/** Günün etkin sırası: plan durakları + eklenen yerler (+ elle verilen sıra). */
export function effectiveSeq(day: Day, r: DayRoute | undefined): { seq: Seq[]; orphaned: string[] } {
  const base = stopsInOrder(day);
  const seq: Seq[] = base.map((s, i) => ({ key: stopKey(s), stop: s, baseIndex: i }));
  const orphaned: string[] = [];
  if (!r) return { seq, orphaned };
  for (const a of r.added) {
    if (seq.some((x) => x.key === a.place.key)) continue;
    const item: Seq = { key: a.place.key, stop: placeToStop(a.place, 0), baseIndex: null };
    if (a.after === null) {
      seq.unshift(item);
      continue;
    }
    const at = seq.findIndex((x) => x.key === a.after);
    if (at < 0) {
      // bağlandığı durak plandan çıkmış: günün sonuna alınır ve bildirilir
      orphaned.push(a.place.name);
      seq.push(item);
    } else seq.splice(at + 1, 0, item);
  }
  if (r.order?.length) {
    const pos = new Map(r.order.map((k, i) => [k, i]));
    const known = seq.filter((x) => pos.has(x.key)).sort((a, b) => pos.get(a.key)! - pos.get(b.key)!);
    const rest = seq.filter((x) => !pos.has(x.key));
    seq.splice(0, seq.length, ...known, ...rest);
  }
  return { seq, orphaned };
}

/** Kişisel rotayı uygulanmış gün: yeniden numaralanmış duraklar, etaplar ve akış. */
export function routedDay(day: Day, r: DayRoute | undefined): { day: Day; orphaned: string[]; changed: boolean } {
  const { seq, orphaned } = effectiveSeq(day, r);
  const base = stopsInOrder(day);
  const changed = seq.some((x, i) => x.baseIndex !== i) || seq.length !== base.length;
  if (!changed) return { day, orphaned, changed };
  const oldToNew = new Map<number, number>();
  const stops: Stop[] = seq.map((x, i) => {
    const order = i + 1;
    if (x.baseIndex !== null) oldToNew.set(x.stop.order, order);
    const next = seq[i + 1];
    let legToNext = x.stop.legToNext;
    if (!next) legToNext = null;
    else if (x.baseIndex === null || next.baseIndex === null || next.baseIndex !== x.baseIndex + 1) legToNext = { mode: 'walk', minutes: null, approx: true };
    return { ...x.stop, order, legToNext };
  });
  // Akış: plan duraklarının numaraları yeni sıraya; eklenen yer önceki durağın satırından sonra
  const timeline: TimelineItem[] = day.timeline.map((it) => (it.kind === 'stop' && it.stopOrder != null && oldToNew.has(it.stopOrder) ? { ...it, stopOrder: oldToNew.get(it.stopOrder)! } : it));
  seq.forEach((x, i) => {
    if (x.baseIndex !== null) return;
    const item: TimelineItem = { time: '', title: x.stop.name, kind: 'stop', stopOrder: i + 1, fixed: false, note: tr.route.addedNote };
    const prev = seq.slice(0, i).reverse().find(() => true);
    const at = prev ? timeline.findIndex((t) => t.kind === 'stop' && t.stopOrder === stops[seq.indexOf(prev)].order) : -1;
    if (at < 0) timeline.splice(prev ? timeline.length : 0, 0, item);
    else timeline.splice(at + 1, 0, item);
  });
  return { day: { ...day, stops, timeline }, orphaned, changed };
}

export function applyRoute(trip: Trip, us: UserState | undefined): { trip: Trip; orphaned: Record<string, string[]> } {
  const orphaned: Record<string, string[]> = {};
  if (!us || !us.route || !Object.keys(us.route).length) return { trip, orphaned };
  const days = trip.days.map((d) => {
    const r = routedDay(d, us.route[d.date]);
    if (r.orphaned.length) orphaned[d.date] = r.orphaned;
    return r.day;
  });
  return { trip: { ...trip, days }, orphaned };
}

// ---------------------------------------------------------------------------------------------
// Yerleştirme: yer en az ek yürüyüş getiren yere girer; SABİT saatli satırların sırası değişmez ve
// SABİT saate geç kalınacak konum seçilmez; yerin açılış saatlerine bakılır.

export type InsertWarning = 'closed-day' | 'closed-time' | 'overflow' | 'fixed-late' | 'no-coord';
export interface InsertPreview {
  after: string | null; // önceki durağın anahtarı
  index: number; // yeni sırada kaçıncı (0 tabanlı)
  prevName: string | null;
  nextName: string | null;
  extraWalkMin: number;
  dayExtraMin: number; // ek yürüyüş + ziyaret süresi
  warnings: InsertWarning[];
}

const walk = (a: LatLng, b: LatLng) => estimateLegMinutes(a, b, 'walk');
const hm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const clockMin = (t: string | null | undefined) => {
  const m = t?.match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** Yer, verilen saatte (dakika) o gün açık mı? Saat bilgisi yoksa açık sayılır. */
export function openAt(p: Pick<SavedPlace, 'hours' | 'closedWeekdays'>, wd: Weekday, minute: number | null): 'open' | 'closed-day' | 'closed-time' {
  if (p.closedWeekdays?.includes(wd)) return 'closed-day';
  const h = p.hours;
  if (!h) return 'open';
  const iv = h[wd];
  if (!iv || !iv.length) return 'closed-day';
  if (minute === null) return 'open';
  return iv.some(([a, b]) => {
    const s = clockMin(a);
    const e = clockMin(b);
    return s !== null && e !== null && minute >= s && minute < e;
  })
    ? 'open'
    : 'closed-time';
}

/** Duraktaki varış saati (akıştaki ilk saat), yoksa null. */
function stopClock(day: Day, order: number): number | null {
  return clockMin(firstClock(day.timeline.find((t) => t.kind === 'stop' && t.stopOrder === order)?.time) ?? null);
}
function fixedClock(day: Day, order: number): number | null {
  const t = day.timeline.find((x) => x.kind === 'stop' && x.stopOrder === order && x.fixed);
  return t ? clockMin(firstClock(t.time) ?? null) : null;
}

/**
 * Yerin güne girebileceği her konumu dener; uygun olanların (açık, SABİT saate geç kalmıyor) içinden
 * en az ek yürüyüşlüsünü seçer. Uygun konum yoksa en az yürüyüşlü konumu uyarılarla döndürür.
 */
export function planInsert(day: Day, place: SavedPlace): InsertPreview {
  const stops = stopsInOrder(day);
  const wd = weekdayOf(day.date);
  const P = place.lat !== null && place.lng !== null ? { lat: place.lat, lng: place.lng } : null;
  const visit = place.visitMinutes ?? 20;
  const coordBefore = (i: number) => stops.slice(0, i).reverse().find(hasCoord) ?? null;
  const coordAfter = (i: number) => stops.slice(i).find(hasCoord) ?? null;
  const cands: (InsertPreview & { cost: number; ok: boolean })[] = [];
  for (let i = 0; i <= stops.length; i++) {
    const prev = coordBefore(i);
    const next = coordAfter(i);
    let extra = 0;
    if (P) {
      if (prev && next) extra = walk(prev, P) + walk(P, next) - walk(prev, next);
      else if (prev) extra = walk(prev, P);
      else if (next) extra = walk(P, next);
    }
    extra = Math.max(0, extra);
    const warnings: InsertWarning[] = [];
    if (!P) warnings.push('no-coord');
    // varış saati: önceki durağın saati + ziyaret + yürüyüş
    const p = stops[i - 1];
    const pc = p ? stopClock(day, p.order) : null;
    let arrive = pc !== null && p ? pc + (p.visitMinutes ?? 0) + (P && hasCoord(p) ? walk(p, P) : 0) : null;
    if (!p && stops[0]) {
      // günün başı: ilk durağın saatinden geriye (ziyaret + yürüyüş)
      const fc = stopClock(day, stops[0].order);
      if (fc !== null) arrive = fc - visit - (P && hasCoord(stops[0]) ? walk(P, stops[0]) : 0);
    }
    const open = openAt(place, wd, arrive);
    if (open !== 'open') warnings.push(open);
    // sıradaki SABİT saat kaçırılıyor mu
    const n = stops[i];
    const fx = n ? fixedClock(day, n.order) : null;
    if (fx !== null && arrive !== null && arrive + visit + (P && hasCoord(n) ? walk(P, n) : 0) > fx) warnings.push('fixed-late');
    const ok = !warnings.some((w) => w === 'closed-time' || w === 'fixed-late');
    cands.push({ after: p ? stopKey(p) : null, index: i, prevName: p?.name ?? null, nextName: n?.name ?? null, extraWalkMin: Math.round(extra), dayExtraMin: Math.round(extra) + visit, warnings, cost: extra, ok });
  }
  const pool = cands.some((c) => c.ok) ? cands.filter((c) => c.ok) : cands;
  const best = pool.reduce((a, b) => (b.cost < a.cost ? b : a));
  // gün taşıyor mu
  const span = timelineSpanMinutes(day) ?? LIMITS.dayDefaultMinutes;
  if (dayBusyMinutes(day) + best.dayExtraMin > span) best.warnings.push('overflow');
  const { cost, ok, ...out } = best;
  void cost;
  void ok;
  return out;
}

export { hm as minutesToClock };
