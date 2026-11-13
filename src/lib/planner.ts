// "Plancıya gönder": kaydedilen ve rotaya eklenen yerlerin listesi (ad, koordinat, gün, not) düz metin.
// Plan üreticisi bir sonraki sürümde bu yerleri anlatımıyla plana işler. Ağ çağrısı yapılmaz.
import { getTrip, listTrips } from './store';
import { getUserState } from './userState';
import { formatDate } from './format';
import { tr } from '../i18n/tr';

export async function plannerText(tripKey: string | null): Promise<string> {
  const recs = tripKey ? [await getTrip(tripKey)].filter((x) => !!x) : (await listTrips()).filter((r) => !r.isSample);
  const blocks: string[] = [];
  for (const rec of recs) {
    if (!rec) continue;
    const us = await getUserState(rec.key);
    const lines: string[] = [];
    const coord = (p: { lat: number | null; lng: number | null }) => (p.lat !== null && p.lng !== null ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : '—');
    for (const [date, r] of Object.entries(us.route ?? {}))
      for (const a of r.added) {
        const dayNo = rec.trip.days.findIndex((d) => d.date === date) + 1;
        lines.push(`- ${a.place.name} · ${coord(a.place)} · ${dayNo > 0 ? `${dayNo}. gün (${formatDate(date)})` : formatDate(date)}${a.place.note ? ` · Not: ${a.place.note}` : ''}`);
      }
    const inRoute = new Set(Object.values(us.route ?? {}).flatMap((r) => r.added.map((a) => a.place.key)));
    for (const p of Object.values(us.saved ?? {}))
      if (!inRoute.has(p.key)) lines.push(`- ${p.name} · ${coord(p)} · kaydedildi${p.note ? ` · Not: ${p.note}` : ''}`);
    if (lines.length) blocks.push([tr.saved.shareIntro(rec.trip.title), ...lines].join('\n'));
  }
  return blocks.join('\n\n');
}
