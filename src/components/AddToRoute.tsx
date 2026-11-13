// "Rotama ekle" (Geliştirme 4, Aşama E.5): gün seçilir, uygulama en az ek yürüyüşlü konumu bulur ve
// önizler (hangi iki durağın arasına, kaç dakika ek yürüyüş, gün ne kadar uzar, kapalı/taşma
// uyarıları). Kullanıcı onaylayınca kişisel rotaya eklenir; plan değişmez.
import { useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Trip } from '../plan/types';
import { planInsert } from '../lib/route';
import { formatDate } from '../lib/format';
import { updateUserState, type SavedPlace } from '../lib/userState';
import { isoDate } from '../lib/today';

export function addPlaceToDay(tripId: string, date: string, place: SavedPlace, after: string | null) {
  return updateUserState(tripId, (u) => {
    const route = { ...(u.route ?? {}) };
    const cur = route[date] ?? { added: [], order: null };
    if (cur.added.some((a) => a.place.key === place.key)) return u;
    let order = cur.order;
    if (order) {
      // elle sıralanmış günde yeni yer, seçilen konuma yerleşir
      const at = after === null ? 0 : order.indexOf(after) + 1;
      order = [...order.slice(0, at), place.key, ...order.slice(at)];
    }
    route[date] = { added: [...cur.added, { place, after }], order };
    return { ...u, route };
  });
}

export function AddToRoute({ trip, tripId, place, suggestedDate, onClose, onDone }: { trip: Trip; tripId: string; place: SavedPlace; suggestedDate?: string | null; onClose: () => void; onDone: (msg: string) => void }) {
  const today = isoDate(new Date());
  const initial = Math.max(
    0,
    trip.days.findIndex((d) => d.date === (suggestedDate ?? '')) >= 0 ? trip.days.findIndex((d) => d.date === suggestedDate) : trip.days.findIndex((d) => d.date === today),
  );
  const [di, setDi] = useState(initial);
  const day = trip.days[di];
  const pv = useMemo(() => planInsert(day, place), [day, place]);
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={tr.route.addTitle} data-testid="add-route">
      <div className="modal">
        <h3>
          {tr.route.addTitle}: {place.name}
        </h3>
        <label className="field">
          <span>{tr.route.chooseDay}</span>
          <select value={di} onChange={(e) => setDi(Number(e.target.value))} data-testid="add-day">
            {trip.days.map((d, i) => (
              <option key={i} value={i}>
                {tr.day.label(i + 1)} · {formatDate(d.date)}
                {d.date === suggestedDate ? ` (${tr.route.suggested})` : ''}
              </option>
            ))}
          </select>
        </label>
        <section className="preview" data-testid="add-preview" data-index={pv.index}>
          <h4>{tr.route.preview}</h4>
          <p data-testid="add-between">{tr.route.between(pv.prevName, pv.nextName)}</p>
          <p className="small" data-testid="add-walk">
            {tr.route.extraWalk(pv.extraWalkMin)} {tr.route.dayLonger(pv.dayExtraMin)}
          </p>
          {pv.warnings.map((w) => (
            <p key={w} className="note small" data-testid="add-warn" data-warn={w}>
              {tr.route.warn[w]}
            </p>
          ))}
        </section>
        <div className="row">
          <button className="btn btn-ghost" onClick={onClose}>
            {tr.route.cancel}
          </button>
          <button
            className="btn btn-primary"
            data-testid="add-confirm"
            onClick={async () => {
              await addPlaceToDay(tripId, day.date, place, pv.after);
              onDone(tr.route.added(place.name, di + 1));
              onClose();
            }}
          >
            {tr.route.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
