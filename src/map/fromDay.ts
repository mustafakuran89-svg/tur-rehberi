import type { Day } from '../plan/types';
import { stopsInOrder } from '../plan/normalize';
import { estimateLegMinutes, hasCoord } from '../lib/geo';
import { formatMinutes } from '../lib/format';
import { href, paths } from '../lib/router';
import { tr } from '../i18n/tr';
import type { MapLeg, MapPoint, PointKind } from './types';

export function legText(mode: 'walk' | 'drive' | 'transit', minutes: number | null, approx: boolean): string {
  const m = tr.leg[mode];
  return minutes === null ? tr.leg.unknown(m) : tr.leg.text(formatMinutes(minutes), m, approx);
}

/**
 * Günün harita verisi. Numara Stop.order'dan gelir. Koordinatı olmayan yer haritaya konmaz.
 * Kahvaltı/öğle/akşam/ara mekanları harfli işaretle gösterilir ve rotaya dahil edilmez.
 */
export function dayMapData(day: Day, tripKey: string, dayIndex: number, opts: { venues?: boolean } = {}): { points: MapPoint[]; legs: MapLeg[] } {
  const points: MapPoint[] = [];
  const legs: MapLeg[] = [];
  const stops = stopsInOrder(day);
  stops.forEach((s, i) => {
    if (hasCoord(s)) {
      points.push({ id: `s${s.order}`, lat: s.lat, lng: s.lng, label: String(s.order), kind: 'stop', title: `${s.order}. ${s.name}`, href: href(paths.stop(tripKey, dayIndex, s.order)) });
    }
    const next = stops[i + 1];
    if (next && s.legToNext && hasCoord(s) && hasCoord(next)) {
      let minutes = s.legToNext.minutes;
      let approx = s.legToNext.approx;
      if (minutes === null) {
        minutes = estimateLegMinutes(s, next, s.legToNext.mode);
        approx = true;
      }
      legs.push({ id: `l${s.order}`, from: s, to: next, mode: s.legToNext.mode, text: tr.leg.short(formatMinutes(minutes), approx) });
    }
  });
  if (opts.venues !== false) {
    const add = (list: typeof day.breakfast, kind: PointKind) =>
      list.forEach((v) => {
        if (hasCoord(v)) points.push({ id: `v${v.code}`, lat: v.lat, lng: v.lng, label: v.code, kind, title: `${v.code} ${v.name}`, href: href(paths.food(tripKey, dayIndex)) + `?${v.code}` });
      });
    add(day.breakfast, 'breakfast');
    if (day.lunch) add([day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])], 'lunch');
    add(day.dinner, 'dinner');
    add(day.snacks, 'snack');
  }
  return { points, legs };
}
