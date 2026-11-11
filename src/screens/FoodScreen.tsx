import { useEffect, useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import { checkPlan } from '../plan/rules';
import type { Venue } from '../plan/types';
import { formatDate, weekdayName } from '../lib/format';
import { href, paths } from '../lib/router';
import { appleMapsUrl } from '../lib/maps';
import { distanceM, hasCoord, type LatLng } from '../lib/geo';
import { openStatus } from '../lib/hours';
import { firstClock, type IcsEvent } from '../lib/ics';
import { lastKnownPosition } from '../lib/links';
import { isoDate } from '../lib/today';
import { venueKey, type UserState } from '../lib/userState';
import { planImages } from '../lib/gallery';
import { ActionButtons, BookedBadge, BookingMark, MichelinBadge, OpenBadge, Rating, StoredImg, useNow } from '../components/v2';
import { useTripTz } from './StopScreen';
import { Header, Loading, Missing, SampleBadge, SourceList, UnverifiedBadge, Warnings, isUnverified, useTrip } from '../components/ui';

interface CardCtx {
  tripKey: string;
  tripId: string;
  dayIndex: number;
  date: string;
  us: UserState | undefined;
  now: Date | null; // gezi günündeysek şimdi; değilse null (rozet gösterilmez)
  tz: string | null;
  time: string | null;
}

function VenueCard({ v, sub, c }: { v: Venue; sub?: string; c: CardCtx }) {
  const rows: [string, string | null | undefined][] = [
    [tr.food.price, v.priceLevel ? `${'₺'.repeat(v.priceLevel)} ${tr.food.priceLevels[v.priceLevel]}` : null],
    [tr.food.reservation, v.reservation ? tr.food.reservationValues[v.reservation] + (v.reservationNote ? ` · ${v.reservationNote}` : '') : v.reservationNote],
    [tr.food.closed, v.closedDays],
    [tr.food.queue, v.queueNote],
    [tr.food.suits, v.suitsWhom],
    [tr.address, v.address],
  ];
  const k = venueKey(v);
  const cover = planImages(v.images)[0];
  const needsBooking = v.reservation === 'required' || v.reservation === 'recommended' || !!v.bookingUrl;
  const cal: IcsEvent | null = c.time ? { uid: `${c.tripId}-d${c.dayIndex}-v${v.code}`, title: v.name, date: c.date, start: c.time, minutes: 90, location: v.address, url: v.bookingUrl ?? v.website ?? null } : null;
  return (
    <article className={`card venue venue-${v.code[0]}`} id={`v-${v.code}`} data-testid="venue" data-code={v.code}>
      {cover && (
        <figure className="cover">
          <StoredImg src={cover.thumb} alt="" />
          <figcaption className="small muted">{tr.gallery.credit(cover.credit, cover.license)}</figcaption>
        </figure>
      )}
      <div className="venue-head">
        <span className={`code code-${v.code[0]}`}>{v.code}</span>
        <div>
          {sub && <div className="card-kicker">{sub}</div>}
          <h3>{v.name}</h3>
        </div>
      </div>
      <div className="row badges">
        <MichelinBadge m={v.michelin} />
        {c.now && <OpenBadge hours={v.hours} now={c.now} />}
        {c.us?.booked[k]?.done && <BookedBadge />}
        {isUnverified(v) && <UnverifiedBadge />}
      </div>
      {v.whatToEat.length > 0 && (
        <div className="eat">
          <strong>{tr.food.whatToEat}:</strong> {v.whatToEat.join(' · ')}
        </div>
      )}
      <dl className="facts">
        {rows
          .filter(([, x]) => !!x)
          .map(([kk, x]) => (
            <div key={kk}>
              <dt>{kk}</dt>
              <dd>{x}</dd>
            </div>
          ))}
      </dl>
      <ActionButtons phone={v.phone} website={v.website} bookingUrl={v.bookingUrl} menuUrl={v.menuUrl} reservation={v.reservation} mapsUrl={appleMapsUrl(v)} calendar={cal} tz={c.tz} />
      {needsBooking && <BookingMark tripId={c.tripKey} k={k} us={c.us} />}
      <Rating tripId={c.tripKey} k={k} us={c.us} />
      <a className="small" href={href(paths.pin(c.tripKey, c.dayIndex, 'venue', v.code))}>
        {tr.day.fixPin}
      </a>
      {!hasCoord(v) && <p className="note small">{tr.day.noCoord}</p>}
      <SourceList sources={v.sources} verifiedAt={v.verifiedAt} />
    </article>
  );
}

/** Gezi günündeyken: açık olanlar önce (konum biliniyorsa yakından uzağa), kapalı olan sona. */
export function sortForNow(list: Venue[], now: Date | null, pos: LatLng | null): Venue[] {
  if (!now) return list;
  const rank = (v: Venue) => (openStatus(v.hours, now)?.state === 'closed' ? 1 : 0);
  const dist = (v: Venue) => (pos && hasCoord(v) ? distanceM(pos, v) : Number.POSITIVE_INFINITY);
  return list
    .map((v, i) => ({ v, i }))
    .sort((a, b) => rank(a.v) - rank(b.v) || (pos ? dist(a.v) - dist(b.v) : 0) || a.i - b.i)
    .map((x) => x.v);
}

export function FoodScreen({ tripKey, dayIndex }: { tripKey: string; dayIndex: number }) {
  const { rec, us } = useTrip(tripKey);
  const nowTick = useNow();
  const tz = useTripTz(tripKey);
  const [onlyMichelin, setOnlyMichelin] = useState(false);
  const warnings = useMemo(() => (rec ? checkPlan(rec.trip).filter((w) => w.day === dayIndex && w.venueCode) : []), [rec, dayIndex]);
  // Haritadaki harfli işaretten gelindiyse ilgili karta kaydır
  useEffect(() => {
    const code = window.location.hash.split('?')[1];
    if (rec && code) document.getElementById(`v-${code}`)?.scrollIntoView({ block: 'center' });
  }, [rec]);
  if (rec === undefined) return <Loading />;
  const day = rec?.trip.days[dayIndex];
  if (!rec || !day) return <Missing />;
  const now = day.date === isoDate(nowTick) ? nowTick : null;
  const pos = now ? lastKnownPosition() : null;
  const timeOf = (code: string) => firstClock(day.timeline.find((i) => i.venueCodes?.includes(code))?.time);
  const ctx = (v: Venue): CardCtx => ({ tripKey, tripId: rec.trip.id, dayIndex, date: day.date, us, now, tz, time: timeOf(v.code) });
  const filt = (l: Venue[]) => sortForNow(onlyMichelin ? l.filter((v) => !!v.michelin) : l, now, pos);
  const card = (v: Venue, sub?: string) => <VenueCard key={v.code} v={v} sub={sub} c={ctx(v)} />;
  const lunch = day.lunch ? filt([day.lunch.main, ...(day.lunch.backup ? [day.lunch.backup] : [])]) : [];
  const anyMichelin = [...day.breakfast, ...lunch, ...day.dinner, ...day.snacks].some((v) => v.michelin) || (day.lunch && [day.lunch.main, day.lunch.backup].some((v) => v?.michelin));
  const breakfast = filt(day.breakfast);
  const dinner = filt(day.dinner);
  const snacks = filt(day.snacks);
  const empty = <p className="muted">{onlyMichelin ? tr.michelin.none : tr.food.none}</p>;
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
        {anyMichelin && (
          <label className="field check">
            <input type="checkbox" checked={onlyMichelin} onChange={(e) => setOnlyMichelin(e.target.checked)} data-testid="michelin-filter" />
            <span>{tr.michelin.filter}</span>
          </label>
        )}
        <p className="small muted">{tr.actions.noAutoBooking}</p>
        <section>
          <h2 className="section-title food-title food-K">{tr.food.breakfast}</h2>
          {breakfast.length ? breakfast.map((v) => card(v)) : empty}
        </section>
        <section>
          <h2 className="section-title food-title food-O">{tr.food.lunch}</h2>
          {day.lunch ? lunch.length ? lunch.map((v) => card(v, v === day.lunch!.main ? tr.food.lunchMain : tr.food.lunchBackup)) : empty : <p className="muted">{tr.food.noLunch}</p>}
        </section>
        <section>
          <h2 className="section-title food-title food-A">{tr.food.dinner}</h2>
          {dinner.length ? dinner.map((v) => card(v)) : empty}
        </section>
        {(snacks.length > 0 || (!onlyMichelin && day.snacks.length > 0)) && (
          <section>
            <h2 className="section-title food-title food-S">{tr.food.snacks}</h2>
            {snacks.map((v) => card(v))}
          </section>
        )}
        <p className="note small">{tr.checkBeforeGo}</p>
      </main>
    </div>
  );
}
