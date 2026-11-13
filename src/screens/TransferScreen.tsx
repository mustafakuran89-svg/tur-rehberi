// Varış (havalimanından otele) ve Dönüş (otelden havalimanına): adım adım kartlar. Her adım
// "tamam" diye işaretlenir, sıradaki adım öne çıkar. Yalnızca planla gelen tarif gösterilir;
// canlı yön için Haritalar'a devredilir. Ağ olmadan da açılır (veri cihazdadır).
import { useMemo } from 'react';
import { tr } from '../i18n/tr';
import { TipCards } from '../components/TipCards';
import { allTips } from './TipsScreen';
import type { Transfer } from '../plan/types';
import { formatDate, formatMinutes } from '../lib/format';
import { hasCoord } from '../lib/geo';
import { appleMapsUrl } from '../lib/maps';
import { paths } from '../lib/router';
import { countdown, leaveBand } from '../lib/today';
import { buildIcs, downloadText, LEAVE_ALARMS } from '../lib/ics';
import { updateUserState } from '../lib/userState';
import { lodgingPoint } from '../map/fromDay';
import { TripMap } from '../map/TripMap';
import type { MapPoint } from '../map/types';
import { useNow } from '../components/v2';
import { Header, Loading, Missing, SampleBadge, SourceList, useTrip } from '../components/ui';
import { useTripTz } from './StopScreen';

export function TransferScreen({ tripKey, which }: { tripKey: string; which: 'arrival' | 'departure' }) {
  const { rec, us } = useTrip(tripKey);
  const now = useNow(15_000);
  const tz = useTripTz(tripKey);
  const tf: Transfer | null | undefined = rec?.trip[which];
  const points = useMemo<MapPoint[]>(() => {
    if (!rec || !tf) return [];
    const p: MapPoint[] = [];
    if (typeof tf.hubLat === 'number' && typeof tf.hubLng === 'number') p.push({ id: 'hub', lat: tf.hubLat, lng: tf.hubLng, label: '✈', kind: 'hub', title: tf.hubName });
    tf.steps.forEach((s, i) => {
      if (hasCoord({ lat: s.lat ?? null, lng: s.lng ?? null })) p.push({ id: `st${i}`, lat: s.lat!, lng: s.lng!, label: String(i + 1), kind: 'step', title: s.instruction });
    });
    const lp = lodgingPoint(rec.trip.lodging, tripKey);
    if (lp) p.push(lp);
    return p;
  }, [rec, tf, tripKey]);
  if (rec === undefined) return <Loading />;
  if (!rec || !tf) return <Missing />;
  const done = new Set(us?.transferDone[which] ?? []);
  const nextIdx = tf.steps.findIndex((_, i) => !done.has(i));
  const toggle = (i: number) =>
    updateUserState(tripKey, (u) => {
      const cur = new Set(u.transferDone[which]);
      if (cur.has(i)) cur.delete(i);
      else cur.add(i);
      return { ...u, transferDone: { ...u.transferDone, [which]: [...cur].sort((a, b) => a - b) } };
    });
  const band = which === 'departure' ? leaveBand(rec.trip, now) : null;
  const total = tf.totalMinutes ?? null;
  return (
    <div className="page">
      <Header title={which === 'arrival' ? tr.transfer.arrival : tr.transfer.departure} back={paths.summary(tripKey)} kicker={<>{tf.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        {which === 'departure' && tf.leaveBy && (
          <div className={`leave-band${band?.urgent ? ' urgent' : ''}`} data-testid="leave-by" data-urgent={!!band?.urgent}>
            {tr.transfer.leaveBy(tf.leaveBy)}
            {band && band.minutesLeft > 0 && ` · ${countdown(band.minutesLeft)}`}
            {tf.date && (
              <button
                className="btn btn-small btn-ghost"
                onClick={() =>
                  downloadText(
                    `${rec.trip.id}-cikis.ics`,
                    buildIcs([{ uid: `${rec.trip.id}-leave`, title: tr.ics.leave(rec.trip.lodging?.name || tr.lodging.myHotel), date: tf.date!, start: tf.leaveBy!, minutes: tf.totalMinutes ?? 60, location: rec.trip.lodging?.address ?? null, alarmsMin: LEAVE_ALARMS }], tz),
                    'text/calendar',
                  )
                }
              >
                📅 {tr.actions.calendar}
              </button>
            )}
          </div>
        )}
        <section className="card transfer-head">
          <dl className="facts">
            {tf.date && (
              <div>
                <dt>{formatDate(tf.date)}</dt>
                <dd>{tf.hubName}</dd>
              </div>
            )}
            {tf.flight && (
              <div>
                <dt>{tr.transfer.flight}</dt>
                <dd>
                  {tf.flight}
                  {tf.flightTime && ` · ${tf.flightTime}`}
                </dd>
              </div>
            )}
            {total !== null && (
              <div>
                <dt>{tr.transfer.total}</dt>
                <dd data-testid="transfer-total">{formatMinutes(total)}</dd>
              </div>
            )}
            {tf.costText && (
              <div>
                <dt>{tr.transfer.cost}</dt>
                <dd>{tf.costText}</dd>
              </div>
            )}
          </dl>
        </section>

        <section>
          <h2 className="section-title">{tr.transfer.steps}</h2>
          <ol className="plain transfer-steps">
            {tf.steps.map((s, i) => {
              const isDone = done.has(i);
              const isNext = i === nextIdx;
              return (
                <li key={i} className={`card step${isDone ? ' done' : ''}${isNext ? ' next' : ''}`} data-testid="step" data-done={isDone} data-next={isNext}>
                  <div className="step-head">
                    <span className="step-icon" aria-hidden="true">
                      {tr.transfer.icons[s.mode]}
                    </span>
                    <span className="card-kicker">
                      {i + 1}. {tr.transfer.modes[s.mode]}
                      {s.durationMinutes != null && ` · ${formatMinutes(s.durationMinutes)}`}
                      {isNext && ` · ${tr.transfer.next}`}
                    </span>
                  </div>
                  <p className="step-text">{s.instruction}</p>
                  <dl className="facts">
                    {(s.from || s.to) && (
                      <div>
                        <dt>→</dt>
                        <dd>{[s.from, s.to].filter(Boolean).join(' → ')}</dd>
                      </div>
                    )}
                    {s.line && (
                      <div>
                        <dt>{tr.transfer.line}</dt>
                        <dd>
                          {s.line}
                          {s.direction && ` · ${tr.transfer.direction}: ${s.direction}`}
                          {s.stopsCount != null && ` · ${tr.transfer.stops(s.stopsCount)}`}
                        </dd>
                      </div>
                    )}
                    {s.ticket && (
                      <div>
                        <dt>{tr.transfer.ticket}</dt>
                        <dd>{s.ticket}</dd>
                      </div>
                    )}
                    {s.costText && (
                      <div>
                        <dt>{tr.transfer.cost}</dt>
                        <dd>{s.costText}</dd>
                      </div>
                    )}
                  </dl>
                  <button className={`btn btn-small ${isDone ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggle(i)} data-testid="step-done">
                    {isDone ? `↺ ${tr.transfer.undo}` : `✓ ${tr.transfer.done}`}
                  </button>
                </li>
              );
            })}
          </ol>
          {nextIdx === -1 && (
            <p className="ok" data-testid="transfer-all-done">
              ✓ {tr.transfer.allDone}
            </p>
          )}
        </section>

        {points.length > 0 && <TripMap points={points} legs={[]} height={260} showLegend={false} />}
        {rec.trip.lodging && (
          <a className="btn btn-block" href={appleMapsUrl({ name: rec.trip.lodging.name, lat: rec.trip.lodging.lat, lng: rec.trip.lodging.lng, address: rec.trip.lodging.address }, 'transit')} target="_blank" rel="noopener noreferrer">
            {tr.openInMaps}
          </a>
        )}

        {tf.alternatives && tf.alternatives.length > 0 && (
          <section>
            <h2 className="section-title">{tr.transfer.alternatives}</h2>
            <ul className="plain">
              {tf.alternatives.map((a, i) => (
                <li key={i} className="card">
                  <strong>{a.title}</strong>
                  {a.minutes != null && <span className="muted"> · {formatMinutes(a.minutes)}</span>}
                  {a.costText && <span className="muted"> · {a.costText}</span>}
                  <div>{a.summary}</div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tf.note && (
          <section>
            <h2 className="section-title">{tr.transfer.note}</h2>
            <p>{tf.note}</p>
          </section>
        )}
        {which === 'arrival' && <TipCards tips={allTips(rec.trip).filter((x) => x.tip.when === 'on-arrival').map((x) => x.tip)} owner="trip" tripId={tripKey} us={us} title={tr.tips.onArrival} testid="tips-arrival" />}
        <SourceList sources={tf.sources} verifiedAt={tf.verifiedAt} />
        <p className="note small">{tr.checkBeforeGo}</p>
      </main>
    </div>
  );
}
