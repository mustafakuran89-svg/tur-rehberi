import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import v1 from '../../e2e/fixtures/plan-v1.json';
import v2 from '../../e2e/fixtures/plan-v2.json';
import v3 from '../../e2e/fixtures/plan-v3.json';
import { validatePlan } from './validate';
import { checkPlan, wordCount, type RuleId } from './rules';
import { processImportText } from './importPlan';
import type { Trip } from './types';
import { migrateSettings, DEFAULT_SETTINGS } from '../lib/settings';

const clone = (): Trip => structuredClone(sample) as Trip;
const rulesOf = (t: Trip): RuleId[] => checkPlan(t).map((w) => w.rule);
const words = (n: number) => Array.from({ length: n }, (_, i) => `sözcük${i}`).join(' ');

describe('şema sürüm 3', () => {
  it('dört sürümün örnekleri değişmeden içe aktarılır', () => {
    for (const [p, ver] of [[v1, 1], [v2, 2], [v3, 3], [sample, 4]] as const) {
      expect((p as { schemaVersion: number }).schemaVersion).toBe(ver);
      expect(validatePlan(p).ok).toBe(true);
      const r = processImportText(JSON.stringify(p));
      expect(r.kind).toBe('trips');
    }
  });
  it('örnek gezi sürüm 3 alanlarını taşır ve yeni uyarıları vermez', () => {
    const t = clone();
    expect(t.pronunciations?.length).toBeGreaterThan(0);
    expect(t.days[0].stops[0].altNames?.length).toBeGreaterThan(0);
    const v = t.days[1].stops[0].videos?.[0];
    expect(v?.title).toContain('ÖRNEK');
    expect(v?.startSeconds).toBeLessThan(v!.endSeconds!);
    const r = rulesOf(t);
    for (const id of ['narration-short-missing', 'narration-short-length', 'narration-length', 'video-range'] as RuleId[]) expect(r).not.toContain(id);
  });
  it('bilinmeyen alan reddedilir (videoda)', () => {
    const t = clone() as unknown as { days: { stops: { videos?: Record<string, unknown>[] }[] }[] };
    t.days[1].stops[0].videos![0].bitis = 5;
    expect(validatePlan(t).ok).toBe(false);
  });
});

describe('sürüm 3 uyarıları', () => {
  it('ana durakta kısa anlatım yok', () => {
    const t = clone();
    t.days[0].stops[0].narrationShort = null;
    const w = checkPlan(t).filter((x) => x.rule === 'narration-short-missing');
    expect(w).toHaveLength(1);
    expect(w[0].stopOrder).toBe(1);
    // küçük durakta kısa anlatım beklenmez
    expect(t.days[0].stops[3].kind).toBe('minor');
    expect(checkPlan(t).filter((x) => x.rule === 'narration-short-missing' && x.stopOrder === 4)).toHaveLength(0);
  });
  it('kısa anlatım 40 kelimeden kısa ya da 90 kelimeden uzun', () => {
    const t = clone();
    t.days[0].stops[0].narrationShort = words(39);
    expect(rulesOf(t)).toContain('narration-short-length');
    t.days[0].stops[0].narrationShort = words(40);
    expect(rulesOf(t)).not.toContain('narration-short-length');
    t.days[0].stops[0].narrationShort = words(90);
    expect(rulesOf(t)).not.toContain('narration-short-length');
    t.days[0].stops[0].narrationShort = words(91);
    expect(rulesOf(t)).toContain('narration-short-length');
  });
  it('ana durakta uzun anlatım 120-300 kelime (üst sınır 300)', () => {
    const t = clone();
    t.days[0].stops[0].narration = words(119);
    expect(rulesOf(t)).toContain('narration-length');
    t.days[0].stops[0].narration = words(250); // sürüm 2'nin 200 sınırını aşar ama artık geçerlidir
    expect(rulesOf(t)).not.toContain('narration-length');
    t.days[0].stops[0].narration = words(301);
    expect(rulesOf(t)).toContain('narration-length');
    // küçük durakta uzunluk sınırı yok
    const u = clone();
    u.days[0].stops[3].narration = words(5);
    expect(rulesOf(u)).not.toContain('narration-length');
  });
  it('video bitişi başlangıçtan büyük değil', () => {
    const t = clone();
    const v = t.days[1].stops[0].videos![0];
    v.endSeconds = v.startSeconds;
    expect(rulesOf(t)).toContain('video-range');
    v.endSeconds = (v.startSeconds ?? 0) - 10;
    expect(rulesOf(t)).toContain('video-range');
    v.endSeconds = (v.startSeconds ?? 0) + 1;
    expect(rulesOf(t)).not.toContain('video-range');
    v.startSeconds = null;
    v.endSeconds = 30;
    expect(rulesOf(t)).not.toContain('video-range');
  });
  it('kelime sayımı boşluk ve satır sonlarını tek ayırıcı sayar', () => {
    expect(wordCount('  bir\n\niki   üç ')).toBe(3);
    expect(wordCount(null)).toBe(0);
  });
});

describe('cihaz ayarları', () => {
  it('eski ayar kaydı yumuşak rehber başlangıcına geçer; kanal listesi Ayrıcalıklı Rotalar ile başlar', () => {
    const s = migrateSettings({ rate: 1, autoNarrate: false } as never);
    expect(s.rate).toBe(0.9);
    expect(s.pitch).toBe(0.95);
    expect(s.voicePreset).toBe('soft');
    expect(s.autoNarrate).toBe(false);
    expect(s.channels[0].handle).toBe('@AyricalikliRotalar');
    expect(DEFAULT_SETTINGS.narrationLength).toBe('short');
  });
  it('yeni ayar kaydı korunur', () => {
    const s = migrateSettings({ rate: 1.15, pitch: 1, voicePreset: 'fast', channels: [] });
    expect(s.rate).toBe(1.15);
    expect(s.channels).toEqual([]);
  });
});
