// Fotoğraf galerisi: önce planla gelen görseller; altıdan azsa Türkçe Vikipedi maddesindeki
// görseller, madde yoksa durak adıyla Wikimedia Commons araması. Yalnızca Commons'ta barınan,
// lisansı ve eser sahibi okunabilen bitmap dosyalar. Simge, logo, harita, plan çizimi ve küçük
// görseller elenir. Anahtarsız; anonim CORS isteği origin=* ile yapılır
// (mediawiki.org/wiki/API:Cross-site_requests). Tarayıcı User-Agent değiştiremediği için
// Api-User-Agent başlığı gönderilir (Wikimedia User-Agent politikası).
import type { PlanImage } from '../plan/types';
import { cacheGet, cachePut, DAY_MS, fresh } from './cache';

export const MAX_GALLERY = 6;
export const GALLERY_TTL = 30 * DAY_MS;
const MIN_W = 600;
const MIN_H = 400;
const FULL_W = 1920;
const API_UA = 'TurRehberi/2.0 (https://github.com/mustafakuran89-svg/tur-rehberi)';

export interface GalleryImage {
  thumb: string; // galeri (küçük)
  full: string; // tam ekran (büyük)
  credit: string;
  license: string;
  sourceUrl: string | null;
  from: 'plan' | 'wiki' | 'commons';
}

export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isCommonsUrl(u: string): boolean {
  return /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\/commons\//.test(u);
}

const SKIP_TITLE = /(logo|icon|ikon|simge|\bmap\b|harita|karte|\bplan\b|plano|grundriss|floor|flag|bayrak|coat[ _]of[ _]arms|\barma\b|wappen|locator|location|diagram|şema|symbol|sembol|signature|imza|seal|mühür|blank|button)/i;
const OK_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface CommonsPage {
  title: string;
  missing?: string | boolean;
  imagerepository?: string;
  imageinfo?: {
    url: string;
    thumburl?: string;
    width: number;
    height: number;
    mime: string;
    descriptionurl?: string;
    extmetadata?: Record<string, { value?: string } | undefined>;
  }[];
}

/** Commons sayfalarını galeri görseline çevirir; uymayanları eler. */
export function filterCommonsPages(pages: CommonsPage[], from: 'wiki' | 'commons'): GalleryImage[] {
  const out: GalleryImage[] = [];
  for (const p of pages) {
    if (p.missing !== undefined || (p.imagerepository && p.imagerepository !== 'local' && p.imagerepository !== 'shared')) continue;
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    if (!OK_MIME.has(ii.mime)) continue;
    if (ii.width < MIN_W || ii.height < MIN_H) continue;
    if (SKIP_TITLE.test(p.title)) continue;
    const credit = stripHtml(ii.extmetadata?.Artist?.value ?? '');
    const license = stripHtml(ii.extmetadata?.LicenseShortName?.value ?? '');
    if (!credit || !license) continue; // lisansı ya da eser sahibi okunamayan gösterilmez
    const orig = ii.url;
    const thumb = (ii.thumburl ?? orig).split('?')[0];
    if (!isCommonsUrl(orig) || !isCommonsUrl(thumb)) continue;
    const full = ii.width > FULL_W && ii.thumburl ? thumb.replace(/\/\d+px-/, `/${FULL_W}px-`) : orig;
    out.push({ thumb, full, credit, license, sourceUrl: ii.descriptionurl ?? null, from });
  }
  return out;
}

export function planImages(imgs: PlanImage[] | undefined): GalleryImage[] {
  return (imgs ?? [])
    .filter((i) => i.url.startsWith('https://') && i.credit.trim() && i.license.trim())
    .map((i) => ({ thumb: i.url, full: i.url, credit: i.credit.trim(), license: i.license.trim(), sourceUrl: i.sourceUrl ?? null, from: 'plan' as const }));
}

/** Plan görselleri önce; gizlenenler ve tekrarlar çıkar; en çok altı. */
export function mergeGallery(plan: GalleryImage[], fetched: GalleryImage[], hidden: string[] = [], max = MAX_GALLERY): GalleryImage[] {
  const seen = new Set<string>();
  const hid = new Set(hidden);
  const out: GalleryImage[] = [];
  for (const g of [...plan, ...fetched]) {
    if (hid.has(g.thumb) || hid.has(g.full) || seen.has(g.thumb)) continue;
    seen.add(g.thumb);
    out.push(g);
    if (out.length >= max) break;
  }
  return out;
}

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const II = { prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '960', iiextmetadatafilter: 'Artist|LicenseShortName' };

async function getJson(url: string, fetchFn: typeof fetch): Promise<unknown> {
  const r = await fetchFn(url, { headers: { 'Api-User-Agent': API_UA } });
  if (!r.ok) throw new Error(`Wikimedia yanıtı ${r.status}`);
  return r.json();
}

function pagesOf(j: unknown): CommonsPage[] {
  const pages = (j as { query?: { pages?: Record<string, CommonsPage> } }).query?.pages ?? {};
  return Object.values(pages);
}

/** Türkçe Vikipedi maddesindeki dosyalar. Madde yoksa null. */
export async function wikiImages(title: string, fetchFn: typeof fetch = fetch): Promise<GalleryImage[] | null> {
  const q = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: title, prop: 'images', imlimit: '50', redirects: '1' });
  const j = await getJson(`https://tr.wikipedia.org/w/api.php?${q}`, fetchFn);
  const page = pagesOf(j)[0] as (CommonsPage & { images?: { title: string }[] }) | undefined;
  if (!page || page.missing !== undefined) return null;
  const files = (page.images ?? [])
    .map((i) => i.title.replace(/^(Dosya|File):/, 'File:'))
    .filter((t) => /\.(jpe?g|png|webp)$/i.test(t))
    .slice(0, 40);
  if (!files.length) return [];
  const p = new URLSearchParams({ action: 'query', format: 'json', origin: '*', titles: files.join('|'), ...II });
  return filterCommonsPages(pagesOf(await getJson(`${COMMONS_API}?${p}`, fetchFn)), 'wiki');
}

/** Durak adıyla Commons araması. */
export async function commonsSearch(name: string, fetchFn: typeof fetch = fetch): Promise<GalleryImage[]> {
  const q = name.replace(/\bÖRNEK\b/g, '').trim();
  if (!q) return [];
  const p = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '20', ...II });
  return filterCommonsPages(pagesOf(await getJson(`${COMMONS_API}?${p}`, fetchFn)), 'commons');
}

export const galleryCacheKey = (stopName: string, wiki: string | null | undefined) => `gal:${wiki ? 'w:' + wiki : 'c:' + stopName}`;

/**
 * Durak için uygulamanın bulduğu görseller (önbellekli, 30 gün). allowSearch false ise yalnız
 * Vikipedi maddesine bakılır (örnek gezide uydurma durak adıyla arama yapılmaz).
 */
export async function fetchedImages(stop: { name: string; wikipediaTr?: string | null }, opts: { allowSearch: boolean; offlineOnly?: boolean }): Promise<GalleryImage[]> {
  const ck = galleryCacheKey(stop.name, stop.wikipediaTr);
  const c = await cacheGet<GalleryImage[]>(ck);
  if (fresh(c, GALLERY_TTL) || opts.offlineOnly || (typeof navigator !== 'undefined' && !navigator.onLine)) return c?.data ?? [];
  if (!stop.wikipediaTr && !opts.allowSearch) return [];
  let imgs: GalleryImage[] | null = null;
  if (stop.wikipediaTr) imgs = await wikiImages(stop.wikipediaTr);
  if (imgs === null) imgs = opts.allowSearch ? await commonsSearch(stop.name) : [];
  await cachePut(ck, imgs);
  return imgs;
}

export function wikipediaUrl(title: string): string {
  return `https://tr.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}
