import { useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Trip, Venue } from '../plan/types';
import { dayMapData } from '../map/fromDay';
import { TripMap } from '../map/TripMap';
import type { LatLng } from '../lib/geo';
import { putTrip } from '../lib/store';
import { go, paths } from '../lib/router';
import { Header, Loading, Missing, Toast, useToast, useTrip } from '../components/ui';

function findVenue(day: Trip['days'][number], code: string): Venue | undefined {
  return [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner, ...day.snacks].find((v) => v.code === code);
}

/** İğneyi elle düzeltme: haritaya dokunulan nokta durağın/mekanın koordinatı olur (coordSource: manual). */
export function PinScreen({ tripKey, dayIndex, kind, refId }: { tripKey: string; dayIndex: number; kind: 'stop' | 'venue'; refId: string }) {
  const { rec } = useTrip(tripKey);
  const [pending, setPending] = useState<LatLng | null>(null);
  const [toast, showToast] = useToast();
  const day = rec?.trip.days[dayIndex];
  const map = useMemo(() => (day ? dayMapData(day, tripKey, dayIndex) : { points: [], legs: [] }), [day, tripKey, dayIndex]);
  if (rec === undefined) return <Loading />;
  if (!rec || !day) return <Missing />;
  const target = kind === 'stop' ? day.stops.find((s) => s.order === Number(refId)) : findVenue(day, refId);
  if (!target) return <Missing />;
  const back = kind === 'stop' ? paths.stop(tripKey, dayIndex, Number(refId)) : paths.food(tripKey, dayIndex);

  const save = async () => {
    if (!pending) return;
    const fix = <T extends { lat: number | null; lng: number | null; coordSource: unknown }>(x: T): T => ({ ...x, lat: +pending.lat.toFixed(6), lng: +pending.lng.toFixed(6), coordSource: 'manual' });
    const days = rec.trip.days.map((d, i) => {
      if (i !== dayIndex) return d;
      if (kind === 'stop') return { ...d, stops: d.stops.map((s) => (s.order === Number(refId) ? fix(s) : s)) };
      const fv = (v: Venue) => (v.code === refId ? fix(v) : v);
      return { ...d, breakfast: d.breakfast.map(fv), dinner: d.dinner.map(fv), snacks: d.snacks.map(fv), lunch: d.lunch ? { main: fv(d.lunch.main), backup: d.lunch.backup ? fv(d.lunch.backup) : null } : null };
    });
    await putTrip({ ...rec, trip: { ...rec.trip, days } });
    showToast(tr.pin.saved);
    setTimeout(() => go(back), 500);
  };

  return (
    <div className="page">
      <Header title={tr.pin.title} back={back} kicker={target.name} />
      <main className="content">
        <p>{tr.pin.intro(target.name)}</p>
        <p className="muted small">
          {tr.address}: {target.address}
        </p>
        <TripMap points={map.points} legs={map.legs} pending={pending} onTap={setPending} height={380} showLegend={false} />
        <p className="small" data-testid="pin-pending">
          {pending ? `${tr.pin.current}: ${pending.lat.toFixed(5)}, ${pending.lng.toFixed(5)}` : tr.pin.none}
        </p>
        <button className="btn btn-primary btn-block" disabled={!pending} onClick={save} data-testid="pin-save">
          {tr.save}
        </button>
      </main>
      <Toast text={toast} />
    </div>
  );
}
