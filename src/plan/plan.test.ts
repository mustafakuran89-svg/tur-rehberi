import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import { validatePlan, readablePath, parsePlanText } from './validate';
import { checkPlan, dayBusyMinutes, timelineSpanMinutes, type RuleId } from './rules';
import { fillLegDurations, weekdayOf } from './normalize';
import { processImportText } from './importPlan';
import { estimateLegMinutes, distanceM } from '../lib/geo';
import type { Trip, Venue } from './types';

const clone = (): Trip => structuredClone(sample) as Trip;
const rulesOf = (t: Trip): RuleId[] => checkPlan(t).map((w) => w.rule);

describe('örnek gezi', () => {
  it('şemadan geçer', () => {
    const r = validatePlan(sample);
    expect(r.ok).toBe(true);
  });
  it('kural denetiminden uyarısız geçer', () => {
    expect(checkPlan(clone())).toEqual([]);
  });
  it('ÖRNEK etiketi taşır', () => {
    const t = clone();
    expect(t.title).toContain('ÖRNEK');
    for (const d of t.days) {
      for (const s of d.stops) expect(s.name).toContain('ÖRNEK');
      for (const v of [...d.breakfast, ...d.dinner, ...d.snacks, d.lunch!.main, d.lunch!.backup!]) expect(v.name).toContain('ÖRNEK');
    }
  });
  it('istenen sayıları tutturur: 2 gün, gün başına 4-6 durak, 3 kahvaltı, öğle ana+yedek, 3 akşam, 15-20 ifade', () => {
    const t = clone();
    expect(t.days).toHaveLength(2);
    for (const d of t.days) {
      expect(d.stops.length).toBeGreaterThanOrEqual(4);
      expect(d.stops.length).toBeLessThanOrEqual(6);
      expect(d.breakfast).toHaveLength(3);
      expect(d.dinner).toHaveLength(3);
      expect(d.lunch?.main).toBeTruthy();
      expect(d.lunch?.backup).toBeTruthy();
    }
    const n = t.phrases[0].items.length;
    expect(n).toBeGreaterThanOrEqual(15);
    expect(n).toBeLessThanOrEqual(20);
  });
});

describe('şema doğrulaması Türkçe hata üretir', () => {
  it('eksik alanı adıyla söyler', () => {
    const t = clone() as Partial<Trip>;
    delete t.title;
    const r = validatePlan(t);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems.some((p) => p.message === '“title” alanı eksik.')).toBe(true);
  });
  it('yanlış türü ve alan yolunu Türkçe verir', () => {
    const t = clone() as unknown as { days: { stops: { lat: unknown }[] }[] };
    t.days[1].stops[2].lat = 'kırk';
    const r = validatePlan(t);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const p = r.problems.find((x) => x.path.includes('durak 3'));
      expect(p?.path).toBe('gün 2 › durak 3 › lat');
      expect(p?.message).toMatch(/beklenen: sayı veya boş \(null\)/);
    }
  });
  it('tarih biçimini açıklar', () => {
    const t = clone();
    t.startDate = '14.05.2027';
    const r = validatePlan(t);
    expect(!r.ok && r.problems[0].message).toMatch(/YYYY-AA-GG/);
  });
  it('fazla alanı bildirir', () => {
    const t = clone() as unknown as Record<string, unknown>;
    t.fazla = 1;
    const r = validatePlan(t);
    expect(!r.ok && r.problems[0].message).toBe('“fazla” alanı şemada yok; çıkarılmalı.');
  });
  it('JSON olmayan metni Türkçe reddeder', () => {
    const r = parsePlanText('{ bozuk');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/geçerli bir JSON değil/);
  });
  it('okunur yol üretir', () => {
    expect(readablePath('/days/0/lunch/main/sources/1/url')).toBe('gün 1 › öğle (lunch) › ana öneri (main) › kaynak 2 › url');
  });
});

describe('kural denetimi: her kural için geçen ve kalan örnek', () => {
  it('ana durak sayısı', () => {
    const t = clone();
    t.days[0].stops = t.days[0].stops.slice(0, 1); // ilk gün hafif olabilir ama 1 az
    t.days[0].timeline = t.days[0].timeline.filter((i) => i.kind !== 'stop' || i.stopOrder === 1);
    t.days[0].stops[0].legToNext = null;
    expect(rulesOf(t)).toContain('day-stop-count');
    expect(rulesOf(clone())).not.toContain('day-stop-count');
  });
  it('kahvaltı ve akşam en az 3', () => {
    const t = clone();
    t.days[0].breakfast.pop();
    t.days[1].dinner.pop();
    t.days[0].timeline.forEach((i) => (i.venueCodes = i.venueCodes?.filter((c) => c !== 'K3')));
    t.days[1].timeline.forEach((i) => (i.venueCodes = i.venueCodes?.filter((c) => c !== 'A3')));
    const r = rulesOf(t);
    expect(r).toContain('breakfast-count');
    expect(r).toContain('dinner-count');
  });
  it('öğle ana ve yedek', () => {
    const t = clone();
    t.days[0].lunch!.backup = null;
    t.days[0].timeline.forEach((i) => (i.venueCodes = i.venueCodes?.filter((c) => c !== 'O2')));
    expect(rulesOf(t)).toEqual(['lunch-pair']);
  });
  it('ifade sayısı ve alanları', () => {
    const t = clone();
    t.phrases[0].items = t.phrases[0].items.slice(0, 10);
    t.phrases[0].items[0].pronunciationTr = ' ';
    const r = rulesOf(t);
    expect(r).toContain('phrase-count');
    expect(r).toContain('phrase-fields');
  });
  it('mekanda en az iki kaynak ve doğrulama tarihi', () => {
    const t = clone();
    t.days[0].breakfast[0].sources = t.days[0].breakfast[0].sources.slice(0, 1);
    t.days[1].dinner[2].verifiedAt = null;
    const w = checkPlan(t).filter((x) => x.rule === 'venue-sources');
    expect(w).toHaveLength(2);
    expect(w[0].message).toMatch(/1 kaynak var, en az 2 beklenir/);
    expect(w[1].message).toMatch(/doğrulama tarihi yok/);
  });
  it('kapalı güne denk gelen durak ve mekan', () => {
    const t = clone();
    expect(weekdayOf(t.days[0].date)).toBe('fri');
    t.days[0].stops[1].closedWeekdays = ['fri'];
    t.days[0].dinner[0].closedWeekdays = ['fri'];
    const w = checkPlan(t).filter((x) => x.rule === 'closed-day');
    expect(w.map((x) => x.stopOrder ?? x.venueCode)).toEqual([2, 'A1']);
  });
  it('gün tutuyor mu', () => {
    const t = clone();
    expect(timelineSpanMinutes(t.days[0])).toBe(19 * 60 + 30 - (8 * 60 + 30));
    t.days[0].stops[0].visitMinutes = 900;
    expect(rulesOf(t)).toContain('day-time');
  });
  it('durak numaraları ardışık', () => {
    const t = clone();
    t.days[0].stops[4].order = 7;
    t.days[0].timeline.forEach((i) => i.stopOrder === 5 && (i.stopOrder = 7));
    expect(rulesOf(t)).toContain('stop-order');
  });
  it('akış olmayan durağı gösteriyor', () => {
    const t = clone();
    t.days[1].timeline[1].stopOrder = 9;
    const r = rulesOf(t);
    expect(r).toContain('timeline-ref');
  });
  it('mekan kodu listeye uymuyor', () => {
    const t = clone();
    t.days[0].dinner[0].code = 'K9';
    t.days[0].timeline.forEach((i) => (i.venueCodes = i.venueCodes?.map((c) => (c === 'A1' ? 'K9' : c))));
    expect(rulesOf(t)).toContain('venue-code');
  });
  it('bölgeden çok uzak koordinat', () => {
    const t = clone();
    t.days[0].stops[2].lat = (t.days[0].stops[2].lat as number) + 1; // ~111 km kuzey
    const w = checkPlan(t).filter((x) => x.rule === 'coord-outlier');
    expect(w.map((x) => x.stopOrder)).toEqual([3]);
  });
});

describe('etap süresi hesabı', () => {
  it('kuş uçuşu × 1,3, saatte 4,5 km', () => {
    const a = { lat: 41, lng: 29 };
    const b = { lat: 41 + 1000 / 111320, lng: 29 }; // ~1 km kuzey
    expect(distanceM(a, b)).toBeCloseTo(1000, -1);
    // 1 km × 1,3 = 1,3 km; 1,3 / 4,5 sa = 17,33 dk → 17
    expect(estimateLegMinutes(a, b, 'walk')).toBe(17);
  });
  it('süresi olmayan etap doldurulur ve yaklaşık işaretlenir', () => {
    const { trip, filled } = fillLegDurations(clone());
    expect(filled).toBe(4); // örnekte 5 etabın süresi boş; biri koordinatsız durağa gittiği için boş kalır
    const leg = trip.days[0].stops[1].legToNext!;
    expect(leg.approx).toBe(true);
    expect(leg.minutes).toBeGreaterThan(0);
    // koordinatsız durağa giden etap boş kalır
    expect(trip.days[1].stops[1].legToNext!.minutes).toBeNull();
  });
  it('gün toplamı ziyaret + etap', () => {
    const t = clone();
    expect(dayBusyMinutes(t.days[0])).toBeGreaterThan(60 * 4);
  });
});

describe('içe aktarma hattı', () => {
  it('geçerli planı kabul eder, etapları doldurur', () => {
    const r = processImportText(JSON.stringify(sample));
    expect(r.kind).toBe('trips');
    if (r.kind === 'trips') {
      expect(r.items[0].filled).toBe(4);
      expect(r.items[0].warnings).toEqual([]);
    }
  });
  it('şemaya uymayanı sorunlarla reddeder', () => {
    const t = clone() as unknown as { days: { breakfast: Venue[] }[] };
    (t.days[0].breakfast[0] as unknown as Record<string, unknown>).code = 'X1';
    const r = processImportText(JSON.stringify(t));
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.problems[0].message).toMatch(/Mekan kodu/);
  });
  it('yedek dosyasını açar', () => {
    const r = processImportText(JSON.stringify({ format: 'tur-rehberi-yedek', createdAt: 'x', trips: [sample, { ...sample, id: 'ikinci' }] }));
    expect(r.kind === 'trips' && r.items.length).toBe(2);
  });
});
