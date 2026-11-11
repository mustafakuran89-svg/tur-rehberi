import type { Transfer, Trip } from '../plan/types';
import type { LatLng } from '../lib/geo';
import { stopsInOrder } from '../plan/normalize';

/**
 * Örnek gezinin bütün noktalarını kaydırır: 1. günün 1. durağı, verilen konumun
 * `offsetNorthM` metre kuzeyine gelir. Noktalar arası düzen korunur.
 * Yalnızca ÖRNEK gezi için kullanılır (simülasyon); gerçek planın koordinatı değiştirilmez.
 */
export function moveTripNear(trip: Trip, here: LatLng, offsetNorthM = 120): Trip {
  const anchor = stopsInOrder(trip.days[0]).find((s) => s.lat !== null && s.lng !== null);
  if (!anchor || anchor.lat === null || anchor.lng === null) return trip;
  const target = { lat: here.lat + offsetNorthM / 111320, lng: here.lng };
  const dLat = target.lat - anchor.lat;
  // Boylam derecesinin uzunluğu enleme göre değişir; doğu-batı uzaklıklar korunur.
  const k = Math.cos((anchor.lat * Math.PI) / 180) / Math.cos((target.lat * Math.PI) / 180);
  const mv = <T extends { lat: number | null; lng: number | null }>(x: T): T =>
    x.lat === null || x.lng === null
      ? x
      : { ...x, lat: +(x.lat + dLat).toFixed(6), lng: +(target.lng + (x.lng - anchor.lng!) * k).toFixed(6) };
  const mvTransfer = (t: Transfer): Transfer => {
    const hub = mv({ lat: t.hubLat ?? null, lng: t.hubLng ?? null });
    return { ...t, hubLat: hub.lat, hubLng: hub.lng, steps: t.steps.map((s) => ({ ...s, ...mv({ lat: s.lat ?? null, lng: s.lng ?? null }) })) };
  };
  return {
    ...trip,
    days: trip.days.map((d) => ({
      ...d,
      stops: d.stops.map(mv),
      breakfast: d.breakfast.map(mv),
      lunch: d.lunch ? { main: mv(d.lunch.main), backup: d.lunch.backup ? mv(d.lunch.backup) : null } : null,
      dinner: d.dinner.map(mv),
      snacks: d.snacks.map(mv),
      eveningEvents: d.eveningEvents?.map(mv),
    })),
    lodging: trip.lodging ? mv(trip.lodging) : trip.lodging,
    arrival: trip.arrival ? mvTransfer(trip.arrival) : trip.arrival,
    departure: trip.departure ? mvTransfer(trip.departure) : trip.departure,
  };
}
