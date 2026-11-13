// Keşfet (Geliştirme 4, Aşama E.1): plandaki `discover` yerleri; tür sekmeleri, liste ve harita,
// yakınlığa göre sıralama (konum yalnız düğmeyle istenir), açık-kapalı rozeti, fotoğraf, rehber ağzıyla
// tanıtım ve "dinle", ipuçları, eylem düğmeleri, kaydet, rotama ekle, kendi puanım, Google Haritalar.
import { useState } from 'react';
import { tr } from '../i18n/tr';
import type { Place, PlaceCategory } from '../plan/types';
import { paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { formatDate, formatDistance } from '../lib/format';
import { planImages } from '../lib/gallery';
import { placeKey, type UserState } from '../lib/userState';
import { byDistance, googleMapsUrl, placeToSaved } from '../lib/places';
import { speak } from '../lib/speech';
import type { LatLng } from '../lib/geo';
import { TripMap } from '../map/TripMap';
import type { MapPoint } from '../map/types';
import { ActionButtons, OpenBadge, Rating, StoredImg, useNow } from '../components/v2';
import { TipCards } from '../components/TipCards';
import { SaveButton } from '../components/Save';
import { AddToRoute } from '../components/AddToRoute';
import { Header, Loading, Missing, SampleBadge, Toast, useToast, useTrip } from '../components/ui';
import type { Trip } from '../plan/types';

export function askPosition(): Promise<LatLng | null> {
  return new Promise((ok) => {
    if (!('geolocation' in navigator)) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (g) => ok({ lat: g.coords.latitude, lng: g.coords.longitude }),
      () => ok(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

function PlaceCard({ p, m, tripKey, trip, us, now, onAdd }: { p: Place; m: number | null; tripKey: string; trip: Trip; us: UserState | undefined; now: Date; onAdd: (p: Place) => void }) {
  const img = planImages(p.images)[0];
  const k = placeKey(p);
  const inRoute = Object.entries(us?.route ?? {}).find(([, r]) => r.added.some((a) => a.place.key === k));
  const dayNo = inRoute ? trip.days.findIndex((d) => d.date === inRoute[0]) + 1 : 0;
  return (
    <article className="card place-card" data-testid="place" data-category={p.category} data-id={p.id}>
      {img && <StoredImg src={img.thumb} alt="" className="place-thumb" />}
      <div className="card-kicker">
        {tr.discover.cats[p.category]}
        {p.area && ` · ${p.area}`}
        {m !== null && <span data-testid="place-distance"> · {tr.discover.away(formatDistance(m))}</span>}
      </div>
      <h3>{p.name}</h3>
      <div className="row badges">
        <OpenBadge hours={p.hours} now={now} />
        {dayNo > 0 && <span className="badge badge-guide">{tr.saved.inRoute(dayNo)}</span>}
      </div>
      <p>{p.description}</p>
      {p.suggestedDate && <p className="small muted">{tr.discover.suggestedDay(formatDate(p.suggestedDate))}</p>}
      {p.fee && <p className="small">{p.fee}</p>}
      <ActionButtons phone={p.phone} website={p.website} ticketUrl={p.ticketUrl} bookingUrl={p.bookingUrl} mapsUrl={appleMapsUrl({ name: p.name, lat: p.lat, lng: p.lng, address: p.address ?? p.name })} />
      <TipCards tips={p.tips} owner={k} tripId={tripKey} us={us} testid="tips-place" />
      <div className="row">
        <button className="btn btn-small btn-ghost" onClick={() => speak(p.description, 'tr-TR')} data-testid="place-listen">
          🔊 {tr.tips.listen}
        </button>
        <SaveButton tripId={tripKey} us={us} place={placeToSaved(p)} />
        <button className="btn btn-small btn-primary" onClick={() => onAdd(p)} data-testid="place-add">
          ＋ {tr.saved.addToRoute}
        </button>
        <a className="btn btn-small btn-ghost" href={googleMapsUrl(p)} target="_blank" rel="noopener noreferrer" data-testid="place-gmaps">
          {tr.discover.gmaps}
        </a>
      </div>
      <div className="small muted">{tr.discover.myRating}</div>
      <Rating tripId={tripKey} k={k} us={us} />
    </article>
  );
}

export function DiscoverScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const now = useNow(60_000);
  const [cat, setCat] = useState<PlaceCategory | 'all'>('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [pos, setPos] = useState<LatLng | null>(null);
  const [adding, setAdding] = useState<Place | null>(null);
  const [toast, showToast] = useToast();
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const places = rec.trip.discover ?? [];
  const cats = [...new Set(places.map((p) => p.category))];
  const shown = byDistance(
    places.filter((p) => cat === 'all' || p.category === cat),
    pos,
  );
  const points: MapPoint[] = shown.map(({ item: p }, i) => ({ id: p.id, lat: p.lat, lng: p.lng, label: String(i + 1), kind: 'place', title: p.name }));
  return (
    <div className="page">
      <Header title={tr.discover.title} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        {!places.length && <p className="muted">{tr.discover.none}</p>}
        {places.length > 0 && (
          <>
            <div className="tabs" role="tablist">
              {(['all', ...cats] as const).map((c) => (
                <button key={c} role="tab" aria-selected={cat === c} className={`seg${cat === c ? ' on' : ''}`} onClick={() => setCat(c)} data-testid={`cat-${c}`}>
                  {c === 'all' ? tr.discover.all : tr.discover.cats[c]}
                </button>
              ))}
            </div>
            <div className="row">
              <div className="segmented" role="radiogroup">
                {(['list', 'map'] as const).map((v) => (
                  <button key={v} role="radio" aria-checked={view === v} className={`seg${view === v ? ' on' : ''}`} onClick={() => setView(v)} data-testid={`view-${v}`}>
                    {v === 'list' ? tr.discover.list : tr.discover.map}
                  </button>
                ))}
              </div>
              <button className="btn btn-small" onClick={async () => setPos(await askPosition())} data-testid="near-me">
                📍 {tr.discover.nearMe}
              </button>
            </div>
            <p className="small muted">{tr.discover.nearHint}</p>
            {view === 'map' && <TripMap points={points} legs={[]} height={340} showLegend={false} />}
            {shown.map(({ item, m }) => (
              <PlaceCard key={item.id} p={item} m={m} tripKey={tripKey} trip={rec.trip} us={us} now={now} onAdd={setAdding} />
            ))}
          </>
        )}
      </main>
      {adding && <AddToRoute trip={rec.trip} tripId={tripKey} place={placeToSaved(adding)} suggestedDate={adding.suggestedDate} onClose={() => setAdding(null)} onDone={showToast} />}
      <Toast text={toast} />
    </div>
  );
}
