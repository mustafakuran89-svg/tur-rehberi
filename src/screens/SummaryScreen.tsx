import { useEffect, useMemo, useState } from 'react';
import { useNow } from '../components/v2';
import { LodgingCard } from '../components/trip';
import { useTripTz } from './StopScreen';
import { tripActive } from '../lib/today';
import { buildIcs, downloadText, tripIcsEvents } from '../lib/ics';
import { makeShare, shareFile } from '../lib/share';
import { journalText } from '../lib/journal';
import { forgetUserState } from '../lib/userState';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import { deleteTrip, downloadJson } from '../lib/store';
import { formatDate, weekdayName } from '../lib/format';
import { go, href, paths } from '../lib/router';
import { Confirm, Header, Loading, Missing, SampleBadge, Warnings, useTrip } from '../components/ui';

export function SummaryScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const now = useNow();
  const tz = useTripTz(tripKey);
  useEffect(() => {
    if (rec && window.location.hash.endsWith('?otel')) document.getElementById('otel')?.scrollIntoView({ block: 'center' });
  }, [rec]);
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
        {tripActive(t, now) && (
          <a className="btn btn-primary btn-big btn-block" href={href(paths.today(tripKey))} data-testid="today-link">
            ☀ {tr.today.open}
          </a>
        )}

        <LodgingCard l={t.lodging} tripKey={tripKey} />
        {(t.arrival || t.departure) && (
          <nav className="link-grid">
            {t.arrival && (
              <a className="btn" href={href(paths.transfer(tripKey, 'arrival'))} data-testid="arrival-link">
                ✈ {tr.transfer.arrivalLink}
              </a>
            )}
            {t.departure && (
              <a className="btn" href={href(paths.transfer(tripKey, 'departure'))} data-testid="departure-link">
                ✈ {tr.transfer.departureLink}
              </a>
            )}
          </nav>
        )}

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
          <a className="btn" href={href(paths.prepare(tripKey))} data-testid="prepare-link">
            {tr.prepare.title}
          </a>
          <a className="btn" href={href(paths.checklist(tripKey))} data-testid="checklist-link">
            {tr.checklist.title}
          </a>
        </nav>

        <section className="card">
          <button
            className="btn btn-block"
            data-testid="ics-export"
            onClick={() => {
              const ev = tripIcsEvents(t, us);
              downloadText(`${t.id}.ics`, buildIcs(ev, tz), 'text/calendar');
            }}
          >
            📅 {tr.calendar.export}
          </button>
          <p className="small muted">{tr.calendar.hint}</p>
          <p className="small muted">{tz ? tr.calendar.tzKnown(tz) : tr.calendar.tzFloating}</p>
        </section>

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
          <button
            className="btn"
            data-testid="share"
            onClick={async () => {
              const f = await makeShare(tripKey);
              if (f) await shareFile(`${t.id}-paylasim.json`, f, t.title);
            }}
          >
            {tr.share.button}
          </button>
          <p className="small muted">{tr.share.hint}</p>
          <button className="btn" data-testid="journal-export" onClick={() => downloadText(`${t.id}-gunluk.txt`, journalText(t, us), 'text/plain;charset=utf-8')}>
            {tr.journal.export}
          </button>
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
            forgetUserState(tripKey);
            go(paths.trips(), true);
          }}
        />
      )}
    </div>
  );
}
