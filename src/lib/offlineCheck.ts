// Çevrimdışı hazır denetimi (Geliştirme 3, Aşama D.2): hazırlığın sonunda uygulama gereken her
// kaynağı AĞA ÇIKMADAN okur ve sonucu satır satır verir. Sonuç gezi kartındaki rozetin kaynağıdır.
import type { Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { cacheGet, cachePut, storedImage, DAY_MS } from './cache';
import { fetchedImages, mergeGallery, planImages } from './gallery';
import { cachedCandidates, thumbUrl } from './youtube';
import { cachedWeather } from './weather';
import { stopKey, type UserState } from './userState';
import { getSettings } from './settings';
import { findVoice, resolveVoice, voicesKnown } from './speech';
import { countAreaTiles, openArchive, savedRegionFor, tripArea } from '../map/regions';
import { mapAssetUrls } from '../map/regionStyle';
import { tripPoints } from './prepare';
import { cachedIndexes } from './channels';
import { rankVideos } from './videoRank';
import { formatNumber } from './format';
import { tr } from '../i18n/tr';

export type CheckState = 'ok' | 'warn' | 'fail' | 'info';
export interface CheckLine {
  id: 'map' | 'fonts' | 'photos' | 'thumbs' | 'voice' | 'app' | 'weather' | 'video';
  state: CheckState;
  text: string;
}
export interface OfflineStatus {
  at: string; // ISO
  ready: boolean;
  lines: CheckLine[];
}

export const statusKey = (tripKey: string) => `prep:${tripKey}`;
export const STALE_MS = 21 * DAY_MS; // bu kadar eski hazırlık "eski" sayılır

const mb = (b: number) => `${formatNumber(Math.round((b / 1e6) * 10) / 10)} MB`;

async function inSwCache(url: string): Promise<boolean> {
  try {
    return !!(await caches.match(url, { ignoreSearch: true }));
  } catch {
    return false;
  }
}

/** Hazırlıkta kaydedilen fotoğraf adresleri (galeri listeleri önbellekten; ağ yok). */
export async function photoUrls(t: Trip, us: UserState | undefined): Promise<string[]> {
  const urls: string[] = [];
  const stops = t.days.flatMap((d) => stopsInOrder(d));
  for (const s of stops) {
    const fetched = await fetchedImages(s, { allowSearch: false, offlineOnly: true });
    mergeGallery(planImages(s.images), fetched, us?.hiddenImages[stopKey(s)] ?? []).forEach((g) => urls.push(g.thumb));
  }
  t.days.forEach((d) => [...d.breakfast, ...d.dinner, ...d.snacks, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : [])].forEach((v) => planImages(v.images)[0] && urls.push(planImages(v.images)[0].thumb)));
  return [...new Set(urls)];
}

export async function offlineCheck(tripKey: string, t: Trip, us: UserState | undefined): Promise<OfflineStatus> {
  const lines: CheckLine[] = [];
  const pts = tripPoints(t);

  // 1. Harita
  const region = await savedRegionFor(pts);
  const pm = region ? await openArchive(region) : null;
  if (region && pm) {
    const area = tripArea(pts)!;
    const { have, want } = await countAreaTiles(pm, area, 12, region.maxzoom);
    lines.push(have === want ? { id: 'map', state: 'ok', text: tr.prepare.checkMap(formatNumber(have), mb(region.bayt)) } : { id: 'map', state: 'warn', text: tr.prepare.checkMapPartial(have, want) });
  } else {
    let n = 0;
    try {
      n = (await (await caches.open('harita')).keys()).length;
    } catch {
      /* yok */
    }
    lines.push(n ? { id: 'map', state: 'warn', text: tr.prepare.checkMapCache(n) } : { id: 'map', state: 'fail', text: tr.prepare.checkMapNone });
  }
  if (region) {
    const assets = mapAssetUrls();
    let a = 0;
    for (const u of assets) if (await inSwCache(u)) a++;
    lines.push({ id: 'fonts', state: a === assets.length ? 'ok' : 'warn', text: tr.prepare.checkFonts(a, assets.length) });
  }

  // 2. Fotoğraflar
  const photos = await photoUrls(t, us);
  let p = 0;
  for (const u of photos) if (await storedImage(u)) p++;
  if (photos.length) lines.push({ id: 'photos', state: p === photos.length ? 'ok' : 'warn', text: tr.prepare.checkPhotos(p, photos.length) });

  // 3. Video küçük resimleri (gösterilecek ilk video)
  const settings = getSettings();
  const ix = await cachedIndexes(settings.channels);
  const ids = new Set<string>();
  for (const s of t.days.flatMap((d) => stopsInOrder(d))) {
    const general = (await cachedCandidates(tripKey, stopKey(s)))?.candidates ?? [];
    const top = rankVideos({ stop: s, city: t.destinations[0] ?? '', userVideo: us?.videos[stopKey(s)], channels: settings.channels, indexes: ix, general })[0];
    if (top) ids.add(top.youtubeId);
  }
  let th = 0;
  for (const id of ids) if (await storedImage(thumbUrl(id))) th++;
  if (ids.size) lines.push({ id: 'thumbs', state: th === ids.size ? 'ok' : 'warn', text: tr.prepare.checkThumbs(th, ids.size) });

  // 4. Ses: seçilen ses ağ istemeden çalışıyor mu
  if (voicesKnown()) {
    const off = resolveVoice('tr-TR', settings.voiceURI, false);
    const chosen = settings.voiceURI ? resolveVoice('tr-TR', settings.voiceURI, true) : null;
    if (!off && !findVoice('tr-TR')) lines.push({ id: 'voice', state: 'fail', text: tr.prepare.checkVoiceNone });
    else if (chosen && !chosen.localService) lines.push({ id: 'voice', state: 'warn', text: tr.prepare.checkVoiceNet });
    else lines.push({ id: 'voice', state: 'ok', text: tr.prepare.checkVoice });
  }

  // 5. Uygulama kabuğu (service worker önbelleği)
  const app = await inSwCache(new URL(`${import.meta.env.BASE_URL}index.html`, location.origin).toString());
  lines.push(app ? { id: 'app', state: 'ok', text: tr.prepare.checkApp } : { id: 'app', state: 'warn', text: tr.prepare.checkAppNo });

  // 6. Hava
  lines.push((await cachedWeather(tripKey)) ? { id: 'weather', state: 'ok', text: tr.prepare.checkWeather } : { id: 'weather', state: 'info', text: tr.prepare.checkWeatherNo });

  // 7. Video
  lines.push({ id: 'video', state: 'info', text: tr.prepare.checkVideo });

  // Video internet istediği için küçük resim eksiği ve internet isteyen ses rozeti "Eksik var" yapmaz;
  // satırda yine eksik olarak görünür.
  const ready = !lines.some((l) => l.state === 'fail' || (l.state === 'warn' && l.id !== 'voice' && l.id !== 'thumbs'));
  const st: OfflineStatus = { at: new Date().toISOString(), ready, lines };
  await cachePut(statusKey(tripKey), st);
  return st;
}

export async function getOfflineStatus(tripKey: string): Promise<OfflineStatus | null> {
  return (await cacheGet<OfflineStatus>(statusKey(tripKey)))?.data ?? null;
}

/** Gezi başlangıcına 2 gün ya da daha az kaldı ve hazırlık eksik ya da eski mi? */
export function needsRefresh(startDate: string, endDate: string, st: OfflineStatus | null, now = new Date()): number | null {
  const day = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
  const today = day(now.toISOString().slice(0, 10));
  const left = Math.round((day(startDate) - today) / DAY_MS);
  if (left > 2 || day(endDate) < today) return null;
  if (st && st.ready && now.getTime() - new Date(st.at).getTime() < STALE_MS) return null;
  return Math.max(0, left);
}
