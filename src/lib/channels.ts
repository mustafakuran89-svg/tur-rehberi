// Öncelikli rehber kanalları ve kanal dizini.
// Anahtar varsa her kanalın yüklemeler listesi sayfa sayfa okunur; videoların kimliği, başlığı,
// bölümleri, süresi, beğeni ve izlenme sayısı cihazda saklanır (en yeni 2.000 video, 30 günde bir).
// Durak araması bu dizinde, cihazda yapılır; pahalı arama çağrısı harcanmaz.
// Resmi kota (developers.google.com/youtube/v3/determine_quota_cost, 12.11.2026): channels.list,
// playlistItems.list ve videos.list çağrı başına 1 birim, günlük 10.000 birimden; search.list ayrı
// kovadan, günde 100 çağrı.
import type { PriorityChannel } from './settings';
import { cacheGet, cachePut, DAY_MS, fresh } from './cache';
import { parseChapters, type Chapter } from './chapters';
import { isoDurationSeconds, YoutubeError } from './youtube';

export const INDEX_MAX = 2000;
export const INDEX_EVERY_MS = 30 * DAY_MS;
const API = 'https://www.googleapis.com/youtube/v3';

export interface IndexedVideo {
  id: string;
  title: string;
  chapters: Chapter[];
  durationSeconds: number | null;
  likeCount: number | null;
  viewCount: number | null;
  publishedAt?: string;
}

export interface ChannelIndex {
  channelId: string;
  title: string;
  handle?: string | null;
  fetchedAt: string;
  calls: number; // dizini kurmak için yapılan API çağrısı (kota birimi)
  videos: IndexedVideo[];
}

/** Kanal bağlantısı ya da @ad → kanal kaydı. Tanınmazsa null. */
export function parseChannelInput(input: string): PriorityChannel | null {
  const s = input.trim();
  if (!s) return null;
  if (/^@[\w.-]{3,100}$/.test(s)) return { handle: s, title: s.slice(1) };
  if (/^UC[\w-]{22}$/.test(s)) return { id: s, title: s };
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host !== 'youtube.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0]?.startsWith('@')) return { handle: decodeURIComponent(parts[0]), title: decodeURIComponent(parts[0]).slice(1) };
    if (parts[0] === 'channel' && /^UC[\w-]{22}$/.test(parts[1] ?? '')) return { id: parts[1], title: parts[1] };
  } catch {
    /* geçersiz adres */
  }
  return null;
}

export const channelKey = (c: PriorityChannel) => (c.id ? `id:${c.id}` : `h:${(c.handle ?? '').toLowerCase()}`);
export const sameChannel = (a: PriorityChannel, b: { id?: string | null; handle?: string | null }) =>
  (!!a.id && a.id === b.id) || (!!a.handle && !!b.handle && a.handle.toLowerCase() === b.handle.toLowerCase());

/** Kanalın içinde arama sayfası (anahtar yokken). Biçim: youtube.com/@ad/search?query=… */
export function channelSearchUrl(c: PriorityChannel, q: string): string {
  const base = c.handle ? `https://www.youtube.com/${encodeURIComponent(c.handle).replace('%40', '@')}` : `https://www.youtube.com/channel/${c.id}`;
  return `${base}/search?query=${encodeURIComponent(q)}`;
}

const indexKey = (c: PriorityChannel) => `ch:${channelKey(c)}`;

export async function cachedIndex(c: PriorityChannel): Promise<ChannelIndex | null> {
  return (await cacheGet<ChannelIndex>(indexKey(c)))?.data ?? null;
}

async function getJson(url: string, fetchFn: typeof fetch): Promise<Record<string, unknown>> {
  const r = await fetchFn(url);
  if (!r.ok) throw new YoutubeError(`YouTube yanıtı ${r.status}`); // adres (anahtar içerir) mesaja girmez
  return (await r.json()) as Record<string, unknown>;
}

type VideoItem = { id: string; snippet?: { title?: string; description?: string; publishedAt?: string }; contentDetails?: { duration?: string }; statistics?: { likeCount?: string; viewCount?: string } };

/** Kanal dizinini YouTube'dan kurar. Kota: 1 (kanal) + sayfa başına 1 (liste) + 50 videoda 1 (ayrıntı). */
export async function buildIndex(c: PriorityChannel, key: string, fetchFn: typeof fetch = fetch, max = INDEX_MAX): Promise<ChannelIndex> {
  let calls = 0;
  const cp = new URLSearchParams({ part: 'snippet,contentDetails', key });
  if (c.id) cp.set('id', c.id);
  else cp.set('forHandle', c.handle ?? '');
  const cj = await getJson(`${API}/channels?${cp}`, fetchFn);
  calls++;
  const ch = (cj.items as { id: string; snippet?: { title?: string; customUrl?: string }; contentDetails?: { relatedPlaylists?: { uploads?: string } } }[] | undefined)?.[0];
  const uploads = ch?.contentDetails?.relatedPlaylists?.uploads;
  if (!ch || !uploads) throw new YoutubeError('Kanal bulunamadı');
  const ids: string[] = [];
  let page: string | undefined;
  do {
    const pp = new URLSearchParams({ part: 'contentDetails', playlistId: uploads, maxResults: '50', key });
    if (page) pp.set('pageToken', page);
    const pj = await getJson(`${API}/playlistItems?${pp}`, fetchFn);
    calls++;
    for (const it of (pj.items as { contentDetails?: { videoId?: string } }[] | undefined) ?? []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    page = pj.nextPageToken as string | undefined;
  } while (page && ids.length < max);
  const videos: IndexedVideo[] = [];
  const num = (x: string | undefined) => (x === undefined ? null : Number(x));
  for (let i = 0; i < Math.min(ids.length, max); i += 50) {
    const vp = new URLSearchParams({ part: 'snippet,contentDetails,statistics', id: ids.slice(i, i + 50).join(','), key });
    const vj = await getJson(`${API}/videos?${vp}`, fetchFn);
    calls++;
    for (const v of (vj.items as VideoItem[] | undefined) ?? []) {
      const dur = isoDurationSeconds(v.contentDetails?.duration);
      videos.push({
        id: v.id,
        title: v.snippet?.title ?? '',
        chapters: parseChapters(v.snippet?.description, dur),
        durationSeconds: dur,
        likeCount: num(v.statistics?.likeCount),
        viewCount: num(v.statistics?.viewCount),
        publishedAt: v.snippet?.publishedAt,
      });
    }
  }
  return { channelId: ch.id, title: ch.snippet?.title ?? c.title, handle: c.handle ?? ch.snippet?.customUrl ?? null, fetchedAt: new Date().toISOString().slice(0, 10), calls, videos };
}

/** Önbellekteki dizin 30 günden yeniyse onu, değilse (anahtar varsa) yenisini döndürür. */
export async function getIndex(c: PriorityChannel, key: string, opts: { force?: boolean; fetchFn?: typeof fetch } = {}): Promise<{ index: ChannelIndex | null; built: boolean }> {
  const e = await cacheGet<ChannelIndex>(indexKey(c));
  if (!opts.force && fresh(e, INDEX_EVERY_MS)) return { index: e!.data, built: false };
  if (!key || !navigator.onLine) return { index: e?.data ?? null, built: false };
  const index = await buildIndex(c, key, opts.fetchFn);
  await cachePut(indexKey(c), index);
  return { index, built: true };
}

/** Bütün öncelikli kanalların önbellekteki dizinleri, kanal listesindeki sırayla. */
export async function cachedIndexes(channels: PriorityChannel[]): Promise<(ChannelIndex | null)[]> {
  return Promise.all(channels.map((c) => cachedIndex(c)));
}
