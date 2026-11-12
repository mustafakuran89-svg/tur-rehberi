import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import type { Trip } from '../plan/types';
import { applyPronunciations, estimateMinutes, narrationFor, paragraphs, shortNarration, speechUnits, splitSentences } from './narration';
import { GUIDE, guideLine, resetGuide } from '../i18n/guide';
import { tourSpeech, tourStartSpeech } from '../tour/guideScript';

describe('cümle bölme', () => {
  it('kısaltma cümle sonu sayılmaz', () => {
    expect(splitSentences('Dr. Freud burada yaşadı. Ev bugün müze. St. Stephan yakında.')).toEqual(['Dr. Freud burada yaşadı.', 'Ev bugün müze.', 'St. Stephan yakında.']);
    expect(splitSentences('Saray M.Ö. 15 yılında yapıldı. Sonra yıkıldı.')).toEqual(['Saray M.Ö. 15 yılında yapıldı.', 'Sonra yıkıldı.']);
    expect(splitSentences('Müze vb. yerler pazartesi kapalı. Ama bu açık.')).toHaveLength(2);
  });
  it('tarih, binlik ayırıcı, sıra sayısı, Roma rakamı ve baş harf bölünmez', () => {
    expect(splitSentences('Kule 14.05.2027 tarihinde açılır. Bilet 1.234,50 TL değil.')).toEqual(['Kule 14.05.2027 tarihinde açılır.', 'Bilet 1.234,50 TL değil.']);
    expect(splitSentences('Bina 19. yüzyılda yapıldı. Çok güzel.')).toEqual(['Bina 19. yüzyılda yapıldı.', 'Çok güzel.']);
    expect(splitSentences('II. Joseph burayı sevdi. J. Strauss burada çaldı! Sizce neden?')).toEqual(['II. Joseph burayı sevdi.', 'J. Strauss burada çaldı!', 'Sizce neden?']);
    expect(splitSentences('Kapı 1683. Sonra onarıldı.')).toEqual(['Kapı 1683.', 'Sonra onarıldı.']);
  });
  it('tırnak içinde biten cümle ve üç nokta', () => {
    expect(splitSentences('“Buraya bakın.” Sonra yürüyün… Ve durun.')).toEqual(['“Buraya bakın.”', 'Sonra yürüyün…', 'Ve durun.']);
  });
  it('paragraflar ve duraklama türleri', () => {
    const u = speechUnits('Bir. İki.\n\nÜç.');
    expect(paragraphs('a\n\nb\nc')).toEqual(['a', 'b', 'c']);
    expect(u.map((x) => [x.text, x.pauseAfter])).toEqual([
      ['Bir.', 'sentence'],
      ['İki.', 'paragraph'],
      ['Üç.', 'end'],
    ]);
  });
});

describe('okunuş sözlüğü', () => {
  const list = [
    { text: 'Schönbrunn', say: 'Şönbrun' },
    { text: 'Schloss Schönbrunn', say: 'Şlos Şönbrun' },
    { text: 'Graben', say: 'Grabın' },
  ];
  it('en uzun eşleşme önce; kesme işaretli ek korunur', () => {
    expect(applyPronunciations('Schloss Schönbrunn çok büyük.', list)).toBe('Şlos Şönbrun çok büyük.');
    expect(applyPronunciations("Yarın Schönbrunn'a gideceğiz.", list)).toBe("Yarın Şönbrun'a gideceğiz.");
    expect(applyPronunciations('Schönbrunn’dan sonra Graben.', list)).toBe('Şönbrun’dan sonra Grabın.');
  });
  it('kelimenin içinde eşleşmez; büyük küçük harf gözetmez', () => {
    expect(applyPronunciations('Grabenhof ve SCHÖNBRUNN', list)).toBe('Grabenhof ve Şönbrun');
    expect(applyPronunciations('metin', [])).toBe('metin');
  });
  it('ekrandaki yazı değişmez: sözlük yalnız okunan metne uygulanır', () => {
    const t = structuredClone(sample) as Trip;
    const pazar = t.days[1].stops[1];
    expect(pazar.narration).toContain('Mercato');
    expect(applyPronunciations(pazar.narration, t.pronunciations)).toContain('Merkato');
    expect(pazar.narration).toContain('Mercato');
  });
});

describe('kısa ve uzun anlatım', () => {
  const long = 'Bu bir. İkinci cümle burada. Üçüncü cümle de var. Dördüncü.';
  it('planda kısa anlatım varsa o okunur', () => {
    expect(shortNarration({ narration: long, narrationShort: 'Kısa metin.' })).toEqual({ text: 'Kısa metin.', abridged: false });
  });
  it('yoksa uzun anlatımın ilk iki-üç cümlesi, "kısaltılmış" işaretli; metne ekleme yapılmaz', () => {
    const r = shortNarration({ narration: long, narrationShort: null });
    expect(r.abridged).toBe(true);
    expect(r.text).toBe('Bu bir. İkinci cümle burada. Üçüncü cümle de var.');
    expect(long.startsWith(r.text)).toBe(true);
    const words = Array.from({ length: 20 }, () => 'kelime').join(' ');
    const r2 = shortNarration({ narration: `Ilk ${words}. Ikinci ${words}. Uc. Dort.`, narrationShort: null });
    expect(r2.text.split('. ')).toHaveLength(2);
  });
  it('uzun seçenek uzun anlatımdır; süre tahmini', () => {
    expect(narrationFor({ narration: long, narrationShort: 'x' }, 'long').text).toBe(long);
    expect(estimateMinutes(Array.from({ length: 130 }, () => 'a').join(' '), 1)).toBe(1);
    expect(estimateMinutes(Array.from({ length: 260 }, () => 'a').join(' '), 1)).toBe(2);
  });
});

describe('rehber ağzı', () => {
  it('art arda aynı cümle söylenmez', () => {
    resetGuide();
    let prev = '';
    for (let i = 0; i < 40; i++) {
      const s = guideLine('arrival', 'X');
      expect(s).not.toBe(prev);
      prev = s;
    }
  });
  it('her türde birkaç değişke; cümleler yalnız ad, süre ve sırayı taşır', () => {
    for (const k of Object.keys(GUIDE) as (keyof typeof GUIDE)[]) expect(GUIDE[k].length).toBeGreaterThanOrEqual(2);
    expect(guideLine('next', 'Kule', 'kuzey', 6)).toMatch(/Kule/);
    expect(guideLine('next', 'Kule', null, null)).not.toMatch(/dakika|Yönümüz/);
  });
  it('tur metni: karşılama + anlatım + sıradaki durak; son durakta günün kapanışı', () => {
    const t = structuredClone(sample) as Trip;
    const d = t.days[0];
    const s1 = tourSpeech(d, d.stops[0], 'short');
    const paras = s1.text.split('\n\n');
    expect(paras[0]).toContain('ÖRNEK Pazar Meydanı');
    expect(paras[1]).toBe(d.stops[0].narrationShort);
    expect(paras.at(-1)).toContain('ÖRNEK Saat Kulesi');
    expect(paras.at(-1)).toMatch(/6 dakika/); // plandaki yürüyüş süresi
    const last = tourSpeech(d, d.stops[4], 'long');
    expect(last.text.split('\n\n').at(-1)).toMatch(/tamamladık|sonuna geldik/);
    expect(tourStartSpeech(d, 1).startsWith('Tur başladı.')).toBe(true);
  });
});
