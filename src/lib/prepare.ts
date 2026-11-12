// "Geziyi hazırla" (Geliştirme 3): öncelikli kanal dizinleri ve durak videoları bulunur, video
// küçük resimleri ve fotoğraflar cihaza kaydedilir, hava tahmini alınır, gezi bölgesinin harita
// dosyası indirilir; sonunda uygulama ağa çıkmadan kendini sınar (src/lib/offlineCheck.ts).
// Harita: gezi alanını kapsayan bölge paketi varsa o indirilir (src/map/regions.ts). Yoksa eski
// yol: OpenFreeMap karoları ısıtılır. OpenFreeMap koşulu (openfreemap.org/quick_start, 12.11.2026):
// çevrimdışı indirme en çok 3.000 karo / 50 MB, en çok 4 paralel istek ve özgün User-Agent ister.
// Tarayıcı User-Agent'ı değiştiremediği için bu yol yalnız tarayıcının olağan önbelleğine dayanır
// ve en çok 500 karo ile sınırlıdır; tam çevrimdışı garantisi yalnız bölge paketindedir.
import type { Trip } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { storeImage } from './cache';
import { fetchedImages, mergeGallery, planImages } from './gallery';
import { cachedCandidates, getCandidates, getYoutubeKey, thumbUrl, videoQueryFor } from './youtube';
import { getWeather, forecastRange } from './weather';
import { stopKey, type UserState } from './userState';
import { hasCoord, type LatLng } from './geo';
import { getSettings } from './settings';
import { cachedIndexes, getIndex } from './channels';
import { needsGeneralSearch, rankVideos } from './videoRank';
import { requestPersist } from './store';
import { BASEMAP_STYLE_URL } from '../map/config';
import { downloadRegion, savedRegions, type Region } from '../map/regions';
import { offlineCheck, type OfflineStatus } from './offlineCheck';

export const MAX_TILES = 500;
export const PARALLEL = 4;
export const TILE_ZOOMS = [12, 13, 14, 15];

export interface PrepStep {
  id: 'videos' | 'photos' | 'thumbs' | 'weather' | 'map';
  done: number;
  total: number;
  unit?: 'bytes';
  state: 'wait' | 'run' | 'ok' | 'partial' | 'skip' | 'fail';
}
export interface PrepReport {
  steps: PrepStep[];
  missing: string[];
  /** YouTube kotası: liste/ayrıntı birimi (10.000/gün) ve arama çağrısı (100/gün). */
  quota: { units: number; searches: number };
  check?: OfflineStatus;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const x = items[i++];
        await fn(x);
      }
    }),
  );
}

/** Enlem/boylamdan karo numarası (Web Mercator). */
export function tileXY(p: LatLng, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const x = Math.floor(((p.lng + 180) / 360) * n);
  const r = (p.lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

/** Noktaları kapsayan karolar; küçük yakınlaştırmadan başlar, sınıra gelince durur. */
export function tilesFor(points: LatLng[], zooms = TILE_ZOOMS, max = MAX_TILES): { z: number; x: number; y: number }[] {
  if (!points.length) return [];
  const lat = points.map((p) => p.lat);
  const lng = points.map((p) => p.lng);
  const pad = 0.004;
  const nw = { lat: Math.max(...lat) + pad, lng: Math.min(...lng) - pad };
  const se = { lat: Math.min(...lat) - pad, lng: Math.max(...lng) + pad };
  const out: { z: number; x: number; y: number }[] = [];
  for (const z of zooms) {
    const a = tileXY(nw, z);
    const b = tileXY(se, z);
    const count = (b.x - a.x + 1) * (b.y - a.y + 1);
    if (out.length + count > max) break;
    for (let x = a.x; x <= b.x; x++) for (let y = a.y; y <= b.y; y++) out.push({ z, x, y });
  }
  return out;
}

/** Gezi alanının noktaları: durak, mekan, etkinlik, otel (havalimanı dahil değil; bölge seçimini daraltmasın). */
export function tripPoints(t: Trip): LatLng[] {
  const pts: LatLng[] = [];
  const add = (x: { lat?: number | null; lng?: number | null }) => x.lat != null && x.lng != null && hasCoord({ lat: x.lat, lng: x.lng }) && pts.push({ lat: x.lat, lng: x.lng });
  t.days.forEach((d) => {
    d.stops.forEach(add);
    [...d.breakfast, ...d.dinner, ...d.snacks, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : [])].forEach(add);
    (d.eveningEvents ?? []).forEach(add);
  });
  if (t.lodging) add(t.lodging);
  return pts;
}

async function warmMap(points: LatLng[], onTile: () => void): Promise<number> {
  const style = (await (await fetch(BASEMAP_STYLE_URL)).json()) as { sources: Record<string, { url?: string }>; glyphs?: string; sprite?: string; layers: { layout?: Record<string, unknown> }[] };
  const src = Object.values(style.sources).find((s) => s.url);
  if (!src?.url) throw new Error('karo kaynağı yok');
  const tj = (await (await fetch(src.url)).json()) as { tiles: string[] };
  const tpl = tj.tiles[0];
  const fonts = new Set<string>();
  style.layers.forEach((l) => {
    const f = l.layout?.['text-font'];
    if (Array.isArray(f) && f.every((x) => typeof x === 'string')) fonts.add(f.join(','));
  });
  const extras: string[] = [];
  if (style.glyphs) for (const f of fonts) for (const r of ['0-255', '256-511', '8192-8447']) extras.push(style.glyphs.replace('{fontstack}', encodeURIComponent(f)).replace('{range}', r));
  if (style.sprite) for (const sfx of ['.json', '.png', '@2x.json', '@2x.png']) extras.push(style.sprite + sfx);
  await pool(extras, PARALLEL, async (u) => {
    await fetch(u).catch(() => undefined);
  });
  const tiles = tilesFor(points);
  let ok = 0;
  await pool(tiles, PARALLEL, async (t) => {
    try {
      const r = await fetch(tpl.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)));
      if (r.ok) ok++;
    } catch {
      /* yok say */
    }
    onTile();
  });
  return ok;
}

export async function prepareTrip(key: string, t: Trip, isSample: boolean, us: UserState | undefined, onProgress: (r: PrepReport) => void, opts: { region?: Region | null } = {}): Promise<PrepReport> {
  const rep: PrepReport = {
    steps: (['videos', 'thumbs', 'photos', 'weather', 'map'] as const).map((id) => ({ id, done: 0, total: 0, state: 'wait' as const })),
    missing: [],
    quota: { units: 0, searches: 0 },
  };
  const step = (id: PrepStep['id']) => rep.steps.find((s) => s.id === id)!;
  const emit = () => onProgress({ ...rep, steps: rep.steps.map((s) => ({ ...s })), missing: [...rep.missing] });
  await requestPersist();
  const city = t.destinations[0] ?? '';
  const stops = t.days.flatMap((d) => stopsInOrder(d));

  // 1. Videolar: önce öncelikli kanal dizinleri (30 günde bir), sonra gerekirse genel arama
  const ytKey = getYoutubeKey();
  const settings = getSettings();
  const vs = step('videos');
  vs.total = stops.length;
  vs.state = 'run';
  emit();
  if (ytKey) {
    for (const c of settings.channels) {
      try {
        const r = await getIndex(c, ytKey);
        if (r.built && r.index) rep.quota.units += r.index.calls;
      } catch {
        vs.state = 'partial';
      }
    }
  }
  const indexes = await cachedIndexes(settings.channels);
  const thumbIds = new Set<string>();
  for (const s of stops) {
    const k = stopKey(s);
    let general = (await cachedCandidates(key, k))?.candidates ?? [];
    let ranked = rankVideos({ stop: s, city, userVideo: us?.videos[k], channels: settings.channels, indexes, general });
    if (ytKey && needsGeneralSearch(ranked) && !general.length) {
      try {
        const before = (await cachedCandidates(key, k))?.checkedAt;
        general = (await getCandidates(key, k, videoQueryFor(s, city), [s.name, ...(s.altNames ?? [])], ytKey))?.candidates ?? [];
        if ((await cachedCandidates(key, k))?.checkedAt !== before) {
          rep.quota.searches++;
          rep.quota.units += 2; // ayrıntı ve kanal tanıtımı
        }
        ranked = rankVideos({ stop: s, city, userVideo: us?.videos[k], channels: settings.channels, indexes, general });
      } catch {
        vs.state = 'partial';
      }
    }
    if (ranked[0]) thumbIds.add(ranked[0].youtubeId);
    else rep.missing.push(`video:${s.name}`);
    vs.done++;
    emit();
  }
  if (!ytKey) rep.missing.push('nokey');
  vs.state = vs.state === 'partial' ? 'partial' : 'ok';

  // 2. Video küçük resimleri
  const ts = step('thumbs');
  const ids = [...thumbIds];
  ts.total = ids.length;
  ts.state = 'run';
  emit();
  let thumbFail = 0;
  await pool(ids, PARALLEL, async (id) => {
    if (!(await storeImage(thumbUrl(id)))) thumbFail++;
    ts.done++;
    emit();
  });
  ts.state = thumbFail ? 'partial' : 'ok';

  // 3. Fotoğraflar (durak galerileri ve mekan kapakları)
  const ps = step('photos');
  ps.state = 'run';
  const urls: string[] = [];
  for (const s of stops) {
    let fetched: Awaited<ReturnType<typeof fetchedImages>> = [];
    try {
      fetched = await fetchedImages(s, { allowSearch: !isSample });
    } catch {
      /* galeri servisi yanıt vermedi */
    }
    mergeGallery(planImages(s.images), fetched, us?.hiddenImages[stopKey(s)] ?? []).forEach((g) => urls.push(g.thumb));
  }
  t.days.forEach((d) => [...d.breakfast, ...d.dinner, ...d.snacks, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : [])].forEach((v) => planImages(v.images)[0] && urls.push(planImages(v.images)[0].thumb)));
  const uniq = [...new Set(urls)];
  ps.total = uniq.length;
  emit();
  let photoFail = 0;
  await pool(uniq, PARALLEL, async (u) => {
    if (!(await storeImage(u))) photoFail++;
    ps.done++;
    emit();
  });
  if (photoFail) rep.missing.push(`photos:${photoFail}`);
  ps.state = photoFail ? 'partial' : 'ok';

  // 4. Hava
  const ws = step('weather');
  ws.total = 1;
  ws.state = 'run';
  emit();
  if (!forecastRange(t, new Date())) {
    ws.state = 'skip';
    rep.missing.push('noforecast');
  } else {
    const w = await getWeather(t, key);
    ws.state = w ? 'ok' : 'fail';
  }
  ws.done = 1;
  emit();

  // 5. Harita
  const ms = step('map');
  const pts = tripPoints(t);
  ms.state = 'run';
  const region = opts.region ?? null;
  if (region) {
    ms.unit = 'bytes';
    ms.total = region.bayt;
    emit();
    const have = (await savedRegions()).find((r) => r.id === region.id && r.surum === region.surum);
    try {
      if (!have) {
        await downloadRegion(region, (p) => {
          ms.done = p.done;
          emit();
        });
      }
      ms.done = region.bayt;
      ms.state = 'ok';
    } catch {
      ms.state = 'fail';
      rep.missing.push('map');
    }
  } else {
    ms.total = tilesFor(pts).length;
    emit();
    try {
      const ok = await warmMap(pts, () => {
        ms.done++;
        emit();
      });
      ms.done = ok;
      ms.state = ok ? 'partial' : 'fail'; // bölge paketi yoksa çevrimdışı harita kısmidir
    } catch {
      ms.state = 'fail';
      rep.missing.push('map');
    }
  }
  emit();

  // 6. Çevrimdışı hazır denetimi (ağa çıkmadan)
  rep.check = await offlineCheck(key, t, us);
  emit();
  return rep;
}
