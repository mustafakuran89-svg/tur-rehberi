// YouTube videosu: plan ya da kullanıcı videosu yoksa ve Ayarlar'da YouTube veri anahtarı varsa
// uygulama Türkçe video arar. Anahtar yalnız bu cihazın yerel deposunda durur; plana, yedeğe,
// paylaşım dosyasına, önbelleğe ve hata günlüğüne yazılmaz.
// Resmi kota (developers.google.com/youtube/v3/determine_quota_cost, 11.11.2026): search.list
// günde 100 çağrılık ayrı kovadan 1 birim; videos.list 10.000 birimlik günlük kotadan 1 birim.
import type { Video } from '../plan/types';
import { cacheGet, cachePut, DAY_MS, fresh } from './cache';
import { findChapter, foldText, parseChapters } from './chapters';

const KEY_STORE = 'tur-rehberi:youtube-key';
export const SEARCH_EVERY_MS = 30 * DAY_MS; // durak başına en çok 30 günde bir arama
export const MIN_SECONDS = 2 * 60;
export const MAX_SECONDS = 30 * 60;
export const KEEP = 5;

export function getYoutubeKey(): string {
  try {
    return localStorage.getItem(KEY_STORE) ?? '';
  } catch {
    return '';
  }
}
export function setYoutubeKey(k: string): void {
  try {
    if (k.trim()) localStorage.setItem(KEY_STORE, k.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch {
    /* yok say */
  }
}
export const YOUTUBE_KEY_STORE = KEY_STORE;

/** ISO 8601 süre (PT1H2M3S) → saniye. */
export function isoDurationSeconds(d: string | undefined): number | null {
  const m = d?.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

export function normalizeWords(s: string): string[] {
  return s
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Yer adlarında ayırt edici olmayan genel sözcükler (normalize edilmiş biçimde)
const GENERIC = new Set(
  'ornek sarayi saray muzesi muze museum kilisesi kilise church camii cami mosque meydani meydan square kulesi kule tower parki park bahcesi bahce garden sokagi sokak caddesi cadde kopru koprusu bridge pazar pazari market katedrali katedral cathedral bazilika the of and ve ile de da tarihi eski yeni buyuk kucuk kent sehir city old new'.split(' '),
);

/** Durak adının ayırt edici sözcükleri; hiçbiri kalmazsa adın bütün sözcükleri. */
export function distinctiveWords(name: string): string[] {
  const all = normalizeWords(name).filter((w) => w.length >= 3);
  const d = all.filter((w) => !GENERIC.has(w));
  return d.length ? d : all;
}

const TR_WORDS = new Set('ve bir ile icin bu nasil gezisi gezi rehberi tarihi hakkinda nerede gezilecek yerler sarayi muzesi turu belgesel'.split(' '));

/** Videonun dili Türkçe mi: dil alanı varsa ona, yoksa başlık ve açıklamaya bakılır. */
export function looksTurkish(sn: { title?: string; description?: string; defaultAudioLanguage?: string; defaultLanguage?: string }): boolean {
  const lang = sn.defaultAudioLanguage ?? sn.defaultLanguage;
  if (lang) return lang.toLowerCase().startsWith('tr');
  const text = `${sn.title ?? ''} ${sn.description ?? ''}`;
  if (/[ğışĞİŞ]/.test(text)) return true;
  const hits = normalizeWords(text).filter((w) => TR_WORDS.has(w)).length;
  return hits >= 2;
}

export interface YtVideoItem {
  id: string;
  snippet?: { title?: string; description?: string; channelTitle?: string; channelId?: string; defaultAudioLanguage?: string; defaultLanguage?: string; liveBroadcastContent?: string };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string };
  liveStreamingDetails?: unknown;
}

/** Genel aramadan gelen aday: bölüm bilgisi ve kanal "rehber" işareti taşıyabilir. */
export interface PickedVideo extends Video {
  rehber?: boolean;
}

/**
 * Eleme ve sıralama (genel arama): Türkçe, canlı yayın değil; ya açıklamasında durakla eşleşen
 * bölüm var (süre sınırı yok, bölümden oynar) ya da 2-30 dakika ve başlıkta durak adının ayırt
 * edici sözcüğü. Beğeni sayısı büyükten küçüğe; beğenisi gizli olanlar sonra, izlenme sayısına
 * göre; eşitlikte kanal adında ya da tanıtımında "rehber" geçen öne. İlk beş aday döner.
 * names: durağın adı ve diğer adları (ilk öge plandaki ad).
 */
export function pickVideos(items: YtVideoItem[], stopName: string | string[], today: string, rehberChannels: Set<string> = new Set()): PickedVideo[] {
  const names = Array.isArray(stopName) ? stopName : [stopName];
  const words = distinctiveWords(names[0] ?? '');
  const chapterOf = new Map<string, ReturnType<typeof findChapter>>();
  const ok = items.filter((v) => {
    const sn = v.snippet ?? {};
    if (!looksTurkish(sn)) return false;
    if ((sn.liveBroadcastContent && sn.liveBroadcastContent !== 'none') || v.liveStreamingDetails) return false;
    const sec = isoDurationSeconds(v.contentDetails?.duration);
    if (sec === null) return false;
    const ch = findChapter(parseChapters(sn.description, sec), names);
    if (ch) {
      chapterOf.set(v.id, ch);
      return true;
    }
    if (sec < MIN_SECONDS || sec > MAX_SECONDS) return false;
    const title = new Set(normalizeWords(sn.title ?? ''));
    return words.some((w) => title.has(w));
  });
  const isRehber = (v: YtVideoItem) => rehberChannels.has(v.snippet?.channelId ?? '') || /\brehber/.test(foldText(v.snippet?.channelTitle ?? ''));
  const num = (x: string | undefined) => (x === undefined ? null : Number(x));
  ok.sort((a, b) => {
    const la = num(a.statistics?.likeCount);
    const lb = num(b.statistics?.likeCount);
    let d = 0;
    if (la !== null && lb !== null) d = lb - la;
    else if (la !== null) return -1;
    else if (lb !== null) return 1;
    else d = (num(b.statistics?.viewCount) ?? 0) - (num(a.statistics?.viewCount) ?? 0);
    return d || Number(isRehber(b)) - Number(isRehber(a)); // eşitlikte rehber kanalı öne
  });
  return ok.slice(0, KEEP).map((v) => ({
    youtubeId: v.id,
    title: v.snippet?.title ?? '',
    channel: v.snippet?.channelTitle ?? null,
    language: v.snippet?.defaultAudioLanguage ?? v.snippet?.defaultLanguage ?? null,
    durationSeconds: isoDurationSeconds(v.contentDetails?.duration),
    likeCount: num(v.statistics?.likeCount),
    viewCount: num(v.statistics?.viewCount),
    checkedAt: today,
    source: 'auto' as const,
    channelId: v.snippet?.channelId ?? null,
    startSeconds: chapterOf.get(v.id)?.start ?? null,
    endSeconds: chapterOf.get(v.id)?.end ?? null,
    chapterTitle: chapterOf.get(v.id)?.title ?? null,
    rehber: isRehber(v),
  }));
}

/** YouTube bağlantısından video kimliği (youtu.be, watch?v=, shorts, embed, live). */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return valid(u.pathname.slice(1));
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      if (u.searchParams.get('v')) return valid(u.searchParams.get('v')!);
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      if (m) return valid(m[1]);
    }
  } catch {
    /* geçersiz adres */
  }
  return null;
}
const valid = (id: string) => (/^[A-Za-z0-9_-]{11}$/.test(id) ? id : null);

export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
// Gizlilik dostu gömme (youtube-nocookie.com). playsinline: iPhone'da sayfa içinde oynar.
// start/end: bölüm; end videonun başından ölçülür (developers.google.com/youtube/player_parameters, 12.11.2026).
export const embedUrl = (id: string, start?: number | null, end?: number | null) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0${start ? `&start=${Math.floor(start)}` : ''}${end ? `&end=${Math.floor(end)}` : ''}`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const searchUrl = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export function videoQueryFor(stop: { name: string; videoQuery?: string | null }, city: string): string {
  if (stop.videoQuery?.trim()) return stop.videoQuery.trim();
  const name = stop.name.replace(/ÖRNEK\s*/g, '').trim();
  return `${name} ${city}`.trim();
}

export class YoutubeError extends Error {}

/** Arama + istatistik (+ kanal tanıtımı) çağrısı. Hata mesajına anahtar ya da adres girmez. */
export async function searchVideos(query: string, stopName: string | string[], key: string, fetchFn: typeof fetch = fetch): Promise<PickedVideo[]> {
  const base = 'https://www.googleapis.com/youtube/v3';
  const sp = new URLSearchParams({ part: 'snippet', type: 'video', q: query, relevanceLanguage: 'tr', regionCode: 'TR', videoEmbeddable: 'true', maxResults: '25', key });
  const r1 = await fetchFn(`${base}/search?${sp}`);
  if (!r1.ok) throw new YoutubeError(`YouTube arama yanıtı ${r1.status}`);
  const j1 = (await r1.json()) as { items?: { id?: { videoId?: string } }[] };
  const ids = (j1.items ?? []).map((i) => i.id?.videoId).filter((x): x is string => !!x);
  if (!ids.length) return [];
  const vp = new URLSearchParams({ part: 'snippet,contentDetails,statistics,liveStreamingDetails', id: ids.join(','), key });
  const r2 = await fetchFn(`${base}/videos?${vp}`);
  if (!r2.ok) throw new YoutubeError(`YouTube istatistik yanıtı ${r2.status}`);
  const j2 = (await r2.json()) as { items?: YtVideoItem[] };
  // Kanal tanıtımında "rehber" geçiyor mu (1 birim; başarısız olursa yalnız kanal adına bakılır)
  const rehber = new Set<string>();
  const chIds = [...new Set((j2.items ?? []).map((v) => v.snippet?.channelId).filter((x): x is string => !!x))].slice(0, 50);
  if (chIds.length) {
    try {
      const r3 = await fetchFn(`${base}/channels?${new URLSearchParams({ part: 'snippet', id: chIds.join(','), key })}`);
      if (r3.ok) {
        const j3 = (await r3.json()) as { items?: { id: string; snippet?: { title?: string; description?: string } }[] };
        for (const c of j3.items ?? []) if (/\brehber/.test(foldText(`${c.snippet?.title ?? ''} ${c.snippet?.description ?? ''}`))) rehber.add(c.id);
      }
    } catch {
      /* yok say */
    }
  }
  return pickVideos(j2.items ?? [], stopName, new Date().toISOString().slice(0, 10), rehber);
}

export interface VideoCandidates {
  checkedAt: string;
  candidates: PickedVideo[];
}
export const videoCacheKey = (tripId: string, stopKey: string) => `yt:${tripId}:${stopKey}`;

/**
 * Önbellekteki adayları döndürür; 30 günden eskiyse ve anahtar varsa yeniden arar.
 * force: önbellek 30 günden yeni olsa bile aramaz (kota korunur); yalnız yoksa arar.
 */
export async function getCandidates(tripId: string, stopKey: string, query: string, stopName: string | string[], key: string): Promise<VideoCandidates | null> {
  const ck = videoCacheKey(tripId, stopKey);
  const c = await cacheGet<VideoCandidates>(ck);
  if (fresh(c, SEARCH_EVERY_MS) || !key) return c?.data ?? null;
  const candidates = await searchVideos(query, stopName, key);
  const data = { checkedAt: new Date().toISOString().slice(0, 10), candidates };
  await cachePut(ck, data);
  return data;
}

export async function cachedCandidates(tripId: string, stopKey: string): Promise<VideoCandidates | null> {
  return (await cacheGet<VideoCandidates>(videoCacheKey(tripId, stopKey)))?.data ?? null;
}
