import { useEffect, useMemo } from 'react';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import type { Venue } from '../plan/types';
import { formatDate, weekdayName } from '../lib/format';
import { href, paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { hasCoord } from '../lib/geo';
import { Header, Loading, Missing, SampleBadge, SourceList, UnverifiedBadge, Warnings, isUnverified, useTrip } from '../components/ui';

function VenueCard({ v, tripKey, dayIndex, sub }: { v: Venue; tripKey: string; dayIndex: number; sub?: string }) {
  const rows: [string, string | null | undefined][] = [
    [tr.food.price, v.priceLevel ? `${'₺'.repeat(v.priceLevel)} ${tr.food.priceLevels[v.priceLevel]}` : null],
    [tr.food.reservation, v.reservation ? tr.food.reservationValues[v.reservation] + (v.reservationNote ? ` · ${v.reservationNote}` : '') : v.reservationNote],
    [tr.food.closed, v.closedDays],
    [tr.food.queue, v.queueNote],
    [tr.food.suits, v.suitsWhom],
    [tr.address, v.address],
  ];
  return (
    <article className={`card venue venue-${v.code[0]}`} id={`v-${v.code}`} data-testid="venue">
      <div className="venue-head">
        <span className={`code code-${v.code[0]}`}>{v.code}</span>
        <div>
          {sub && <div className="card-kicker">{sub}</div>}
          <h3>{v.name}</h3>
        </div>
      </div>
      {isUnverified(v) && <UnverifiedBadge />}
      {v.whatToEat.length > 0 && (
        <div className="eat">
          <strong>{tr.food.whatToEat}:</strong> {v.whatToEat.join(' · ')}
        </div>
      )}
      <dl className="facts">
        {rows
          .filter(([, x]) => !!x)
          .map(([k, x]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{x}</dd>
            </div>
          ))}
      </dl>
      <div className="row">
        <a className="btn btn-small" href={appleMapsUrl(v)} target="_blank" rel="noopener noreferrer">
          {tr.openInMaps}
        </a>
        <a className="btn btn-small btn-ghost" href={href(paths.pin(tripKey, dayIndex, 'venue', v.code))}>
          {tr.day.fixPin}
        </a>
      </div>
      {!hasCoord(v) && <p className="note small">{tr.day.noCoord}</p>}
      <SourceList sources={v.sources} verifiedAt={v.verifiedAt} />
    </article>
  );
}

export function FoodScreen({ tripKey, dayIndex }: { tripKey: string; dayIndex: number }) {
  const { rec } = useTrip(tripKey);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.day === dayIndex && w.venueCode) : []), [rec, dayIndex]);
  // Haritadaki harfli işaretten gelindiyse ilgili karta kaydır
  useEffect(() => {
    const code = window.location.hash.split('?')[1];
    if (rec && code) document.getElementById(`v-${code}`)?.scrollIntoView({ block: 'center' });
  }, [rec]);
  if (rec === undefined) return <Loading />;
  const day = rec?.trip.days[dayIndex];
  if (!rec || !day) return <Missing />;
  const card = (v: Venue, sub?: string) => <VenueCard key={v.code} v={v} tripKey={tripKey} dayIndex={dayIndex} sub={sub} />;
  return (
    <div className="page">
      <Header
        title={tr.food.title}
        back={paths.day(tripKey, dayIndex)}
        kicker={
          <>
            {tr.day.label(dayIndex + 1)} · {formatDate(day.date)} {weekdayName(day.date)} {rec.isSample && <SampleBadge />}
          </>
        }
      />
      <main className="content">
        <Warnings items={warnings} title={tr.day.warnings} />
        <section>
          <h2 className="section-title food-title food-K">{tr.food.breakfast}</h2>
          {day.breakfast.length ? day.breakfast.map((v) => card(v)) : <p className="muted">{tr.food.none}</p>}
        </section>
        <section>
          <h2 className="section-title food-title food-O">{tr.food.lunch}</h2>
          {day.lunch ? (
            <>
              {card(day.lunch.main, tr.food.lunchMain)}
              {day.lunch.backup && card(day.lunch.backup, tr.food.lunchBackup)}
            </>
          ) : (
            <p className="muted">{tr.food.noLunch}</p>
          )}
        </section>
        <section>
          <h2 className="section-title food-title food-A">{tr.food.dinner}</h2>
          {day.dinner.length ? day.dinner.map((v) => card(v)) : <p className="muted">{tr.food.none}</p>}
        </section>
        {day.snacks.length > 0 && (
          <section>
            <h2 className="section-title food-title food-S">{tr.food.snacks}</h2>
            {day.snacks.map((v) => card(v))}
          </section>
        )}
        <p className="note small">{tr.checkBeforeGo}</p>
      </main>
    </div>
  );
}
