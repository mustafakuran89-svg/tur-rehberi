// Rehber anlatımı yardımcıları (Geliştirme 3, Aşama C): cümle bölme, okunuş sözlüğü, kısa ve uzun
// anlatım, yaklaşık süre. Uygulama anlatım metnine bir şey eklemez; kısaltılmış anlatım uzun
// anlatımın ilk cümleleridir ve ekranda "kısaltılmış" diye belirtilir.
import type { Pronunciation, Stop } from '../plan/types';

/** Nokta ile biten ama cümle bitirmeyen kısaltmalar (küçük harfle, sondaki nokta olmadan). */
const ABBR = new Set([
  'dr', 'prof', 'doç', 'doc', 'sn', 'st', 'vb', 'vs', 'örn', 'orn', 'bkz', 'yy', 'no', 'nr', 'mr', 'mrs', 'ms', 'jr', 'sr', 'av', 'ltd', 'şti', 'sti',
  'cad', 'sok', 'mah', 'apt', 'm.ö', 'm.s', 'mö', 'ms', 's', 'sf', 'yak', 'ca', 'bl', 'tel', 'str', 'hl', 'gen', 'kap', 'ord', 'yrd', 'top', 'nam', 'vd',
]);

/** Paragraf: boş satırla (ya da satır sonuyla) ayrılan metin parçası. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Paragrafı cümlelere böler. Kısaltma, tarih (14.05.2027), binlik ayırıcı (1.234), sıra sayısı
 * ("19. yüzyıl"), Roma rakamı ("II. Joseph") ve ad baş harfi ("J. Strauss") cümle sonu sayılmaz.
 */
export function splitSentences(paragraph: string): string[] {
  const s = paragraph.replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  let start = 0;
  const re = /[.!?…]+["'”’»)]*(?=\s|$)/g;
  for (const m of s.matchAll(re)) {
    const end = m.index! + m[0].length;
    const rest = s.slice(end).trimStart();
    const next = rest[0];
    if (m[0][0] === '.' && next !== undefined) {
      const tok = (s.slice(start, m.index!).match(/(\S+)$/)?.[1] ?? '').replace(/^[("'“‘«]+/, '');
      const low = tok.toLocaleLowerCase('tr');
      if (ABBR.has(low)) continue;
      if (/^[IVXLC]+$/.test(tok)) continue; // Roma rakamı
      if (/^\p{Lu}$/u.test(tok)) continue; // baş harf
      if (/^\d{1,3}$/.test(tok) && /\p{Ll}/u.test(next)) continue; // sıra sayısı
      if (/\p{Ll}/u.test(next)) continue; // küçük harfle süren metin
    }
    const sentence = s.slice(start, end).trim();
    if (sentence) out.push(sentence);
    start = end;
  }
  const tail = s.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

export interface SpeechUnit {
  text: string; // ekranda görünen cümle
  paragraph: number;
  pauseAfter: 'sentence' | 'paragraph' | 'end';
}

/** Anlatımı okunacak birimlere çevirir: cümle arası kısa, paragraf arası uzun duraklama. */
export function speechUnits(text: string): SpeechUnit[] {
  const out: SpeechUnit[] = [];
  const ps = paragraphs(text);
  ps.forEach((p, pi) => {
    const ss = splitSentences(p);
    ss.forEach((t, si) => out.push({ text: t, paragraph: pi, pauseAfter: si < ss.length - 1 ? 'sentence' : pi < ps.length - 1 ? 'paragraph' : 'end' }));
  });
  return out;
}

export const PAUSE_MS = { sentence: 350, paragraph: 900, end: 0 } as const;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Okunuş sözlüğü: metindeki ad yerine okunuşu seslendirilir (ekrandaki yazı değişmez).
 * En uzun eşleşme önce gelir; kesme işaretiyle ek almış ad da eşleşir ("Schönbrunn'a" → "Şönbrun'a").
 */
export function applyPronunciations(text: string, list: Pronunciation[] | undefined | null): string {
  const items = (list ?? []).filter((p) => p.text.trim() && p.say.trim()).sort((a, b) => b.text.length - a.text.length);
  if (!items.length) return text;
  const map = new Map(items.map((p) => [p.text.toLocaleLowerCase('tr'), p.say]));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${items.map((p) => esc(p.text)).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  return text.replace(re, (m) => map.get(m.toLocaleLowerCase('tr')) ?? m);
}

export interface NarrationChoice {
  text: string;
  abridged: boolean; // kısa anlatım planda yok; uzun anlatımın ilk cümleleri
}

/** Kısa anlatım: planda varsa o; yoksa uzun anlatımın ilk iki (gerekirse üç) cümlesi. */
export function shortNarration(stop: Pick<Stop, 'narration' | 'narrationShort'>): NarrationChoice {
  const own = stop.narrationShort?.trim();
  if (own) return { text: own, abridged: false };
  const ss = paragraphs(stop.narration).flatMap(splitSentences);
  let n = Math.min(2, ss.length);
  if (ss.length > 2 && ss.slice(0, 2).join(' ').split(/\s+/).length < 30) n = 3;
  return { text: ss.slice(0, n).join(' '), abridged: ss.length > n };
}

export function narrationFor(stop: Pick<Stop, 'narration' | 'narrationShort'>, length: 'short' | 'long'): NarrationChoice {
  return length === 'short' ? shortNarration(stop) : { text: stop.narration, abridged: false };
}

/** Yaklaşık okuma süresi (dakika). Türkçe cihaz sesi hız 1'de dakikada ~130 kelime okur. */
export function estimateMinutes(text: string, rate = 1): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / (130 * Math.max(0.5, rate))));
}
