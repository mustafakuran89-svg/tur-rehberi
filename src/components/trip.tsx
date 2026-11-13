// Kapıdan kapıya bileşenleri: otel kartı, şoföre göster, otele dön, otelden/otele etap kartı,
// akşam etkinliği kartı. Hepsi yalnızca planla gelen veriyi gösterir; alan boşsa hiç görünmez.
import { useState } from 'react';
import { tr } from '../i18n/tr';
import type { DayLeg, EveningEvent, Lodging, Trip } from '../plan/types';
import { appleMapsUrl } from '../lib/maps';
import { formatDate, formatMinutes } from '../lib/format';
import { planImages } from '../lib/gallery';
import { eventConflicts } from '../lib/events';
import { TipCards } from './TipCards';
import { SaveButton } from './Save';
import { lastKnownPosition, returnToHotelUrl } from '../lib/links';
import { eventKey, updateUserState, type UserState } from '../lib/userState';
import { eventPast } from '../map/fromDay';
import { href, paths } from '../lib/router';
import { minutesBetween } from '../lib/ics';
import { ActionButtons, Fullscreen, StoredImg } from './v2';

export function DriverCard({ l, onClose }: { l: Lodging; onClose: () => void }) {
  return (
    <Fullscreen onClose={onClose} label={tr.lodging.showDriver} className="fs-text">
      <p className="fs-big" data-testid="driver-name">
        {l.name || tr.lodging.myHotel}
      </p>
      {l.address && (
        <p className="fs-sub" data-testid="driver-address">
          {l.address}
        </p>
      )}
      <p className="small">{tr.lodging.driverHint}</p>
    </Fullscreen>
  );
}

export function ReturnHotelButton({ l }: { l: Lodging | null | undefined }) {
  if (!l || (typeof l.lat !== 'number' && !l.address)) return null;
  return (
    <a className="btn btn-block return-hotel" href={returnToHotelUrl(l, lastKnownPosition())} target="_blank" rel="noopener noreferrer" data-testid="return-hotel">
      ⌂ {tr.lodging.returnHotel}
    </a>
  );
}

export function LodgingCard({ l, tripKey }: { l: Lodging | null | undefined; tripKey: string }) {
  const [driver, setDriver] = useState(false);
  if (!l)
    return (
      <a className="btn btn-small btn-ghost" href={href(paths.pin(tripKey, 0, 'lodging', 'x'))} data-testid="mark-hotel">
        ⌂ {tr.lodging.markHotel}
      </a>
    );
  return (
    <section className="card lodging-card" id="otel" data-testid="lodging">
      <div className="card-title">{tr.lodging.title}</div>
      <h3>{l.name || tr.lodging.myHotel}</h3>
      {l.address && <p className="muted">{l.address}</p>}
      {(l.checkIn || l.checkOut) && (
        <p className="small">
          {l.checkIn && `${tr.lodging.checkIn}: ${l.checkIn}`}
          {l.checkIn && l.checkOut && ' · '}
          {l.checkOut && `${tr.lodging.checkOut}: ${l.checkOut}`}
        </p>
      )}
      {l.note && <p className="small muted">{l.note}</p>}
      <ActionButtons phone={l.phone} website={l.website} mapsUrl={appleMapsUrl({ name: l.name, lat: l.lat, lng: l.lng, address: l.address })} />
      <div className="row">
        <button className="btn btn-small" onClick={() => setDriver(true)} data-testid="show-driver">
          🚕 {tr.lodging.showDriver}
        </button>
        <a className="btn btn-small btn-ghost" href={href(paths.pin(tripKey, 0, 'lodging', 'x'))}>
          {tr.day.fixPin}
        </a>
      </div>
      {driver && <DriverCard l={l} onClose={() => setDriver(false)} />}
    </section>
  );
}

export function DayLegCard({ leg, title, testid }: { leg: DayLeg | null | undefined; title: string; testid: string }) {
  if (!leg) return null;
  return (
    <div className={`card leg-card leg-card-${leg.mode}`} data-testid={testid}>
      <div className="card-title">
        ⌂ {title}
        {leg.minutes != null && ` · ${formatMinutes(leg.minutes)} ${tr.leg[leg.mode]}`}
      </div>
      <p>{leg.instruction}</p>
    </div>
  );
}

/**
 * Etkinlik kartı (Geliştirme 4): görsel (yalnız planla gelen), ad, tür, mekan, tarih ve saat, süre,
 * fiyat, tanıtım, bilet durumu, ipuçları; Bilet al, Web sitesi, Haritalarda aç, Takvime ekle,
 * Gidiyorum. Rehberin seçimi rozetle; "Gidiyorum" denince çakışma denetimi.
 */
export function EventCard({ e, i, tripKey, dayIndex, us, now, trip, date, multi = false }: { e: EveningEvent; i: number; tripKey: string; dayIndex: number; us: UserState | undefined; now: Date; trip?: Trip; date?: string; multi?: boolean }) {
  const k = eventKey(e);
  const going = !!us?.going[k];
  const past = !multi && eventPast(e, now);
  const label = multi ? '⟳' : `E${i + 1}`;
  const cal = e.startTime ? { uid: `${tripKey}-d${dayIndex}-${multi ? 'h' : 'e'}${i}`, title: e.title, date: date ?? e.date, start: e.startTime, minutes: e.endTime ? minutesBetween(e.startTime, e.endTime) : (e.durationMinutes ?? 120), location: [e.venueName, e.address].filter(Boolean).join(', '), url: e.bookingUrl ?? e.website ?? null } : null;
  const img = planImages(e.images)[0];
  const conflicts = going && trip ? eventConflicts(trip, us, { e, key: k, dayIndex, i, multi }, date ?? e.date) : [];
  return (
    <article className={`card event-card${past ? ' past' : ''}${going ? ' going' : ''}`} id={multi ? `H${i + 1}` : `E${i + 1}`} data-testid="event" data-going={going} data-past={past} data-kind={e.kind} data-multi={multi}>
      {img && <StoredImg src={img.thumb} alt="" className="event-img" />}
      <div className="venue-head">
        <span className="code code-E">{label}</span>
        <div>
          <div className="card-kicker">
            {tr.events.kinds[e.kind]}
            {multi ? ` · ${formatDate(e.date)}${e.endDate ? `–${formatDate(e.endDate)}` : ''}` : ''}
            {e.startTime && ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''}`}
            {past && ` · ${tr.events.past}`}
          </div>
          <h3>{e.title}</h3>
          {e.recommended && (
            <span className="badge badge-guide" data-testid="recommended">
              ★ {tr.events4.recommended}
            </span>
          )}
        </div>
      </div>
      <p className="muted">
        {e.venueName}
        {e.address && ` · ${e.address}`}
      </p>
      {e.description && <p data-testid="event-desc">{e.description}</p>}
      <dl className="facts">
        {e.durationMinutes ? (
          <div>
            <dt>{tr.events4.duration('')}</dt>
            <dd>{formatMinutes(e.durationMinutes)}</dd>
          </div>
        ) : null}
        {e.priceText && (
          <div>
            <dt>{tr.events.price}</dt>
            <dd>{e.priceText}</dd>
          </div>
        )}
        {e.suitsWhom && (
          <div>
            <dt>{tr.events.suits}</dt>
            <dd>{e.suitsWhom}</dd>
          </div>
        )}
      </dl>
      {e.availabilityNote && (
        <p className="note small" data-testid="availability">
          {e.availabilityNote}
        </p>
      )}
      {e.note && <p className="small">{e.note}</p>}
      <ActionButtons ticketUrl={e.bookingUrl} website={e.website} mapsUrl={appleMapsUrl({ name: e.venueName, lat: e.lat, lng: e.lng, address: e.address ?? e.venueName })} calendar={cal} />
      <TipCards tips={e.tips} owner={k} tripId={tripKey} us={us} testid="tips-event" />
      <div className="row">
        <button
          className={`btn btn-small ${going ? 'btn-primary' : ''}`}
          aria-pressed={going}
          data-testid="going"
          onClick={() =>
            updateUserState(tripKey, (u) => {
              const g = { ...u.going };
              if (g[k]) delete g[k];
              else g[k] = true;
              return { ...u, going: g };
            })
          }
        >
          {going ? tr.events.goingOn : tr.events.going}
        </button>
        <SaveButton tripId={tripKey} us={us} place={{ key: k, source: 'event', name: e.title, lat: e.lat, lng: e.lng, description: e.description ?? null, visitMinutes: e.durationMinutes ?? null }} />
      </div>
      {conflicts.length > 0 && (
        <div className="error small" role="alert" data-testid="conflict">
          <strong>{tr.events4.conflict}:</strong> {conflicts.map((c) => c.text).join(' · ')}
          {e.note && <div>{tr.events4.conflictNote(e.note)}</div>}
        </div>
      )}
    </article>
  );
}
