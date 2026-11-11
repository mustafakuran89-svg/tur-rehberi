import { useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Trip, Venue } from '../plan/types';
import { dayMapData } from '../map/fromDay';
import { TripMap } from '../map/TripMap';
import type { LatLng } from '../lib/geo';
import { eventKey, LODGING_KEY, stopKey, updateUserState, venueKey } from '../lib/userState';
import { go, paths, type PinKind } from '../lib/router';
import { Header, Loading, Missing, Toast, useToast, useTrip } from '../components/ui';

function findVenue(day: Trip['days'][number], code: string): Venue | undefined {
  return [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner, ...day.snacks].find((v) => v.code === code);
}

/**
 * İğneyi elle düzeltme: haritaya dokunulan nokta kullanıcı durumuna yazılır (plan dosyası değişmez;
 * ekranlar coordSource: manual olarak gösterir). Plan güncellense de düzeltme korunur.
 */
export function PinScreen({ tripKey, dayIndex, kind, refId }: { tripKey: string; dayIndex: number; kind: PinKind; refId: string }) {
  const { rec } = useTrip(tripKey);
  const [pending, setPending] = useState<LatLng | null>(null);
  const [toast, showToast] = useToast();
  const day = rec?.trip.days[dayIndex];
  const map = useMemo(() => (rec && day ? dayMapData(day, tripKey, dayIndex, { lodging: rec.trip.lodging }) : { points: [], legs: [] }), [rec, day, tripKey, dayIndex]);
  if (rec === undefined) return <Loading />;
  if (!rec || !day) return <Missing />;

  let name = '';
  let address = '';
  let key = '';
  let back = paths.day(tripKey, dayIndex);
  if (kind === 'stop') {
    const s = day.stops.find((x) => x.order === Number(refId));
    if (!s) return <Missing />;
    [name, address, key, back] = [s.name, s.address, stopKey(s), paths.stop(tripKey, dayIndex, s.order)];
  } else if (kind === 'venue') {
    const v = findVenue(day, refId);
    if (!v) return <Missing />;
    [name, address, key, back] = [v.name, v.address, venueKey(v), paths.food(tripKey, dayIndex)];
  } else if (kind === 'event') {
    const e = day.eveningEvents?.[Number(refId)];
    if (!e) return <Missing />;
    [name, address, key] = [e.title, e.address ?? e.venueName, eventKey(e)];
  } else {
    const l = rec.trip.lodging;
    [name, address, key, back] = [l?.name || tr.lodging.myHotel, l?.address ?? '', LODGING_KEY, paths.summary(tripKey)];
  }
  const marking = kind === 'lodging' && !rec.trip.lodging;

  const save = async () => {
    if (!pending) return;
    const p = { lat: +pending.lat.toFixed(6), lng: +pending.lng.toFixed(6) };
    await updateUserState(tripKey, (u) => ({ ...u, pins: { ...u.pins, [key]: p } }));
    showToast(tr.pin.saved);
    setTimeout(() => go(back), 500);
  };

  return (
    <div className="page">
      <Header title={marking ? tr.lodging.markTitle : tr.pin.title} back={back} kicker={name} />
      <main className="content">
        <p>{marking ? tr.lodging.markIntro : tr.pin.intro(name)}</p>
        {address && (
          <p className="muted small">
            {tr.address}: {address}
          </p>
        )}
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
