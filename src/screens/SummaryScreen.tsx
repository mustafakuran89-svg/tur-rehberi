import { useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import { deleteTrip, downloadJson } from '../lib/store';
import { formatDate, weekdayName } from '../lib/format';
import { go, href, paths } from '../lib/router';
import { Confirm, Header, Loading, Missing, SampleBadge, Warnings, useTrip } from '../components/ui';

export function SummaryScreen({ tripKey }: { tripKey: string }) {
  const { rec } = useTrip(tripKey);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip) : []), [rec]);
  const [confirmDel, setConfirmDel] = useState(false);
  if (rec === undefined) return <Loading />;
  if (rec === null) return <Missing />;
  const t = rec.trip;
  return (
    <div className="page">
      <Header title={t.title} back={paths.trips()} kicker={<>{t.destinations.join(' · ')} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="lead">{t.summary}</p>
        <p className="muted">
          {formatDate(t.startDate)} – {formatDate(t.endDate)}
        </p>

        <section>
          <h2 className="section-title">{tr.summary.days}</h2>
          <ol className="day-list">
            {t.days.map((d, i) => (
              <li key={i}>
                <a className="card day-card" href={href(paths.day(tripKey, i))} data-testid="day-link">
                  <div className="card-kicker">
                    {tr.day.label(i + 1)} · {formatDate(d.date)} {weekdayName(d.date)} · {d.area}
                  </div>
                  <h3>{d.title}</h3>
                  <p className="muted">{d.theme}</p>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <nav className="link-grid">
          <a className="btn" href={href(paths.phrases(tripKey))} data-testid="phrases-link">
            {tr.summary.phrases}
          </a>
          <a className="btn" href={href(paths.practical(tripKey))} data-testid="practical-link">
            {tr.summary.practical}
          </a>
        </nav>

        <section>
          <h2 className="section-title">{tr.summary.weather}</h2>
          <p>{t.weatherNote}</p>
        </section>

        {t.assumptions.length > 0 && (
          <section>
            <h2 className="section-title">{tr.summary.assumptions}</h2>
            <ul className="bullets">{t.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </section>
        )}

        {t.reservations.length > 0 && (
          <section>
            <h2 className="section-title">{tr.summary.reservations}</h2>
            <ul className="plain">
              {t.reservations.map((r, i) => (
                <li key={i} className="card">
                  <strong>{r.what}</strong>
                  {r.when && <span className="muted"> · {r.when}</span>}
                  <div>{r.note}</div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      {r.url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {t.cuisine.length > 0 && (
          <section>
            <h2 className="section-title">{tr.summary.cuisine}</h2>
            <ul className="plain">
              {t.cuisine.map((c, i) => (
                <li key={i} className="dish">
                  <strong>{c.name}</strong> — {c.description}
                  <div className="muted">
                    {tr.summary.whereToEat}: {c.where}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {t.intercity && t.intercity.length > 0 && (
          <section>
            <h2 className="section-title">{tr.summary.intercity}</h2>
            <ul className="plain">
              {t.intercity.map((l, i) => (
                <li key={i} className="card">
                  <strong>
                    {l.from} → {l.to}
                  </strong>
                  {l.durationText && <span className="muted"> · {l.durationText}</span>}
                  <div>{l.note}</div>
                  {l.roadStops && l.roadStops.length > 0 && (
                    <div className="muted">
                      {tr.summary.roadStops}: {l.roadStops.join(', ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {t.notes && (
          <section>
            <h2 className="section-title">{tr.summary.notes}</h2>
            <p>{t.notes}</p>
          </section>
        )}

        <section>
          <h2 className="section-title">{tr.summary.warnings}</h2>
          {warnings.length === 0 ? (
            <p className="ok" data-testid="no-warnings">✓ {tr.summary.noWarnings}</p>
          ) : (
            <>
              <p className="muted">{tr.summary.warningsIntro(warnings.length)}</p>
              <Warnings items={warnings} title={tr.summary.warnings} />
            </>
          )}
        </section>

        <div className="stack">
          <button className="btn" onClick={() => downloadJson(`${t.id}.json`, t)}>
            {tr.summary.exportPlan}
          </button>
          {!rec.isSample && (
            <button className="btn btn-danger" onClick={() => setConfirmDel(true)}>
              {tr.summary.deleteTrip}
            </button>
          )}
        </div>
      </main>
      {confirmDel && (
        <Confirm
          title={tr.summary.deleteTrip}
          body={tr.summary.deleteConfirm(t.title)}
          okText={tr.yes}
          onCancel={() => setConfirmDel(false)}
          onOk={async () => {
            await deleteTrip(tripKey);
            go(paths.trips(), true);
          }}
        />
      )}
    </div>
  );
}
