// Bölge haritasının stili: Protomaps temel haritası katmanları (@protomaps/basemaps, BSD-3),
// Türkçe ad önceliği. Karolar cihazdaki bölge dosyasından (pmtiles:// protokolü), yazı tipleri
// ve simgeler siteden gelir (service worker önbelleğinde). Sitede olmayan yazı tipi aralığı için
// ağa çıkılmaz, boş yanıt verilir: o harfler etiketlerde görünmez ama harita bozulmaz.
import { addProtocol, type StyleSpecification } from 'maplibre-gl';
import { Protocol, type PMTiles } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';

export const MAP_FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];
export const MAP_FONT_RANGES = ['0-255', '256-511', '768-1023', '1024-1279', '7680-7935', '8192-8447'];
export const MAP_SPRITES = ['light.json', 'light.png', 'light@2x.json', 'light@2x.png'];

const BASE = import.meta.env.BASE_URL;
export const assetUrl = (p: string) => new URL(`${BASE}haritalar/${p}`, location.origin).toString();
export const fontUrl = (font: string, range: string) => assetUrl(`fonts/${encodeURIComponent(font)}/${range}.pbf`);

let protocol: Protocol | null = null;

function ensureProtocols(): Protocol {
  if (protocol) return protocol;
  protocol = new Protocol();
  addProtocol('pmtiles', protocol.tile);
  addProtocol('yazi', async (params) => {
    const m = params.url.match(/^yazi:\/\/(.+)\/(\d+-\d+)\.pbf$/);
    const font = m ? decodeURIComponent(m[1]).split(',')[0].trim() : '';
    const range = m?.[2] ?? '';
    if (!MAP_FONTS.includes(font) || !MAP_FONT_RANGES.includes(range)) return { data: new ArrayBuffer(0) };
    try {
      const r = await fetch(fontUrl(font, range));
      return { data: r.ok ? await r.arrayBuffer() : new ArrayBuffer(0) };
    } catch {
      return { data: new ArrayBuffer(0) };
    }
  });
  return protocol;
}

/** Bölge dosyasını haritaya tanıtır ve stili üretir. */
export function regionStyle(pm: PMTiles): StyleSpecification {
  ensureProtocols().add(pm);
  return {
    version: 8,
    glyphs: 'yazi://{fontstack}/{range}.pbf',
    sprite: assetUrl('sprites/light'),
    sources: {
      protomaps: {
        type: 'vector',
        url: `pmtiles://${pm.source.getKey()}`,
        attribution: '<a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>',
      },
    },
    layers: layers('protomaps', namedFlavor('light'), { lang: 'tr' }) as StyleSpecification['layers'],
  };
}

/** Çevrimdışı hazır denetimi: harita stilinin yazı tipleri ve simgeleri cihazda mı. */
export function mapAssetUrls(): string[] {
  return [...MAP_FONTS.flatMap((f) => MAP_FONT_RANGES.map((r) => fontUrl(f, r))), ...MAP_SPRITES.map((s) => assetUrl(`sprites/${s}`))];
}
