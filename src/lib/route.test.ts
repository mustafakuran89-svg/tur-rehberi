import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import type { Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { applyRoute, effectiveSeq, openAt, planInsert, routedDay } from './route';
import { emptyUserState, stopKey, type SavedPlace } from './userState';
import { parseMapLink, placeToSaved } from './places';

const clone = (): Trip => structuredClone(sample) as Trip;
const CENTER = { lat: 44.4938, lng: 11.3426 };
const at = (n: number, e: number) => ({ lat: CENTER.lat + n / 111320, lng: CENTER.lng + e / (111320 * Math.cos((CENTER.lat * Math.PI) / 180)) });
const place = (key: string, pos: { lat: number; lng: number }, extra: Partial<SavedPlace> = {}): SavedPlace => ({ key, source: 'own', name: key, ...pos, savedAt: '', visitMinutes: 20, ...extra });

describe('yerleştirme', () => {
  it('en az ek yürüyüş getiren konum seçilir', () => {
    const d = clone().days[0];
    // 2. durak (320,180) ile 3. durak (560,-120) arasına yakın bir nokta
    const p = place('o#ara', at(440, 30));
    const pv = planInsert(d, p);
    expect(pv.prevName).toBe('ÖRNEK Saat Kulesi');
    expect(pv.nextName).toBe('ÖRNEK Kent Müzesi');
    expect(pv.after).toBe(stopKey(d.stops[1]));
    expect(pv.extraWalkMin).toBeLessThanOrEqual(3);
    expect(pv.dayExtraMin).toBe(pv.extraWalkMin + 20);
  });
  it('SABİT saate geç kalınacak konum seçilmez; SABİT satırın sırası değişmez', () => {
    const d = clone().days[0];
    // 1. durak (09:30) ile SABİT 2. durak (10:30) arasında en yakın; ama 3 saat ziyaret 10:30'u kaçırır
    const p = place('o#uzun', at(160, 90), { visitMinutes: 180 });
    const pv = planInsert(d, p);
    expect(pv.index).not.toBe(1);
    expect(pv.warnings).not.toContain('fixed-late');
    const r = routedDay(d, { added: [{ place: p, after: pv.after }], order: null });
    const fixed = r.day.timeline.filter((x) => x.fixed).map((x) => x.title);
    expect(fixed).toEqual(d.timeline.filter((x) => x.fixed).map((x) => x.title));
    const kule = r.day.stops.find((s) => s.name === 'ÖRNEK Saat Kulesi')!;
    expect(r.day.timeline.find((x) => x.fixed)!.stopOrder).toBe(kule.order);
  });
  it('kapalı gün ve kapalı saat uyarısı', () => {
    const d = clone().days[0]; // 2027-05-14 cuma
    expect(planInsert(d, place('o#k', at(10, 10), { closedWeekdays: ['fri'] })).warnings).toContain('closed-day');
    // yalnız 06:00-07:00 açık: hiçbir konumda açık değil → kapalı saat uyarısı
    const early = place('o#s', at(440, 30), { hours: { fri: [['06:00', '07:00']] } });
    expect(planInsert(d, early).warnings).toContain('closed-time');
    expect(openAt({ hours: { fri: [['09:00', '12:00']] } }, 'fri', 600)).toBe('open');
    expect(openAt({ hours: { fri: [['09:00', '12:00']] } }, 'fri', 780)).toBe('closed-time');
    expect(openAt({ hours: { sat: [['09:00', '12:00']] } }, 'fri', 600)).toBe('closed-day');
  });
  it('taşan gün işaretlenir', () => {
    const d = clone().days[0];
    expect(planInsert(d, place('o#kisa', at(440, 30))).warnings).not.toContain('overflow');
    expect(planInsert(d, place('o#cok', at(440, 30), { visitMinutes: 600 })).warnings).toContain('overflow');
  });
});

describe('kişisel rota katmanı', () => {
  it('eklenen yer numaraları, etapları ve akışı günceller; plan değişmez', () => {
    const t = clone();
    const before = JSON.stringify(t);
    const us = emptyUserState(t.id);
    const p = placeToSaved(t.discover![1]);
    us.route[t.days[0].date] = { added: [{ place: p, after: stopKey(t.days[0].stops[1]) }], order: null };
    const out = applyRoute(t, us).trip;
    expect(JSON.stringify(t)).toBe(before);
    const st = stopsInOrder(out.days[0]);
    expect(st.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(st[2].name).toBe(p.name);
    expect(st[2].personal?.source).toBe('discover');
    expect(st[2].narration).toBe(p.description);
    expect(st[1].legToNext).toEqual({ mode: 'walk', minutes: null, approx: true }); // tahmini
    expect(st[2].legToNext?.approx).toBe(true);
    expect(st[3].name).toBe('ÖRNEK Kent Müzesi');
    expect(out.days[0].timeline.find((x) => x.title === p.name)?.stopOrder).toBe(3);
    expect(out.days[0].timeline.find((x) => x.title === 'Kent Müzesi')?.stopOrder).toBe(4);
  });
  it('elle sıralama ve özgün plana dönüş', () => {
    const t = clone();
    const keys = t.days[0].stops.map((s) => stopKey(s));
    const r = routedDay(t.days[0], { added: [], order: [keys[1], keys[0], ...keys.slice(2)] });
    expect(stopsInOrder(r.day).map((s) => s.name).slice(0, 2)).toEqual(['ÖRNEK Saat Kulesi', 'ÖRNEK Pazar Meydanı']);
    expect(routedDay(t.days[0], undefined).changed).toBe(false);
  });
  it('bağlandığı durak plandan çıkarsa yer günün sonuna alınır ve bildirilir', () => {
    const t = clone();
    const p = place('o#yetim', at(0, 0));
    const r = effectiveSeq(t.days[0], { added: [{ place: p, after: 's#plandan-cikti' }], order: null });
    expect(r.seq.at(-1)!.key).toBe('o#yetim');
    expect(r.orphaned).toEqual(['o#yetim']);
  });
  it('kaynağa göre okunacak metin', () => {
    const t = clone();
    const us = emptyUserState(t.id);
    us.route[t.days[0].date] = {
      added: [
        { place: place('o#kendi', at(0, 0), { name: 'Benim kafe', note: 'Pastası güzel' }), after: null },
        { place: place('w#tr-1', at(0, 0), { source: 'wiki', name: 'Madde', description: 'Ansiklopedi özeti.' }), after: null },
      ],
      order: null,
    };
    const st = stopsInOrder(applyRoute(t, us).trip.days[0]);
    expect(st.find((s) => s.name === 'Benim kafe')!.narration).toBe('Benim kafe. Pastası güzel');
    expect(st.find((s) => s.name === 'Madde')!.narration).toBe('Vikipedi’ye göre: Ansiklopedi özeti.');
  });
});

describe('harita bağlantısından koordinat', () => {
  it('Apple, Google, geo: ve düz koordinat', () => {
    expect(parseMapLink('https://maps.apple.com/?ll=48.2082,16.3738&q=Stephansdom')).toEqual({ lat: 48.2082, lng: 16.3738 });
    expect(parseMapLink('https://www.google.com/maps/place/Belvedere/@48.1915,16.3809,17z')).toEqual({ lat: 48.1915, lng: 16.3809 });
    expect(parseMapLink('https://www.google.com/maps/search/?api=1&query=48.18,16.31')).toEqual({ lat: 48.18, lng: 16.31 });
    expect(parseMapLink('geo:48.2,16.37')).toEqual({ lat: 48.2, lng: 16.37 });
    expect(parseMapLink('48.2082, 16.3738')).toEqual({ lat: 48.2082, lng: 16.3738 });
    expect(parseMapLink('https://maps.app.goo.gl/abc')).toBeNull();
    expect(parseMapLink('merhaba')).toBeNull();
  });
});
