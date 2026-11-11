// Bugün ekranı: gezi tarihlerindeyken açılış ekranı. Sıradaki adım, yürüme süresi, sıradaki SABİT
// saate geri sayım, günün kalan durakları ("gördüm"), açık-kapalı rozetleri, geç kaldım önerisi,
// hava, varış kartı, dönüş bandı, otele dön.
import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { stopsInOrder } from '../plan/normalize';
import type { Stop } from '../plan/types';
import { formatDate, formatMinutes, weekdayName } from '../lib/format';
import { href, paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { countdown, dayIndexOn, isArrivalDay, lateBy, leaveBand, nextFixed, remainingStops, stopTime, walkToNext } from '../lib/today';
import { eventKey, stopKey, updateUserState } from '../lib/userState';
import { getWeather, rainy, type TripWeather } from '../lib/weather';
import { OpenBadge, useNow } from '../components/v2';
import { DayLegCard, ReturnHotelButton } from '../components/trip';
import { FixedBadge, Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

export function TodayScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const now = useNow(15_000);
  const [wx, setWx] = useState<TripWeather | null | 'loading'>('loading');
  useEffect(() => {
    if (!rec) return;
    let alive = true;
    getWeather(rec.trip, tripKey).then((w) => alive && setWx(w));
    return () => {
      alive = false;
    };
  }, [rec, tripKey]);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const t = rec.trip;
  const di = dayIndexOn(t, now);
  const day = di >= 0 ? t.days[di] : null;
  const band = leaveBand(t, now);
  const arrival = isArrivalDay(t, now) && t.arrival;

  const seenToggle = (s: Stop) => (
    <button
      className={`btn btn-small ${us?.visited[stopKey(s)] ? 'btn-primary' : ''}`}
      aria-pressed={!!us?.visited[stopKey(s)]}
      data-testid="today-seen"
      onClick={() =>
        updateUserState(tripKey, (u) => {
          const visited = { ...u.visited };
          const k = stopKey(s);
          if (visited[k]) delete visited[k];
          else visited[k] = new Date().toISOString();
          return { ...u, visited };
        })
      }
    >
      {us?.visited[stopKey(s)] ? `✓ ${tr.today.seenDone}` : tr.today.seen}
    </button>
  );

  const bandEl = band && (
    <div className={`leave-band${band.urgent ? ' urgent' : ''}`} role="status" data-testid="leave-band" data-urgent={band.urgent}>
      {band.minutesLeft > 0 ? tr.today.leaveBand(band.leaveBy, countdown(band.minutesLeft)) : tr.today.leaveNow(band.leaveBy)}{' '}
      <a href={href(paths.transfer(tripKey, 'departure'))}>{tr.transfer.departure} ›</a>
    </div>
  );

  if (!day)
    return (
      <div className="page">
        <Header title={tr.today.title} back={paths.summary(tripKey)} kicker={<>{t.title} {rec.isSample && <SampleBadge />}</>} />
        <main className="content">
          {bandEl}
          {arrival && (
            <a className="card arrival-card" href={href(paths.transfer(tripKey, 'arrival'))} data-testid="arrival-card">
              <div className="card-title">{tr.today.arrivalCard}</div>
              <strong>{t.arrival!.title}</strong>
            </a>
          )}
          <p className="muted" data-testid="today-none">
            {tr.today.noTrip}
          </p>
          <ReturnHotelButton l={t.lodging} />
        </main>
      </div>
    );

  const remaining = remainingStops(day, us);
  const next = remaining[0];
  const walk = walkToNext(day, us);
  const fixed = nextFixed(day, now);
  const late = lateBy(day, us, now);
  const w = wx !== 'loading' && wx ? wx.days.find((d) => d.date === day.date) : undefined;
  const venues = [...day.breakfast, ...(day.lunch ? [day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])] : []), ...day.dinner].filter((v) => v.hours);
  const goingEvents = (day.eveningEvents ?? []).map((e, i) => ({ e, i })).filter(({ e }) => us?.going[eventKey(e)]);

  return (
    <div className="page">
      <Header
        title={tr.today.title}
        back={paths.summary(tripKey)}
        kicker={
          <>
            {tr.today.dayOf(di + 1, day.title)} · {formatDate(day.date)} {weekdayName(day.date)} {rec.isSample && <SampleBadge />}
          </>
        }
      />
      <main className="content">
        {bandEl}
        {arrival && (
          <a className="card arrival-card" href={href(paths.transfer(tripKey, 'arrival'))} data-testid="arrival-card">
            <div className="card-title">{tr.today.arrivalCard}</div>
            <strong>{t.arrival!.title}</strong>
            <div className="small">{tr.today.arrivalOpen} ›</div>
          </a>
        )}

        <section className="card next-step" data-testid="next-step">
          <div className="card-title">{tr.today.nextStep}</div>
          {next ? (
            <>
              <h2>
                <span className="num big">{next.order}</span>{' '}
                <a href={href(paths.stop(tripKey, di, next.order))} data-testid="next-step-name">
                  {next.name}
                </a>
              </h2>
              <div className="row badges">
                <OpenBadge hours={next.hours} now={now} />
                {stopTime(day, next) && <span className="muted small">{stopTime(day, next)}</span>}
              </div>
              {walk && walk.minutes != null && (
                <p className="small" data-testid="walk">
                  {walk.fromLodging ? `⌂ ${tr.today.fromHotel} · ` : ''}
                  {tr.today.walk(formatMinutes(walk.minutes), tr.leg[walk.mode as 'walk'])}
                </p>
              )}
              <div className="row">
                <a className="btn btn-primary btn-small" href={appleMapsUrl(next, (walk?.mode as 'walk') ?? 'walk')} target="_blank" rel="noopener noreferrer">
                  {tr.openInMaps}
                </a>
                {seenToggle(next)}
              </div>
            </>
          ) : (
            <p className="ok" data-testid="all-seen">
              ✓ {tr.today.allSeen}
            </p>
          )}
        </section>

        {fixed && (
          <section className="card" data-testid="next-fixed">
            <div className="card-title">{tr.today.nextFixed}</div>
            <p>
              <FixedBadge /> <strong>{fixed.item.title}</strong>
            </p>
            <p className="countdown" data-testid="countdown">
              {tr.today.countdown(fixed.time, countdown(fixed.minutesLeft))}
            </p>
          </section>
        )}

        {late !== null && (
          <section className="card late-card" data-testid="late">
            <div className="card-title">⏱ {tr.today.late(formatMinutes(late))}</div>
            <dl>
              <dt>{tr.today.lateSkip}</dt>
              <dd>{day.flex.skipIfTired}</dd>
              <dt>{tr.today.lateSwap}</dt>
              <dd>{day.flex.swappable}</dd>
            </dl>
          </section>
        )}

        <section className="card weather-card" data-testid="weather">
          <div className="card-title">{tr.today.weather}</div>
          {w ? (
            <>
              <p>
                {w.tMin !== null && w.tMax !== null && <strong>{tr.today.temps(String(Math.round(w.tMin)), String(Math.round(w.tMax)))}</strong>}
                {w.rainProb !== null && <span className="muted"> · {tr.today.rainProb(w.rainProb)}</span>}
              </p>
              {rainy(w) && (
                <div className="rain-card" data-testid="rain-card">
                  <strong>☔ {tr.today.rainCard}:</strong> {day.flex.ifRain}
                </div>
              )}
              <a className="small" href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">
                {tr.today.weatherCredit}
              </a>
            </>
          ) : wx === 'loading' ? (
            <p className="muted small">{tr.loading}</p>
          ) : (
            <p className="small" data-testid="weather-fallback">
              {tr.today.weatherFallback} {t.weatherNote}
            </p>
          )}
        </section>

        <section>
          <h2 className="section-title">{tr.today.remaining}</h2>
          <DayLegCard leg={remaining.length === stopsInOrder(day).length ? day.fromLodging : null} title={tr.lodging.fromLodging} testid="today-from-lodging" />
          <ul className="plain today-stops">
            {stopsInOrder(day).map((s) => (
              <li key={s.order} className={`today-stop${us?.visited[stopKey(s)] ? ' seen' : ''}`} data-testid="today-stop">
                <span className="num">{s.order}</span>
                <a href={href(paths.stop(tripKey, di, s.order))}>{s.name}</a>
                <OpenBadge hours={s.hours} now={now} />
                {seenToggle(s)}
              </li>
            ))}
          </ul>
          {venues.length > 0 && (
            <ul className="plain today-venues">
              {venues.map((v) => (
                <li key={v.code} className="small">
                  <span className={`code code-${v.code[0]} code-sm`}>{v.code}</span> {v.name} <OpenBadge hours={v.hours} now={now} />
                </li>
              ))}
            </ul>
          )}
          {goingEvents.map(({ e, i }) => (
            <a key={i} className="card" href={href(paths.day(tripKey, di)) + `?E${i + 1}`} data-testid="today-event">
              <div className="card-title">{tr.today.eventToday}</div>
              <strong>
                E{i + 1} {e.title}
              </strong>
              {e.startTime && <span className="muted"> · {e.startTime}</span>}
            </a>
          ))}
          <DayLegCard leg={day.toLodging} title={tr.lodging.toLodging} testid="today-to-lodging" />
        </section>

        <ReturnHotelButton l={t.lodging} />
        <div className="link-grid">
          <a className="btn" href={href(paths.day(tripKey, di))}>
            {tr.today.goToDay}
          </a>
          <a className="btn" href={href(paths.tour(tripKey, di))}>
            ▶ {tr.day.startTour}
          </a>
        </div>
      </main>
    </div>
  );
}
