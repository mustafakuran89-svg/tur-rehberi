import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { boxEvents, checkBox, dismissBoxEvent, type BoxEvent, type BoxResult } from '../lib/box';
import { href, paths } from '../lib/router';

let checkedThisSession = false;

/** Gezilerim: kutudan gelen "Yeni gezi" ve "Güncellendi" kartları. Açılışta kutu bir kez denetlenir. */
export function BoxCards() {
  const [events, setEvents] = useState<BoxEvent[]>([]);
  const [res, setRes] = useState<BoxResult | null>(null);
  useEffect(() => {
    let alive = true;
    boxEvents().then((e) => alive && setEvents(e));
    if (!checkedThisSession) {
      checkedThisSession = true;
      checkBox().then(async (r) => {
        if (!alive) return;
        setRes(r);
        if (r.events.length) {
          setEvents(await boxEvents());
        }
      });
    }
    return () => {
      alive = false;
    };
  }, []);
  const errs = res?.errors ?? [];
  return (
    <>
      {errs.length > 0 && (
        <p className="error small" data-testid="box-error">
          {errs.includes('bad') ? tr.box.bad : tr.box.invalid}
        </p>
      )}
      {events.map((e) => (
        <section key={e.tripId} className="card box-card" data-testid="box-card" data-kind={e.kind}>
          <div className="card-kicker">{e.kind === 'new' ? tr.box.newTrip : tr.box.updatedTrip}</div>
          <h2 className="card-title">{e.title}</h2>
          {e.diff && !e.diff.empty && (
            <p className="small">
              {[e.diff.added && tr.importer.diffAdded(String(e.diff.added)), e.diff.removed && tr.importer.diffRemoved(String(e.diff.removed)), e.diff.timeChanged && tr.importer.diffTime(String(e.diff.timeChanged))].filter(Boolean).join(' ')}
            </p>
          )}
          <div className="row">
            <a className="btn btn-small btn-primary" href={href(paths.summary(e.tripId))} data-testid="box-open">
              {tr.box.open}
            </a>
            <a className="btn btn-small" href={href(paths.prepare(e.tripId))}>
              {tr.box.prepareNow}
            </a>
            <button
              className="btn btn-small btn-ghost"
              data-testid="box-dismiss"
              onClick={async () => {
                await dismissBoxEvent(e.tripId);
                setEvents(await boxEvents());
              }}
            >
              {tr.box.dismiss}
            </button>
          </div>
        </section>
      ))}
    </>
  );
}
