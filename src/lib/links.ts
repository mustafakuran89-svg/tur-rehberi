// Dış bağlantılar. Uygulama rezervasyon ya da bilet işlemini kendisi yapmaz; yapılacağı sayfaya
// götürür. Yalnızca https adres kabul edilir; yoksa düğme görünmez.
import type { LatLng } from './geo';
import type { Lodging } from '../plan/types';

export function safeHttps(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const x = new URL(u.trim());
    return x.protocol === 'https:' ? x.toString() : null;
  } catch {
    return null;
  }
}

export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const n = phone.replace(/[^\d+]/g, '');
  return n.replace(/\D/g, '').length >= 3 ? `tel:${n}` : null;
}

/**
 * "Otele dön": bulunulan konum biliniyorsa oradan otele toplu taşıma yol tarifi; bilinmiyorsa
 * hedefi otel olan yol tarifi (Haritalar kendi konumunu kullanır). Otelin koordinatı yoksa adres aranır.
 */
export function returnToHotelUrl(l: Pick<Lodging, 'name' | 'address' | 'lat' | 'lng'>, pos: LatLng | null): string {
  if (typeof l.lat !== 'number' || typeof l.lng !== 'number') return `https://maps.apple.com/?q=${encodeURIComponent(l.address || l.name)}`;
  const dest = `daddr=${l.lat},${l.lng}`;
  const q = l.name ? `&q=${encodeURIComponent(l.name)}` : '';
  if (pos) return `https://maps.apple.com/?saddr=${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}&${dest}&dirflg=r${q}`;
  return `https://maps.apple.com/?${dest}&dirflg=r${q}`;
}

// Tur modunun son konumu: "Otele dön" konum izni istemeden bunu kullanır (konum izni yalnız turda istenir).
let lastPos: { p: LatLng; t: number } | null = null;
export function setLastKnownPosition(p: LatLng): void {
  lastPos = { p, t: Date.now() };
}
export function lastKnownPosition(maxAgeMs = 10 * 60 * 1000): LatLng | null {
  return lastPos && Date.now() - lastPos.t <= maxAgeMs ? lastPos.p : null;
}
