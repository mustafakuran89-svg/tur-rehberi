import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import v1 from '../../e2e/fixtures/plan-v1.json';
import { validatePlan } from './validate';
import { checkPlan, type RuleId } from './rules';
import { processImportText } from './importPlan';
import { diffPlans, diffIsEmpty } from './diff';
import { applyPins, emptyUserState, eventKey, slug, stopKey, venueKey } from '../lib/userState';
import type { Trip } from './types';

const clone = (): Trip => structuredClone(sample) as Trip;
const rulesOf = (t: Trip): RuleId[] => checkPlan(t).map((w) => w.rule);

describe('şema sürüm 2', () => {
  it('sürüm 1 dosyası değişmeden geçer ve içe aktarılır', () => {
    expect(validatePlan(v1).ok).toBe(true);
    const r = processImportText(JSON.stringify(v1));
    expect(r.kind).toBe('trips');
    // sürüm 1 örneğinde rezervasyonu şart mekanda bağlantı ve telefon yok; kısa anlatım alanı da yok (sürüm 3 uyarıları)
    if (r.kind === 'trips') expect([...new Set(r.items[0].warnings.map((w) => w.rule))].sort()).toEqual(['booking-contact', 'narration-length', 'narration-short-missing']);
  });
  it('sürüm 2 örneği geçer ve yeni alanları taşır', () => {
    expect(validatePlan(sample).ok).toBe(true);
    const t = clone();
    expect(t.schemaVersion).toBe(4);
    expect(t.lodging?.name).toContain('ÖRNEK');
    expect(t.arrival?.steps.length).toBeGreaterThan(0);
    expect(t.departure?.leaveBy).toBeTruthy();
    expect(t.days[0].eveningEvents?.length).toBeGreaterThan(0);
    expect(t.days[0].stops[1].images?.length).toBeGreaterThan(0);
    expect(t.days[0].dinner.some((v) => v.michelin)).toBe(true);
  });
  it('örnekte Michelin, etkinlik, uçuş ve rezervasyon bağlantısı ÖRNEK etiketli ya da example.com', () => {
    const t = clone();
    for (const d of t.days) {
      for (const v of [...d.dinner, ...d.breakfast, ...d.snacks]) {
        if (v.michelin) expect(v.name).toContain('ÖRNEK');
        if (v.michelin?.url) expect(v.michelin.url).toMatch(/^https:\/\/example\.com\//);
        if (v.bookingUrl) expect(v.bookingUrl).toMatch(/^https:\/\/example\.com\//);
      }
      for (const e of d.eveningEvents ?? []) expect(e.title).toContain('ÖRNEK');
    }
    expect(t.arrival?.flight).toContain('ÖRNEK');
    expect(t.departure?.flight).toContain('ÖRNEK');
  });
  it('sürüm 5 reddedilir', () => {
    const t = clone() as unknown as { schemaVersion: number };
    t.schemaVersion = 5;
    expect(validatePlan(t).ok).toBe(false);
  });
});

describe('sürüm 2 uyarıları (içe aktarmayı engellemez)', () => {
  it('rezervasyonu şart mekanda ne bağlantı ne telefon', () => {
    const t = clone();
    const a2 = t.days[0].dinner[1];
    expect(rulesOf(t)).not.toContain('booking-contact');
    a2.bookingUrl = null;
    a2.phone = null;
    expect(rulesOf(t)).toContain('booking-contact');
    a2.phone = '+00 1';
    expect(rulesOf(t)).not.toContain('booking-contact');
  });
  it('görselde eser sahibi ya da lisans eksik', () => {
    const t = clone();
    t.days[0].stops[1].images![0].credit = ' ';
    const w = checkPlan(t).filter((x) => x.rule === 'image-credit');
    expect(w).toHaveLength(1);
    expect(w[0].stopOrder).toBe(2);
  });
  it('Michelin kaydında rehber bağlantısı yok', () => {
    const t = clone();
    t.days[0].dinner[0].michelin!.url = null;
    expect(rulesOf(t)).toContain('michelin-url');
  });
  it('akşam etkinliğinin tarihi güne uymuyor', () => {
    const t = clone();
    t.days[0].eveningEvents![0].date = '2027-05-15';
    const w = checkPlan(t).filter((x) => x.rule === 'event-date');
    expect(w).toHaveLength(1);
    expect(w[0].message).toContain('15.05.2027');
  });
  it('dönüşte havalimanına uçuştan en az iki saat önce varılmıyor', () => {
    const t = clone();
    expect(rulesOf(t)).not.toContain('departure-time');
    t.departure!.leaveBy = '22:00'; // 22:00 + 33 dk = 22:33; uçuş 23:59 → 86 dk
    expect(rulesOf(t)).toContain('departure-time');
    // gece yarısını aşan uçuş: 00:30 ertesi gün, çıkış 21:00 → 21:33 varış, 177 dk: geçer
    t.departure!.leaveBy = '21:00';
    t.departure!.flightTime = '00:30';
    expect(rulesOf(t)).not.toContain('departure-time');
    // toplam süre yoksa adımların toplamı kullanılır
    t.departure!.totalMinutes = null;
    t.departure!.steps[1].durationMinutes = 120;
    expect(rulesOf(t)).toContain('departure-time');
  });
  it('konaklama var ama varış ya da dönüş tarifi yok', () => {
    const t = clone();
    t.arrival = null;
    const w = checkPlan(t).filter((x) => x.rule === 'lodging-transfer');
    expect(w).toHaveLength(1);
    expect(w[0].message).toContain('varış');
    t.lodging = null;
    expect(rulesOf(t)).not.toContain('lodging-transfer');
  });
  it('uyarılı plan yine de içe aktarılır', () => {
    const t = clone();
    t.arrival = null;
    const r = processImportText(JSON.stringify(t));
    expect(r.kind).toBe('trips');
  });
});

describe('kullanıcı durumu ve plan güncellemesi', () => {
  it('anahtarlar addan türetilir, Türkçe harfler sadeleşir', () => {
    expect(slug('ÖRNEK Saat Kulesi')).toBe('ornek-saat-kulesi');
    expect(slug('Işık Çeşmesi')).toBe('isik-cesmesi');
    expect(stopKey({ name: 'A b' })).toBe('s:a-b');
    expect(venueKey({ name: 'A b' })).toBe('v:a-b');
    expect(eventKey({ date: '2027-05-14', title: 'X Y' })).toBe('e:2027-05-14:x-y');
  });
  it('iğne düzeltmesi plana uygulanır, plan kaydı değişmez', () => {
    const t = clone();
    const us = emptyUserState('x');
    us.pins[stopKey(t.days[1].stops[2])] = { lat: 1, lng: 2 };
    const m = applyPins(t, us);
    expect(m.days[1].stops[2].lat).toBe(1);
    expect(m.days[1].stops[2].coordSource).toBe('manual');
    expect(t.days[1].stops[2].lat).toBeNull();
  });
  it('planda konaklama yokken işaretlenen otel konaklama olur', () => {
    const t = clone();
    t.lodging = null;
    const us = emptyUserState('x');
    us.pins.lodging = { lat: 3, lng: 4 };
    expect(applyPins(t, us).lodging).toMatchObject({ lat: 3, lng: 4, coordSource: 'manual' });
  });
  it('güncelleme özeti: eklenen, çıkan, saati değişen', () => {
    const a = clone();
    const b = clone();
    expect(diffIsEmpty(diffPlans(a, b))).toBe(true);
    b.days[0].stops = b.days[0].stops.filter((s) => s.order !== 4);
    b.days[0].stops.push({ ...b.days[0].stops[0], order: 6, name: 'ÖRNEK Yeni Durak' });
    b.days[0].timeline.find((i) => i.stopOrder === 2)!.time = '11:00';
    const d = diffPlans(a, b);
    expect(d.removed.map((x) => x.name)).toEqual(['ÖRNEK Çeşme Sokağı']);
    expect(d.added.map((x) => x.name)).toEqual(['ÖRNEK Yeni Durak']);
    expect(d.timeChanged).toEqual([{ date: '2027-05-14', name: 'ÖRNEK Saat Kulesi', from: '10:30–11:00', to: '11:00' }]);
  });
});
