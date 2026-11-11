import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { listTrips, type TripRecord } from '../lib/store';
import { formatDate } from '../lib/format';
import { href, paths } from '../lib/router';
import { Header, SampleBadge, useTripsVersion } from '../components/ui';

function TripCard({ r }: { r: TripRecord }) {
  return (
    <a className="card trip-card" href={href(paths.summary(r.key))} data-testid="trip-card">
      <div className="card-kicker">
        {r.trip.destinations.join(' · ')} {r.isSample && <SampleBadge />}
      </div>
      <h2>{r.trip.title}</h2>
      <p className="muted">
        {formatDate(r.trip.startDate)} – {formatDate(r.trip.endDate)} · {tr.trips.days(r.trip.days.length)}
      </p>
    </a>
  );
}

export function TripsScreen() {
  const v = useTripsVersion();
  const [trips, setTrips] = useState<TripRecord[] | null>(null);
  useEffect(() => {
    listTrips().then(setTrips);
  }, [v]);
  const real = trips?.filter((t) => !t.isSample) ?? [];
  const sample = trips?.filter((t) => t.isSample) ?? [];
  return (
    <div className="page">
      <Header title={tr.trips.title} right={<a className="top-link" href={href(paths.settings())}>{tr.nav.settings}</a>} />
      <main className="content">
        <p className="lead">{tr.trips.intro}</p>
        <a className="btn btn-primary btn-big btn-block" href={href(paths.import())} data-testid="import-link">
          ＋ {tr.nav.import}
        </a>
        <section className="stack">
          {trips && real.length === 0 && <p className="muted">{tr.trips.empty}</p>}
          {real.map((r) => (
            <TripCard key={r.key} r={r} />
          ))}
        </section>
        {sample.length > 0 && (
          <section className="stack sample-section">
            <h2 className="section-title">{tr.trips.sampleSection}</h2>
            <p className="muted">{tr.trips.sampleIntro}</p>
            {sample.map((r) => (
              <TripCard key={r.key} r={r} />
            ))}
          </section>
        )}
        <p className="note small">{tr.trips.storageNote}</p>
      </main>
    </div>
  );
}
