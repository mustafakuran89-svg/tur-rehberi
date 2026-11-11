// Apple Haritalar bağlantısı. Koordinat varsa yol tarifi, yoksa adres araması açar.
export function appleMapsUrl(
  p: { name: string; lat: number | null; lng: number | null; address: string },
  mode: 'walk' | 'drive' | 'transit' = 'walk',
): string {
  const flag = mode === 'walk' ? 'w' : mode === 'transit' ? 'r' : 'd';
  if (typeof p.lat === 'number' && typeof p.lng === 'number') {
    return `https://maps.apple.com/?daddr=${p.lat},${p.lng}&dirflg=${flag}&q=${encodeURIComponent(p.name)}`;
  }
  return `https://maps.apple.com/?q=${encodeURIComponent(p.address || p.name)}`;
}
