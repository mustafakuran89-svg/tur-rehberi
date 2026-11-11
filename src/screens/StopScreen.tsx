import { useMemo } from 'react';
import { tr } from '../i18n/tr';
import { stopsInOrder } from '../plan/normalize';
import { checkPlan } from '../plan/rules';
import { formatMinutes } from '../lib/format';
import { href, paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { hasCoord } from '../lib/geo';
import { SpeechPlayer } from '../components/SpeechPlayer';
import { Header, Loading, Missing, SampleBadge, SourceList, UnverifiedBadge, Warnings, isUnverified, useTrip } from '../components/ui';

export function StopScreen({ tripKey, dayIndex, order }: { tripKey: string; dayIndex: number; order: number }) {
  const { rec } = useTrip(tripKey);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.day === dayIndex && w.stopOrder === order) : []), [rec, dayIndex, order]);
  if (rec === undefined) return <Loading />;
  const day = rec?.trip.days[dayIndex];
  const stops = day ? stopsInOrder(day) : [];
  const idx = stops.findIndex((s) => s.order === order);
  const s = stops[idx];
  if (!rec || !day || !s) return <Missing />;
  const prev = stops[idx - 1];
  const next = stops[idx + 1];
  const info: [string, string | null | undefined][] = [
    [tr.stop.visit, s.visitMinutes != null ? formatMinutes(s.visitMinutes) : null],
    [tr.stop.openHours, s.openHours],
    [tr.stop.closedDays, s.closedDays],
    [tr.stop.fee, s.fee],
    [tr.stop.ticket, s.ticketOrBooking],
    [tr.stop.bestTime, s.bestTime],
    [tr.address, s.address],
  ];
  return (
    <div className="page">
      <Header
        title={s.name}
        back={paths.day(tripKey, dayIndex)}
        kicker={
          <>
            <span className="num">{s.order}</span> {tr.stop.numbered(s.order)} · {s.kind === 'main' ? tr.stop.main : tr.stop.minor} {rec.isSample && <SampleBadge />}
          </>
        }
      />
      <main className="content">
        {isUnverified(s) && <UnverifiedBadge />}
        <p className="practical-line" data-testid="practical-line">
          {s.practicalLine}
        </p>
        <SpeechPlayer text={s.narration} />
        <section>
          <h2 className="section-title">{tr.stop.narration}</h2>
          <div className="narration" data-testid="narration">
            {s.narration.split(/\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
        <Warnings items={warnings} title={tr.day.warnings} />
        <dl className="facts">
          {info
            .filter(([, v]) => !!v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        <div className="row">
          <a className="btn btn-primary" href={appleMapsUrl(s, s.legToNext?.mode ?? 'walk')} target="_blank" rel="noopener noreferrer" data-testid="apple-maps">
            {tr.openInMaps}
          </a>
          {!hasCoord(s) && (
            <a className="btn" href={href(paths.pin(tripKey, dayIndex, 'stop', s.order))}>
              {tr.day.fixPin}
            </a>
          )}
        </div>
        {!hasCoord(s) && <p className="note small">{tr.day.noCoord}</p>}
        <SourceList sources={s.sources} verifiedAt={s.verifiedAt} />
        <p className="note small">{tr.checkBeforeGo}</p>
        <nav className="row pager">
          {prev ? (
            <a className="btn" href={href(paths.stop(tripKey, dayIndex, prev.order))}>
              ‹ {tr.stop.prev}
            </a>
          ) : (
            <span />
          )}
          {next && (
            <a className="btn" href={href(paths.stop(tripKey, dayIndex, next.order))} data-testid="next-stop">
              {tr.stop.next} ›
            </a>
          )}
        </nav>
        {hasCoord(s) && (
          <p className="small muted">
            <a href={href(paths.pin(tripKey, dayIndex, 'stop', s.order))}>{tr.day.fixPin}</a>
          </p>
        )}
      </main>
    </div>
  );
}
