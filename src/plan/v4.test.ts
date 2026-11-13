import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import v3 from '../../e2e/fixtures/plan-v3.json';
import { validatePlan } from './validate';
import { checkPlan, type RuleId } from './rules';
import type { Trip } from './types';
import { emptyUserState, migrateKeys, stopKey, venueKey, eventKey, slug } from '../lib/userState';

const clone = (): Trip => structuredClone(sample) as Trip;
const rulesOf = (t: Trip): RuleId[] => checkPlan(t).map((w) => w.rule);
const words = (n: number) => Array.from({ length: n }, (_, i) => `k${i}`).join(' ');

describe('şema sürüm 4', () => {
  it('örnek gezi geçer ve yeni alanları taşır; yeni uyarı vermez', () => {
    const t = clone();
    expect(validatePlan(t).ok).toBe(true);
    expect(t.schemaVersion).toBe(4);
    expect(t.tips?.length).toBeGreaterThan(3);
    expect(t.discover?.length).toBeGreaterThan(3);
    expect(t.happenings?.length).toBe(2);
    expect(t.days[0].stops.every((s) => s.id)).toBe(true);
    const r = rulesOf(t);
    for (const id of ['dup-id', 'ticket-tip', 'happening-dates', 'discover-short'] as RuleId[]) expect(r).not.toContain(id);
  });
  it('keşfet ve ipucu alanlarında bilinmeyen alan reddedilir', () => {
    const t = clone() as unknown as { discover: Record<string, unknown>[] };
    t.discover[0].puan = 5;
    expect(validatePlan(t).ok).toBe(false);
  });
});

describe('sürüm 4 uyarıları', () => {
  it('yinelenen kimlik', () => {
    const t = clone();
    t.days[1].stops[0].id = t.days[0].stops[0].id;
    expect(rulesOf(t)).toContain('dup-id');
    const u = clone();
    u.discover![0].id = u.days[0].stops[0].id!;
    expect(rulesOf(u)).toContain('dup-id');
  });
  it('biletli durakta bilet ipucu yok', () => {
    const t = clone();
    t.days[0].stops[1].tips = t.days[0].stops[1].tips!.filter((x) => x.kind !== 'ticket');
    expect(checkPlan(t).filter((w) => w.rule === 'ticket-tip').map((w) => w.stopOrder)).toEqual([2]);
  });
  it('gezi boyunca etkinliğin tarihi geziyle kesişmiyor', () => {
    const t = clone();
    t.happenings![0].date = '2027-06-01';
    t.happenings![0].endDate = '2027-06-30';
    expect(rulesOf(t)).toContain('happening-dates');
    t.happenings![0].date = '2027-05-15'; // tek gün, gezi içinde
    t.happenings![0].endDate = null;
    expect(rulesOf(t)).not.toContain('happening-dates');
  });
  it('keşfet tanıtımı 20 kelimeden kısa', () => {
    const t = clone();
    t.discover![0].description = words(19);
    expect(rulesOf(t)).toContain('discover-short');
    t.discover![0].description = words(20);
    expect(rulesOf(t)).not.toContain('discover-short');
  });
});

describe('kalıcı kimlik ve anahtar göçü', () => {
  it('kimlik varsa anahtar kimliğe, yoksa ada bağlı', () => {
    expect(stopKey({ name: 'ÖRNEK Saat Kulesi', id: 'kule' })).toBe('s#kule');
    expect(stopKey({ name: 'ÖRNEK Saat Kulesi' })).toBe(`s:${slug('ÖRNEK Saat Kulesi')}`);
    expect(venueKey({ name: 'x', id: 'gun1-a1' })).toBe('v#gun1-a1');
    expect(eventKey({ title: 'x', date: '2027-05-14', id: 'konser' })).toBe('e#konser');
  });
  it('kimliksiz plandaki işaretler kimlikli plana kayıpsız taşınır; ad değişse de kimlikte kalır', () => {
    const old = v3 as unknown as Trip; // kimliksiz
    const t = clone();
    const s1old = old.days[0].stops[1];
    const us = emptyUserState('ornek-gezi');
    us.visited[stopKey(s1old)] = '2027-05-14T10:00:00Z';
    us.notes[stopKey(s1old)] = 'Kule güzel';
    us.going[eventKey(old.days[0].eveningEvents![0])] = true;
    us.tipSteps[`${stopKey(s1old)}|bileti-nasil-alirim`] = [0, 1];
    us.route['2027-05-14'] = { added: [{ place: { key: 'p#x', source: 'own', name: 'X', lat: 1, lng: 1, savedAt: '' }, after: stopKey(s1old) }], order: null };
    const m = migrateKeys(t, us)!;
    const k = stopKey(t.days[0].stops[1]);
    expect(k).toBe('s#ornek-saat-kulesi');
    expect(m.visited[k]).toBe('2027-05-14T10:00:00Z');
    expect(m.notes[k]).toBe('Kule güzel');
    expect(m.visited[stopKey(s1old)]).toBeUndefined();
    expect(m.going[eventKey(t.days[0].eveningEvents![0])]).toBe(true);
    expect(m.tipSteps[`${k}|bileti-nasil-alirim`]).toEqual([0, 1]);
    expect(m.route['2027-05-14'].added[0].after).toBe(k);
    // ikinci kez çalışınca değişiklik yok
    expect(migrateKeys(t, m)).toBeNull();
    // durağın adı değişse de işaret kimlikte kalır
    const renamed = clone();
    renamed.days[0].stops[1].name = 'ÖRNEK Yeni Adlı Kule';
    expect(stopKey(renamed.days[0].stops[1])).toBe(k);
  });
});
