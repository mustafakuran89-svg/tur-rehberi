import { useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import type { EventKind } from '../plan/types';
import { paths } from '../lib/router';
import { formatDate } from '../lib/format';
import { isDaytime, isFree, onDate, tripEvents, type EvRef } from '../lib/events';
import { useNow } from '../components/v2';
import { EventCard } from '../components/trip';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

/** Etkinlikler sekmesi: günlere göre akşam etkinlikleri ve "gezi boyunca" başlığında çok günlüler. */
export function EventsScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const now = useNow(60_000);
  const [day, setDay] = useState<number | 'all'>('all');
  const [kind, setKind] = useState<EventKind | 'all'>('all');
  const [free, setFree] = useState(false);
  const [rec_, setRec] = useState(false);
  const [time, setTime] = useState<'all' | 'day' | 'evening'>('all');
  const all = useMemo(() => (rec ? tripEvents(rec.trip) : []), [rec]);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const t = rec.trip;
  const pass = (r: EvRef) =>
    (kind === 'all' || r.e.kind === kind) && (!free || isFree(r.e)) && (!rec_ || !!r.e.recommended) && (time === 'all' || (time === 'day' ? isDaytime(r.e) : !isDaytime(r.e)));
  const kinds = [...new Set(all.map((r) => r.e.kind))];
  const days = t.days.map((d, di) => ({ d, di, items: all.filter((r) => !r.multi && r.dayIndex === di && pass(r)) }));
  const multi = all.filter((r) => r.multi && pass(r) && (day === 'all' || onDate(r.e, t.days[day].date)));
  const shownDays = days.filter((x) => (day === 'all' || x.di === day) && x.items.length);
  const none = !shownDays.length && !multi.length;
  return (
    <div className="page">
      <Header title={tr.events4.title} back={paths.summary(tripKey)} kicker={<>{t.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <section className="filters" aria-label={tr.events4.filters} data-testid="event-filters">
          <select value={String(day)} onChange={(e) => setDay(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label={tr.events4.allDays} data-testid="f-day">
            <option value="all">{tr.events4.allDays}</option>
            {t.days.map((d, di) => (
              <option key={di} value={di}>
                {tr.day.label(di + 1)} · {formatDate(d.date)}
              </option>
            ))}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as EventKind | 'all')} aria-label={tr.events4.allKinds} data-testid="f-kind">
            <option value="all">{tr.events4.allKinds}</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {tr.events.kinds[k]}
              </option>
            ))}
          </select>
          <div className="segmented" role="radiogroup" aria-label={tr.events4.daytime}>
            {(['all', 'day', 'evening'] as const).map((x) => (
              <button key={x} role="radio" aria-checked={time === x} className={`seg${time === x ? ' on' : ''}`} onClick={() => setTime(x)} data-testid={`f-time-${x}`}>
                {x === 'all' ? tr.events4.allDays.split(' ')[0] : x === 'day' ? tr.events4.daytime : tr.events4.evening}
              </button>
            ))}
          </div>
          <label className="field check">
            <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} data-testid="f-free" />
            <span>{tr.events4.free}</span>
          </label>
          <label className="field check">
            <input type="checkbox" checked={rec_} onChange={(e) => setRec(e.target.checked)} data-testid="f-rec" />
            <span>{tr.events4.recommended}</span>
          </label>
        </section>
        {none && <p className="muted">{tr.events4.none}</p>}
        {shownDays.map(({ d, di, items }) => (
          <section key={di} data-testid="events-day" data-day={di}>
            <h2 className="section-title">
              {tr.day.label(di + 1)} · {formatDate(d.date)}
            </h2>
            {items.map((r) => (
              <EventCard key={r.key} e={r.e} i={r.i} tripKey={tripKey} dayIndex={di} us={us} now={now} trip={t} date={d.date} />
            ))}
          </section>
        ))}
        {multi.length > 0 && (
          <section data-testid="events-multi">
            <h2 className="section-title">{tr.events4.allTrip}</h2>
            {multi.map((r) => (
              <EventCard key={r.key} e={r.e} i={r.i} tripKey={tripKey} dayIndex={day === 'all' ? 0 : day} us={us} now={now} trip={t} date={day === 'all' ? r.e.date : t.days[day].date} multi />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
