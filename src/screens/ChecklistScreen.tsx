// Hazırlık listesi: plandaki rezervasyonlar, biletli duraklar ve seçilen akşam etkinlikleri tek,
// işaretlenebilir liste. Rezervasyonu şart olanlar üstte, sonra tarihe göre.
import { tr } from '../i18n/tr';
import { TipCards } from '../components/TipCards';
import { allTips } from './TipsScreen';
import type { Trip } from '../plan/types';
import { formatDate } from '../lib/format';
import { paths } from '../lib/router';
import { eventKey, slug, stopKey, updateUserState, venueKey, type UserState } from '../lib/userState';
import { ActionButtons } from '../components/v2';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

export interface CheckItem {
  key: string;
  date: string | null;
  kind: 'required' | 'recommended' | 'ticket' | 'event' | 'plan';
  title: string;
  note?: string | null;
  bookingUrl?: string | null;
  ticketUrl?: string | null;
  phone?: string | null;
  website?: string | null;
  reservation?: 'required' | 'recommended' | 'none' | null;
}

export function checklistItems(t: Trip, us: UserState | undefined): CheckItem[] {
  const out: CheckItem[] = [];
  const seen = new Set<string>();
  const push = (x: CheckItem) => {
    if (seen.has(x.key)) return;
    seen.add(x.key);
    out.push(x);
  };
  t.days.forEach((d) => {
    const venues = [...d.breakfast, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : []), ...d.dinner, ...d.snacks];
    venues.forEach((v) => {
      if (v.reservation !== 'required' && v.reservation !== 'recommended' && !v.bookingUrl) return;
      push({ key: venueKey(v), date: d.date, kind: v.reservation === 'required' ? 'required' : 'recommended', title: `${v.code} ${v.name}`, note: v.reservationNote, bookingUrl: v.bookingUrl, phone: v.phone, website: v.website, reservation: v.reservation });
    });
    d.stops.forEach((s) => {
      if (!s.ticketUrl && !s.ticketOrBooking) return;
      push({ key: stopKey(s), date: d.date, kind: 'ticket', title: `${s.order}. ${s.name}`, note: s.ticketOrBooking, ticketUrl: s.ticketUrl, phone: s.phone, website: s.website });
    });
    (d.eveningEvents ?? []).forEach((e) => {
      if (!us?.going[eventKey(e)]) return;
      push({ key: eventKey(e), date: e.date, kind: 'event', title: e.title, note: [e.startTime, e.priceText].filter(Boolean).join(' · '), ticketUrl: e.bookingUrl, website: e.website });
    });
  });
  t.reservations.forEach((r) => push({ key: `r:${slug(r.what)}`, date: null, kind: 'plan', title: r.what, note: [r.when, r.note].filter(Boolean).join(' · '), website: r.url }));
  const order = (x: CheckItem) => (x.kind === 'required' ? 0 : 1);
  return out.map((x, i) => ({ x, i })).sort((a, b) => order(a.x) - order(b.x) || (a.x.date ?? '9999').localeCompare(b.x.date ?? '9999') || a.i - b.i).map((y) => y.x);
}

export function ChecklistScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const items = checklistItems(rec.trip, us);
  const label = { required: tr.checklist.required, recommended: tr.checklist.recommended, ticket: tr.checklist.ticket, event: tr.checklist.event, plan: tr.checklist.planNote };
  return (
    <div className="page">
      <Header title={tr.checklist.title} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="muted">{tr.checklist.intro}</p>
        {items.length === 0 && <p>{tr.checklist.empty}</p>}
        <TipCards tips={allTips(rec.trip).filter((x) => x.tip.when === 'before-trip').map((x) => x.tip)} owner="trip-before" tripId={tripKey} us={us} title={tr.tips.beforeTrip} testid="tips-before" />
        <ul className="plain">
          {items.map((x) => {
            const done = !!us?.booked[x.key]?.done;
            return (
              <li key={x.key} className={`card check-item${done ? ' done' : ''}`} data-testid="check-item" data-kind={x.kind} data-done={done}>
                <label className="field check">
                  <input
                    type="checkbox"
                    checked={done}
                    data-testid="check-done"
                    onChange={(e) => {
                      const on = e.target.checked;
                      updateUserState(tripKey, (u) => ({ ...u, booked: { ...u.booked, [x.key]: { note: u.booked[x.key]?.note ?? '', done: on } } }));
                    }}
                  />
                  <span>
                    <span className={`badge badge-kind badge-${x.kind}`}>{label[x.kind]}</span> <strong>{x.title}</strong>
                    {x.date && <span className="muted small"> · {formatDate(x.date)}</span>}
                  </span>
                </label>
                {x.note && <p className="small muted">{x.note}</p>}
                {us?.booked[x.key]?.note && <p className="small">📝 {us.booked[x.key].note}</p>}
                <ActionButtons bookingUrl={x.bookingUrl} ticketUrl={x.ticketUrl} phone={x.phone} website={x.website} reservation={x.reservation} />
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
