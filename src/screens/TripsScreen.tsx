import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { listTrips, type TripRecord } from '../lib/store';
import { formatDate } from '../lib/format';
import { go, href, paths } from '../lib/router';
import { tripActive } from '../lib/today';
import { Header, SampleBadge, useTripsVersion } from '../components/ui';
import { getOfflineStatus, needsRefresh, type OfflineStatus } from '../lib/offlineCheck';
import { consumeColdStart, lastTripKey } from '../lib/lastTrip';
import { BoxCards } from '../components/BoxCards';
import { Onboarding } from '../components/Onboarding';

/** Gezi kartındaki çevrimdışı rozeti: "Çevrimdışı hazır", "Eksik var" ya da "Hazırlanmadı". */
export function OfflineBadge({ st }: { st: OfflineStatus | null | undefined }) {
  if (st === undefined) return null;
  const k = !st ? 'none' : st.ready ? 'ready' : 'partial';
  return (
    <span className={`badge badge-offline-${k}`} data-testid="trip-offline" data-state={k}>
      {k === 'ready' ? tr.offline.ready : k === 'partial' ? tr.offline.partial : tr.offline.none}
    </span>
  );
}

function TripCard({ r, st }: { r: TripRecord; st: OfflineStatus | null | undefined }) {
  return (
    <a className="card trip-card" href={href(paths.summary(r.key))} data-testid="trip-card">
      <div className="card-kicker">
        {r.trip.destinations.join(' · ')} {r.isSample && <SampleBadge />}
      </div>
      <h2>{r.trip.title}</h2>
      <p className="muted">
        {formatDate(r.trip.startDate)} – {formatDate(r.trip.endDate)} · {tr.trips.days(r.trip.days.length)}
      </p>
      <OfflineBadge st={st} />
    </a>
  );
}

export function TripsScreen() {
  const v = useTripsVersion();
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  const [status, setStatus] = useState<Record<string, OfflineStatus | null>>({});
  useEffect(() => {
    listTrips().then(async (list) => {
      setTrips(list);
      const out: Record<string, OfflineStatus | null> = {};
      for (const r of list) out[r.key] = await getOfflineStatus(r.key);
      setStatus(out);
    });
  }, [v]);
  const real = trips?.filter((t) => !t.isSample) ?? [];
  const now = new Date();
  const active = real.filter((r) => tripActive(r.trip, now));
  // Gezi tarihlerindeyken açılış ekranı Bugün olur (oturumda bir kez; Geri ile listeye dönülür).
  useEffect(() => {
    if (!active.length) return;
    try {
      if (sessionStorage.getItem('tur-rehberi:today-shown')) return;
      sessionStorage.setItem('tur-rehberi:today-shown', '1');
    } catch {
      /* yok say */
    }
    go(paths.today(active[0].key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.length]);
  // Soğuk açılış (uygulama kapatılıp yeniden açıldı, ağ olsun olmasın): son açık gezi gelir;
  // gezi tarihlerindeyse yukarıdaki kural Bugün ekranını açar.
  useEffect(() => {
    if (!trips) return;
    if (!consumeColdStart() || active.length) return;
    const last = lastTripKey();
    if (!last || !trips.some((t) => t.key === last)) return;
    go(paths.summary(last));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);
  const remind = real
    .map((r) => ({ r, days: status[r.key] === undefined ? null : needsRefresh(r.trip.startDate, r.trip.endDate, status[r.key], now) }))
    .filter((x) => x.days !== null);
  const sample = trips?.filter((t) => t.isSample) ?? [];
  return (
    <div className="page">
      <Header title={tr.trips.title} right={<a className="top-link" href={href(paths.settings())}>{tr.nav.settings}</a>} />
      <main className="content">
        <p className="lead">{tr.trips.intro}</p>
        <a className="btn btn-primary btn-big btn-block" href={href(paths.import())} data-testid="import-link">
          ＋ {tr.nav.import}
        </a>
        <BoxCards />
        <Onboarding />
        {remind.map(({ r, days }) => (
          <section key={r.key} className="card note" data-testid="prep-reminder">
            <h2 className="card-title">{tr.offline.remindTitle}: {r.trip.title}</h2>
            <p className="small">{tr.offline.remindBody(days!)}</p>
            <a className="btn btn-small btn-primary" href={href(paths.prepare(r.key))}>
              {tr.offline.remindBtn}
            </a>
          </section>
        ))}
        {active.map((r) => (
          <a key={r.key} className="btn btn-primary btn-big btn-block" href={href(paths.today(r.key))} data-testid="trips-today">
            ☀ {tr.today.title}: {r.trip.title}
          </a>
        ))}
        <section className="stack">
          {trips && real.length === 0 && <p className="muted">{tr.trips.empty}</p>}
          {real.map((r) => (
            <TripCard key={r.key} r={r} st={status[r.key]} />
          ))}
        </section>
        {sample.length > 0 && (
          <section className="stack sample-section">
            <h2 className="section-title">{tr.trips.sampleSection}</h2>
            <p className="muted">{tr.trips.sampleIntro}</p>
            {sample.map((r) => (
              <TripCard key={r.key} r={r} st={status[r.key]} />
            ))}
          </section>
        )}
        <p className="note small">{tr.trips.storageNote}</p>
      </main>
    </div>
  );
}
