// Video bölümleri: açıklamadaki zaman damgalı satırlar ("12:34 Belvedere Sarayı",
// "1:02:10 - Schönbrunn", "3) ▶ 4:05 Hofburg"). Başlangıç damgadır, bitiş sonraki damgadır;
// sonraki yoksa video sonudur. 30 saniyeden kısa bölüm aday olmaz.
// Durak eşleşmesi büyük/küçük harf, Türkçe karakter ve aksan farkı gözetmez; genel sözcükler
// (saray, müze, kilise…) tek başına eşleşme sayılmaz.

export interface Chapter {
  start: number; // saniye
  end: number | null; // saniye, videonun başından; null = video sonu
  title: string;
}

export const MIN_CHAPTER_SECONDS = 30;

const STAMP = /(?<![\d:])(\d{1,2}:)?(\d{1,2}):(\d{2})(?![\d:])/;

function stampSeconds(m: RegExpMatchArray): number {
  const h = m[1] ? Number(m[1].slice(0, -1)) : 0;
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Başlığın başındaki ve sonundaki numara, tire, ayraç ve simgeleri ayıklar. */
export function cleanTitle(s: string): string {
  return s
    .replace(/^[\s\p{P}\p{S}]*(?:\d{1,3}\s*[.)\]-]\s+)?/u, '')
    .replace(/^[\s\p{P}\p{S}]+/u, '')
    .replace(/[\s\p{P}\p{S}]+$/u, '')
    .trim();
}

/** Açıklamadan bölümleri çıkarır. Damga satırın başında (numara ve simgeden sonra) ya da sonunda olmalı. */
export function parseChapters(description: string | undefined | null, durationSeconds?: number | null): Chapter[] {
  if (!description) return [];
  const raw: { start: number; title: string }[] = [];
  for (const line of description.split(/\r?\n/)) {
    const m = line.match(STAMP);
    if (!m || m.index === undefined) continue;
    const before = line.slice(0, m.index);
    const after = line.slice(m.index + m[0].length);
    let title = '';
    // "12:34 Başlık" (önünde yalnız numara/simge) ya da "Başlık 12:34" (arkasında bir şey yok)
    if (/^[\s\p{P}\p{S}]*(\d{1,3}\s*[.)\]-]?\s*)?[\s\p{P}\p{S}]*$/u.test(before)) title = cleanTitle(after);
    else if (/^[\s\p{P}\p{S}]*$/u.test(after)) title = cleanTitle(before);
    if (!title || !/\p{L}/u.test(title)) continue;
    raw.push({ start: stampSeconds(m), title });
  }
  raw.sort((a, b) => a.start - b.start);
  const uniq = raw.filter((c, i) => i === 0 || c.start !== raw[i - 1].start);
  const out: Chapter[] = [];
  uniq.forEach((c, i) => {
    const end = i + 1 < uniq.length ? uniq[i + 1].start : (durationSeconds ?? null);
    if (end !== null && end - c.start < MIN_CHAPTER_SECONDS) return;
    if (durationSeconds && c.start >= durationSeconds) return;
    out.push({ start: c.start, end: i + 1 < uniq.length ? uniq[i + 1].start : null, title: c.title });
  });
  return out;
}

/** Karşılaştırma biçimi: küçük harf, Türkçe ve aksanlı harfler sadeleşir, harf-rakam dışı boşluk. */
export function foldText(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export const foldWords = (s: string): string[] => foldText(s).split(' ').filter(Boolean);

// Genel sözcükler: tek başına eşleşme sayılmaz. Ekli biçimler (sarayı, müzesine, kulesi…) kökle yakalanır.
const GENERIC_STEMS = ['saray', 'muze', 'kilise', 'katedral', 'cami', 'meydan', 'kopru', 'kule', 'park', 'carsi', 'pazar', 'eski', 'yeni', 'buyuk', 'ornek'];
const GENERIC_WORDS = new Set(['ve', 'ile', 'the', 'of', 'and', 'de', 'da', 'der', 'die', 'das', 'la', 'le', 'il', 'di', 'del', 'des', 'von', 'am', 'im', 'st', 'sankt', 'saint', 'museum', 'palace', 'church', 'square', 'bridge', 'tower', 'market', 'old', 'new', 'cathedral', 'mosque', 'schloss', 'kirche', 'dom', 'platz', 'brucke', 'turm', 'markt']);

export function isGeneric(w: string): boolean {
  if (GENERIC_WORDS.has(w) || w.length < 3) return true;
  return GENERIC_STEMS.some((g) => w === g || (w.startsWith(g) && w.length - g.length <= 4));
}

/** Bir adın ayırt edici sözcükleri; yalnız genel sözcüklerden oluşan ad boş döner. */
export function distinctive(name: string): string[] {
  return foldWords(name).filter((w) => !isGeneric(w));
}

const wordHit = (needle: string, hay: string[]) => hay.some((h) => h === needle || (needle.length >= 5 && h.startsWith(needle) && h.length - needle.length <= 4));

/** Metin, adlardan birinin bütün ayırt edici sözcüklerini taşıyor mu? */
export function matchesAnyName(text: string, names: string[]): boolean {
  const hay = foldWords(text);
  return names.some((n) => {
    const d = distinctive(n);
    return d.length > 0 && d.every((w) => wordHit(w, hay));
  });
}

/** Durağın aday adları: plandaki ad ("ÖRNEK" etiketi ayıklanır) ve diğer adlar. */
export function stopNames(stop: { name: string; altNames?: string[] }): string[] {
  return [stop.name, ...(stop.altNames ?? [])].map((n) => n.replace(/ÖRNEK\s*/g, '').trim()).filter(Boolean);
}

/** Durakla eşleşen ilk bölüm. */
export function findChapter(chapters: Chapter[], names: string[]): Chapter | null {
  return chapters.find((c) => matchesAnyName(c.title, names)) ?? null;
}

/** 754 → "12:34", 3730 → "1:02:10". */
export function formatStamp(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
