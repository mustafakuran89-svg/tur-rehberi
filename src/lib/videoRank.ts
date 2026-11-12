// Durak videosu sıralaması (Geliştirme 3, Aşama B.4). İkinci turdaki sıralamanın yerini alır:
//   1. Planla gelen ya da kullanıcının sabitlediği video (planda startSeconds varsa oradan).
//   2. Öncelikli kanalda, durakla eşleşen bölümü olan video.
//   3. Öncelikli kanalda, başlığı durakla eşleşen video.
//   4. Genel aramadan gelen adaylar (ikinci turun eleme ve beğeni sıralaması; açıklamada bölüm aranır).
//   5. Öncelikli kanalda yalnız şehirle eşleşen uzun video: "şehir videosu", bölüm işaretsiz.
// Aynı basamakta kanal listesindeki sıra, sonra beğeni sayısı belirler.
import type { Stop, Video } from '../plan/types';
import type { PriorityChannel } from './settings';
import type { ChannelIndex, IndexedVideo } from './channels';
import { findChapter, matchesAnyName, stopNames } from './chapters';
import type { PickedVideo } from './youtube';

export type Tier = 1 | 2 | 3 | 4 | 5;
export interface RankedVideo extends Video {
  tier: Tier;
  priority?: boolean; // öncelikli rehber kanalından
  rehber?: boolean; // "Rehber kanalı" rozeti
  cityVideo?: boolean; // şehir videosu (bölüm işaretsiz)
  manualStart?: boolean; // başlangıç kullanıcı tarafından ayarlandı
}

export const CITY_VIDEO_MIN_SECONDS = 10 * 60;
export const RANK_KEEP = 8;

function fromIndex(v: IndexedVideo, idx: ChannelIndex, extra: Partial<RankedVideo> & { tier: Tier }, today: string): RankedVideo {
  return {
    youtubeId: v.id,
    title: v.title,
    channel: idx.title,
    channelId: idx.channelId,
    durationSeconds: v.durationSeconds,
    likeCount: v.likeCount,
    viewCount: v.viewCount,
    checkedAt: idx.fetchedAt || today,
    source: 'auto',
    priority: true,
    rehber: true,
    ...extra,
  };
}

const byLikes = (a: { likeCount?: number | null; viewCount?: number | null }, b: { likeCount?: number | null; viewCount?: number | null }) =>
  (b.likeCount ?? -1) - (a.likeCount ?? -1) || (b.viewCount ?? 0) - (a.viewCount ?? 0);

export interface RankInput {
  stop: Pick<Stop, 'name' | 'altNames' | 'videos'>;
  city: string;
  userVideo?: Video | null;
  manualStart?: { youtubeId: string; start: number } | null;
  channels: PriorityChannel[];
  indexes: (ChannelIndex | null)[]; // channels ile aynı sırada
  general: PickedVideo[];
  today?: string;
}

export function rankVideos(inp: RankInput): RankedVideo[] {
  const today = inp.today ?? new Date().toISOString().slice(0, 10);
  const names = stopNames(inp.stop);
  const cityNames = inp.city ? [inp.city.replace(/ÖRNEK\s*/g, '').trim()].filter(Boolean) : [];
  const isPriority = (v: { channelId?: string | null; channel?: string | null }) =>
    inp.indexes.some((x) => x && x.channelId === v.channelId) || inp.channels.some((c) => !!c.id && c.id === v.channelId);
  const out: RankedVideo[] = [];

  // 1. kullanıcı videosu, sonra plan videoları
  if (inp.userVideo) out.push({ ...inp.userVideo, tier: 1, priority: isPriority(inp.userVideo), rehber: isPriority(inp.userVideo) });
  for (const v of inp.stop.videos ?? []) out.push({ ...v, tier: 1, priority: isPriority(v), rehber: isPriority(v) });

  // 2, 3, 5: öncelikli kanal dizinleri (liste sırasıyla; aynı kanalda beğeniye göre)
  const t2: RankedVideo[] = [];
  const t3: RankedVideo[] = [];
  const t5: RankedVideo[] = [];
  inp.indexes.forEach((idx) => {
    if (!idx) return;
    const c2: RankedVideo[] = [];
    const c3: RankedVideo[] = [];
    const c5: RankedVideo[] = [];
    for (const v of idx.videos) {
      const ch = findChapter(v.chapters, names);
      if (ch) c2.push(fromIndex(v, idx, { tier: 2, startSeconds: ch.start, endSeconds: ch.end, chapterTitle: ch.title }, today));
      else if (matchesAnyName(v.title, names)) c3.push(fromIndex(v, idx, { tier: 3 }, today));
      else if (
        cityNames.length &&
        (v.durationSeconds ?? 0) >= CITY_VIDEO_MIN_SECONDS &&
        (matchesAnyName(v.title, cityNames) || v.chapters.some((c) => matchesAnyName(c.title, cityNames)))
      )
        c5.push(fromIndex(v, idx, { tier: 5, cityVideo: true }, today));
    }
    t2.push(...c2.sort(byLikes));
    t3.push(...c3.sort(byLikes));
    t5.push(...c5.sort(byLikes));
  });

  // 4. genel arama (sıralaması youtube.ts pickVideos içinde)
  const t4: RankedVideo[] = inp.general.map((v) => ({ ...v, tier: 4 as const, priority: isPriority(v), rehber: !!v.rehber || isPriority(v) }));

  out.push(...t2, ...t3, ...t4, ...t5);
  const seen = new Set<string>();
  const uniq = out.filter((v) => (seen.has(v.youtubeId) ? false : (seen.add(v.youtubeId), true)));

  // Elle ayarlanan başlangıç: o videoda bölüm başlangıcının yerini alır (bitiş ancak sonrasındaysa kalır)
  const ms = inp.manualStart;
  return uniq.slice(0, RANK_KEEP).map((v) =>
    ms && ms.youtubeId === v.youtubeId ? { ...v, startSeconds: ms.start, endSeconds: v.endSeconds != null && v.endSeconds > ms.start ? v.endSeconds : null, manualStart: true } : v,
  );
}

/** Basamak 1-3 bulunduysa genel aramaya gerek yoktur (arama kotası korunur). */
export const needsGeneralSearch = (ranked: RankedVideo[]) => !ranked.some((v) => v.tier <= 3);
