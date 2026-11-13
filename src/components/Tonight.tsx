// Bugün ekranında "Bu akşam" kartı (saat 16:00'dan sonra): seçilen etkinlik, başlamasına kalan süre
// ve mekana yol tarifi; seçim yoksa o akşamın önerileri, rehberin seçimi başta. Etkinlik bitince
// "Otele dön" kartı öne gelir.
import { tr } from '../i18n/tr';
import type { Lodging, Trip } from '../plan/types';
import { appleMapsUrl } from '../lib/maps';
import { countdown } from '../lib/today';
import { interval, tonight } from '../lib/events';
import { href, paths } from '../lib/router';
import type { UserState } from '../lib/userState';
import { ReturnHotelButton } from './trip';

export const TONIGHT_FROM = 16 * 60;

export function Tonight({ trip, us, date, now, tripKey, lodging }: { trip: Trip; us: UserState | undefined; date: string; now: Date; tripKey: string; lodging: Lodging | null | undefined }) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < TONIGHT_FROM) return null;
  const { chosen, picks, ended } = tonight(trip, us, date, nowMin);
  if (ended)
    return (
      <section className="card tonight after-event" data-testid="after-event">
        <p>{tr.events4.afterEvent(ended.e.title)}</p>
        <ReturnHotelButton l={lodging} />
      </section>
    );
  if (chosen) {
    const iv = interval(chosen.e);
    const left = iv ? iv[0] - nowMin : null;
    return (
      <section className="card tonight" data-testid="tonight" data-mode="chosen">
        <div className="card-kicker">{tr.events4.tonight}</div>
        <h2 className="card-title">{chosen.e.title}</h2>
        <p className="muted">
          {chosen.e.venueName}
          {chosen.e.startTime && ` · ${chosen.e.startTime}`}
        </p>
        {left !== null && (
          <p className="countdown" data-testid="tonight-countdown">
            {left > 0 ? tr.events4.startsIn(countdown(left)) : tr.events4.started}
          </p>
        )}
        <a className="btn btn-primary" href={appleMapsUrl({ name: chosen.e.venueName, lat: chosen.e.lat, lng: chosen.e.lng, address: chosen.e.address ?? chosen.e.venueName })} target="_blank" rel="noopener noreferrer" data-testid="tonight-directions">
          {tr.events4.directions}
        </a>
      </section>
    );
  }
  if (!picks.length) return null;
  return (
    <section className="card tonight" data-testid="tonight" data-mode="picks">
      <div className="card-kicker">{tr.events4.tonightPicks}</div>
      <ul className="plain">
        {picks.map((r) => (
          <li key={r.key} data-testid="tonight-pick">
            {r.e.recommended && <span className="badge badge-guide">★ {tr.events4.recommended}</span>} <strong>{r.e.title}</strong>
            {r.e.startTime && <span className="muted"> · {r.e.startTime}</span>}
          </li>
        ))}
      </ul>
      <a className="btn btn-small" href={href(paths.events(tripKey))}>
        {tr.events4.link}
      </a>
    </section>
  );
}
