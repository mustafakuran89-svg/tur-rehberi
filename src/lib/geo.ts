export interface LatLng {
  lat: number;
  lng: number;
}

const R = 6371000; // dünya yarıçapı, metre
const rad = (d: number) => (d * Math.PI) / 180;

/** İki nokta arası kuş uçuşu mesafe (metre). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** a'dan b'ye pusula yönü, derece (0 = kuzey, saat yönünde). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Yönü sekiz ana yönden birine indirger (0 kuzey ... 7 kuzeybatı). */
export function compassIndex(deg: number): number {
  return Math.round(((deg % 360) + 360) % 360 / 45) % 8;
}

// Etap süresi yaklaşık hesabı: kuş uçuşu × 1,3 (yol dolanma katsayısı).
export const DETOUR_FACTOR = 1.3;
export const WALK_KMH = 4.5;
// Araç ve toplu taşıma için şehir içi ortalama (karar: ürün tanımında yalnız yürüyüş hızı verildiği
// için, süresi bilinmeyen araç etaplarında 25 km/sa varsayılır; ekranda "yaklaşık" yazar).
export const DRIVE_KMH = 25;
export const TRANSIT_KMH = 18;

export function estimateLegMinutes(from: LatLng, to: LatLng, mode: 'walk' | 'drive' | 'transit'): number {
  const km = (distanceM(from, to) * DETOUR_FACTOR) / 1000;
  const kmh = mode === 'walk' ? WALK_KMH : mode === 'drive' ? DRIVE_KMH : TRANSIT_KMH;
  return Math.max(1, Math.round((km / kmh) * 60));
}

export function hasCoord<T extends { lat: number | null; lng: number | null }>(x: T): x is T & LatLng {
  return typeof x.lat === 'number' && typeof x.lng === 'number' && Number.isFinite(x.lat) && Number.isFinite(x.lng);
}

/** Sayıların ortancası. */
export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
