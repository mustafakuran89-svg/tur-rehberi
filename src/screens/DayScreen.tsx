import { useMemo } from 'react';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import { stopsInOrder } from '../plan/normalize';
import { dayMapData, legText } from '../map/fromDay';
import { TripMap } from '../map/TripMap';
import { estimateLegMinutes, hasCoord } from '../lib/geo';
import { formatDate, formatMinutes, weekdayName } from '../lib/format';
import { href, paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { FixedBadge, Header, Loading, Missing, SampleBadge, UnverifiedBadge, Warnings, isUnverified, useTrip } from '../components/ui';
import type { Stop, Venue } from '../plan/types';

export function DayScreen({ tripKey, dayIndex }: { tripKey: string; dayIndex: number }) {
  const { rec } = useTrip(tripKey);
  const day = rec?.trip.days[dayIndex];
  const map = useMemo(() => (day ? dayMapData(day, tripKey, dayIndex) : { points: [], legs: [] }), [day, tripKey, dayIndex]);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.day === dayIndex) : []), [rec, dayIndex]);
  if (rec === undefined) return <Loading />;
  if (rec === null || !day) return <Missing />;
  const stops = stopsInOrder(day);
  const venues: Venue[] = [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner, ...day.snacks];
  const noCoord: (Stop | Venue)[] = [...stops.filter((s) => !hasCoord(s)), ...venues.filter((v) => !hasCoord(v))];
  const stopByOrder = new Map(stops.map((s) => [s.order, s]));

  return (
    <div className="page">
      <Header
        title={day.title}
        back={paths.summary(tripKey)}
        kicker={
          <>
            {tr.day.label(dayIndex + 1)} · {formatDate(day.date)} {weekdayName(day.date)} {rec.isSample && <SampleBadge />}
          </>
        }
      />
      <main className="content">
        <p className="lead">{day.theme}</p>
        <p className="muted">{day.area}</p>
        <TripMap points={map.points} legs={map.legs} />

        <a className="btn btn-primary btn-big btn-block" href={href(paths.tour(tripKey, dayIndex))} data-testid="start-tour-link">
          ▶ {tr.day.startTour}
        </a>
        <p className="note small">{tr.day.tourLimit}</p>

        <Warnings items={warnings} title={tr.day.warnings} />

        <section>
          <h2 className="section-title">{tr.day.timeline}</h2>
          <ol className="timeline" data-testid="timeline">
            {day.timeline.map((item, i) => {
              const s = item.stopOrder != null ? stopByOrder.get(item.stopOrder) : undefined;
              const isMeal = ['breakfast', 'lunch', 'dinner', 'snack'].includes(item.kind);
              return (
                <li key={i} className={`tl tl-${item.kind}`}>
                  <div className="tl-time">{item.time}</div>
                  <div className="tl-body">
                    {s ? (
                      <a href={href(paths.stop(tripKey, dayIndex, s.order))}>
                        <span className="num">{s.order}</span> {item.title}
                      </a>
                    ) : isMeal ? (
                      <a href={href(paths.food(tripKey, dayIndex))}>
                        {item.title}
                        {item.venueCodes && item.venueCodes.length > 0 && <span className="codes"> {item.venueCodes.join(' · ')}</span>}
                      </a>
                    ) : (
                      <span>{item.title}</span>
                    )}{' '}
                    {item.fixed && <FixedBadge />}
                    {item.note && <div className="muted small">{item.note}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h2 className="section-title">{tr.day.stops}</h2>
          <ol className="stops">
            {stops.map((s, i) => {
              const next = stops[i + 1];
              let leg: string | null = null;
              if (s.legToNext && next) {
                let m = s.legToNext.minutes;
                let approx = s.legToNext.approx;
                if (m === null && hasCoord(s) && hasCoord(next)) {
                  m = estimateLegMinutes(s, next, s.legToNext.mode);
                  approx = true;
                }
                leg = legText(s.legToNext.mode, m, approx);
              }
              return (
                <li key={s.order}>
                  <a className="card stop-card" href={href(paths.stop(tripKey, dayIndex, s.order))} data-testid="stop-link">
                    <span className="num big">{s.order}</span>
                    <div>
                      <h3>{s.name}</h3>
                      <div className="muted small">
                        {s.kind === 'main' ? tr.stop.main : tr.stop.minor}
                        {s.visitMinutes != null && ` · ${formatMinutes(s.visitMinutes)}`}
                        {!hasCoord(s) && ` · ${tr.day.noCoord}`}
                      </div>
                      {isUnverified(s) && <UnverifiedBadge />}
                    </div>
                  </a>
                  {leg && <div className={`leg leg-${s.legToNext!.mode}`}>↓ {leg}</div>}
                </li>
              );
            })}
          </ol>
        </section>

        {noCoord.length > 0 && (
          <section>
            <h2 className="section-title">{tr.day.noCoordList}</h2>
            <ul className="plain" data-testid="no-coord-list">
              {noCoord.map((x) => {
                const isStop = 'order' in x;
                return (
                  <li key={isStop ? `s${x.order}` : `v${x.code}`} className="card">
                    <strong>{isStop ? `${x.order}. ${x.name}` : `${x.code} ${x.name}`}</strong>
                    <div>
                      {tr.address}: {x.address}
                    </div>
                    <div className="row">
                      <a className="btn btn-small" href={appleMapsUrl(x)} target="_blank" rel="noopener noreferrer">
                        {tr.openInMaps}
                      </a>
                      <a className="btn btn-small" href={href(paths.pin(tripKey, dayIndex, isStop ? 'stop' : 'venue', isStop ? x.order : x.code))}>
                        {tr.day.fixPin}
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <a className="btn btn-block" href={href(paths.food(tripKey, dayIndex))} data-testid="food-link">
          {tr.day.food}
        </a>

        <section className="flex-box">
          <h2 className="section-title">{tr.day.flex}</h2>
          <p className="muted small">{tr.day.flexNote}</p>
          <dl>
            <dt>{tr.day.swappable}</dt>
            <dd>{day.flex.swappable}</dd>
            <dt>{tr.day.skipIfTired}</dt>
            <dd>{day.flex.skipIfTired}</dd>
            <dt>{tr.day.ifExtraTime}</dt>
            <dd>{day.flex.ifExtraTime}</dd>
            <dt>{tr.day.ifRain}</dt>
            <dd>{day.flex.ifRain}</dd>
          </dl>
          {day.notes && <p>{day.notes}</p>}
        </section>
      </main>
    </div>
  );
}
