import { useEffect, useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import { stopsInOrder } from '../plan/normalize';
import { checkPlan } from '../plan/rules';
import { formatMinutes } from '../lib/format';
import { href, paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { hasCoord } from '../lib/geo';
import { firstClock, type IcsEvent } from '../lib/ics';
import { stopKey, updateUserState } from '../lib/userState';
import { cachedWeather } from '../lib/weather';
import { isoDate } from '../lib/today';
import { SpeechPlayer } from '../components/SpeechPlayer';
import { NarrationToggle } from '../components/NarrationToggle';
import { narrationFor } from '../lib/narration';
import { useSettings } from '../lib/settings';
import { useOnline } from '../lib/online';
import { VideoCard } from '../components/VideoCard';
import { Gallery } from '../components/Gallery';
import { ActionButtons, BookedBadge, BookingMark, NoteBox, OpenBadge, useNow } from '../components/v2';
import { Header, Loading, Missing, SampleBadge, SourceList, UnverifiedBadge, Warnings, isUnverified, useTrip } from '../components/ui';

/** Gezinin saat dilimi (hava tahmininden öğrenilir; yoksa null). */
export function useTripTz(tripKey: string): string | null {
  const [tz, setTz] = useState<string | null>(null);
  useEffect(() => {
    cachedWeather(tripKey).then((w) => setTz(w?.timezone ?? null));
  }, [tripKey]);
  return tz;
}

export function StopScreen({ tripKey, dayIndex, order }: { tripKey: string; dayIndex: number; order: number }) {
  const { rec, us } = useTrip(tripKey);
  const now = useNow();
  const tz = useTripTz(tripKey);
  const settings = useSettings();
  const online = useOnline();
  const [length, setLength] = useState<'short' | 'long'>(settings.narrationLength);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.day === dayIndex && w.stopOrder === order) : []), [rec, dayIndex, order]);
  if (rec === undefined) return <Loading />;
  const day = rec?.trip.days[dayIndex];
  const stops = day ? stopsInOrder(day) : [];
  const idx = stops.findIndex((s) => s.order === order);
  const s = stops[idx];
  if (!rec || !day || !s) return <Missing />;
  const prev = stops[idx - 1];
  const next = stops[idx + 1];
  const k = stopKey(s);
  const seen = !!us?.visited[k];
  const isToday = day.date === isoDate(now);
  const time = firstClock(day.timeline.find((i) => i.kind === 'stop' && i.stopOrder === s.order)?.time);
  const cal: IcsEvent | null = time ? { uid: `${rec.trip.id}-d${dayIndex}-s${s.order}`, title: s.name, date: day.date, start: time, minutes: s.visitMinutes ?? 60, location: s.address, url: s.ticketUrl ?? s.website ?? null } : null;
  const info: [string, string | null | undefined][] = [
    [tr.stop.visit, s.visitMinutes != null ? formatMinutes(s.visitMinutes) : null],
    [tr.stop.openHours, s.openHours],
    [tr.stop.closedDays, s.closedDays],
    [tr.stop.fee, s.fee],
    [tr.stop.ticket, s.ticketOrBooking],
    [tr.stop.bestTime, s.bestTime],
    [tr.address, s.address],
  ];
  const city = rec.trip.destinations[0] ?? '';
  const booking = !!(s.ticketUrl || s.ticketOrBooking);
  const chosen = narrationFor(s, length);
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
        <div className="row badges">
          {isUnverified(s) && <UnverifiedBadge />}
          {isToday && <OpenBadge hours={s.hours} now={now} />}
          {us?.booked[k]?.done && <BookedBadge />}
        </div>
        <p className="practical-line" data-testid="practical-line">
          {s.practicalLine}
        </p>
        {s.lookFor && s.lookFor.length > 0 && (
          <section className="look-for" data-testid="look-for">
            <h2 className="card-title">{tr.look.title}</h2>
            <ul>
              {s.lookFor.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </section>
        )}
        {!online && (
          <p className="note small" data-testid="offline-first">
            {tr.player.offlineFirst}
          </p>
        )}
        <NarrationToggle stop={s} value={length} onChange={setLength} rate={settings.rate} />
        <SpeechPlayer text={chosen.text} pronunciations={rec.trip.pronunciations} />
        <section>
          <h2 className="section-title">{tr.stop.narration}</h2>
          {chosen.abridged && (
            <p className="note small" data-testid="abridged">
              {tr.player.abridged}
            </p>
          )}
          <div className="narration" data-testid="narration" data-length={length}>
            {chosen.text.split(/\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
        {/* Çevrimdışıyken anlatım öne, video sona alınır */}
        {online && <VideoCard tripId={tripKey} stop={s} city={city} us={us} />}
        <Gallery tripId={tripKey} stop={s} us={us} allowSearch={!rec.isSample} />
        {!online && <VideoCard tripId={tripKey} stop={s} city={city} us={us} />}
        <Warnings items={warnings} title={tr.day.warnings} />
        <dl className="facts">
          {info
            .filter(([, v]) => !!v)
            .map(([kk, v]) => (
              <div key={kk}>
                <dt>{kk}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        <ActionButtons phone={s.phone} website={s.website} ticketUrl={s.ticketUrl} mapsUrl={appleMapsUrl(s, s.legToNext?.mode ?? 'walk')} calendar={cal} tz={tz} />
        {booking && <BookingMark tripId={tripKey} k={k} us={us} />}
        {!hasCoord(s) && (
          <>
            <a className="btn" href={href(paths.pin(tripKey, dayIndex, 'stop', s.order))}>
              {tr.day.fixPin}
            </a>
            <p className="note small">{tr.day.noCoord}</p>
          </>
        )}
        <label className="field check seen-toggle">
          <input
            type="checkbox"
            checked={seen}
            data-testid="seen"
            onChange={(e) => {
              const on = e.target.checked;
              updateUserState(tripKey, (u) => {
                const visited = { ...u.visited };
                if (on) visited[k] = new Date().toISOString();
                else delete visited[k];
                return { ...u, visited };
              });
            }}
          />
          <span>{tr.today.seen}</span>
        </label>
        <NoteBox tripId={tripKey} k={k} us={us} />
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
