// Sürüm 2 ortak bileşenleri: açık-kapalı rozeti, Michelin rozeti, eylem düğmeleri, rezervasyon
// işareti, not ve puan, cihazda saklanan görsel, tam ekran metin.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { tr } from '../i18n/tr';
import type { Michelin, WeeklyHours } from '../plan/types';
import { openStatus } from '../lib/hours';
import { safeHttps, telHref } from '../lib/links';
import { buildIcs, downloadText, type IcsEvent } from '../lib/ics';
import { storedImage } from '../lib/cache';
import { updateUserState, type UserState } from '../lib/userState';

/** Saniyede bir değil, yarım dakikada bir yenilenen "şimdi". */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function OpenBadge({ hours, now }: { hours: WeeklyHours | null | undefined; now: Date }) {
  const st = openStatus(hours, now);
  if (!st) return null;
  const text = st.state === 'open' ? tr.open.open : st.state === 'closing' ? tr.open.closing : tr.open.closed;
  const sub = st.closesAt ? tr.open.until(st.closesAt) : st.opensAt ? tr.open.opensAt(st.opensAt) : '';
  return (
    <span className={`badge badge-open badge-${st.state}`} data-testid="open-badge" data-state={st.state}>
      {text}
      {sub && <span className="badge-sub"> · {sub}</span>}
    </span>
  );
}

export function michelinText(m: Michelin): string {
  return [tr.michelin[m.distinction], String(m.year), m.greenStar ? tr.michelin.green : ''].filter(Boolean).join(' · ');
}

/** Düz yazı rozet; Michelin'in logosu ve yıldız çizimi kullanılmaz. */
export function MichelinBadge({ m }: { m: Michelin | null | undefined }) {
  if (!m) return null;
  const url = safeHttps(m.url);
  const body = <span className="badge badge-michelin" data-testid="michelin-badge">{michelinText(m)}</span>;
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${michelinText(m)} — ${tr.michelin.openGuide}`} className="badge-link">
      {body}
    </a>
  ) : (
    body
  );
}

export interface ActionProps {
  phone?: string | null;
  website?: string | null;
  ticketUrl?: string | null;
  bookingUrl?: string | null;
  menuUrl?: string | null;
  reservation?: 'required' | 'recommended' | 'none' | null;
  mapsUrl?: string;
  calendar?: IcsEvent | null;
  tz?: string | null;
}

/** Yalnızca verisi olan düğme görünür. Dış bağlantılar yeni sekmede açılır; yalnız https. */
export function ActionButtons(p: ActionProps) {
  const tel = telHref(p.phone);
  const web = safeHttps(p.website);
  const ticket = safeHttps(p.ticketUrl);
  const book = safeHttps(p.bookingUrl);
  const menu = safeHttps(p.menuUrl);
  const callToBook = !book && !!tel && (p.reservation === 'required' || p.reservation === 'recommended');
  const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;
  return (
    <div className="row actions" data-testid="actions">
      {book && (
        <a className="btn btn-primary btn-small" href={book} {...ext} data-testid="act-book">
          {tr.actions.book}
        </a>
      )}
      {callToBook && (
        <a className="btn btn-primary btn-small" href={tel!} data-testid="act-call-book">
          📞 {tr.actions.callToBook}
        </a>
      )}
      {ticket && (
        <a className="btn btn-primary btn-small" href={ticket} {...ext} data-testid="act-ticket">
          {tr.actions.ticket}
        </a>
      )}
      {tel && !callToBook && (
        <a className="btn btn-small" href={tel} data-testid="act-call">
          📞 {tr.actions.call}
        </a>
      )}
      {web && (
        <a className="btn btn-small" href={web} {...ext} data-testid="act-web">
          {tr.actions.website}
        </a>
      )}
      {menu && (
        <a className="btn btn-small" href={menu} {...ext} data-testid="act-menu">
          {tr.actions.menu}
        </a>
      )}
      {p.mapsUrl && (
        <a className="btn btn-small" href={p.mapsUrl} {...ext} data-testid="apple-maps">
          {tr.openInMaps}
        </a>
      )}
      {p.calendar && (
        <button className="btn btn-small btn-ghost" onClick={() => downloadText(`${p.calendar!.uid}.ics`, buildIcs([p.calendar!], p.tz ?? null), 'text/calendar')} data-testid="act-calendar">
          📅 {tr.actions.calendar}
        </button>
      )}
    </div>
  );
}

/** "Rezervasyon yapıldı" işareti ve kısa not (saat, onay numarası). */
export function BookingMark({ tripId, k, us }: { tripId: string; k: string; us: UserState | undefined }) {
  const mark = us?.booked[k];
  const [note, setNote] = useState(mark?.note ?? '');
  useEffect(() => setNote(mark?.note ?? ''), [mark?.note]);
  const save = (patch: Partial<{ done: boolean; note: string }>) =>
    updateUserState(tripId, (u) => ({ ...u, booked: { ...u.booked, [k]: { done: u.booked[k]?.done ?? false, note: u.booked[k]?.note ?? '', ...patch } } }));
  return (
    <div className="booking-mark">
      <label className="field check">
        <input type="checkbox" checked={!!mark?.done} onChange={(e) => save({ done: e.target.checked })} data-testid="booked" />
        <span>{tr.actions.bookedMark}</span>
      </label>
      {mark?.done && (
        <input
          className="text-input"
          aria-label={tr.actions.bookedNote}
          placeholder={tr.actions.bookedNotePh}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (mark?.note ?? '') && save({ note })}
          data-testid="booked-note"
        />
      )}
    </div>
  );
}

export function BookedBadge() {
  return <span className="badge badge-booked" data-testid="booked-badge">✓ {tr.actions.booked}</span>;
}

/** Gezi günlüğü notu. */
export function NoteBox({ tripId, k, us }: { tripId: string; k: string; us: UserState | undefined }) {
  const [v, setV] = useState(us?.notes[k] ?? '');
  const [saved, setSaved] = useState(false);
  useEffect(() => setV(us?.notes[k] ?? ''), [us?.notes, k]);
  return (
    <label className="note-box">
      <span className="small muted">{tr.journal.note}</span>
      <textarea
        rows={3}
        value={v}
        placeholder={tr.journal.notePh}
        onChange={(e) => {
          setV(e.target.value);
          setSaved(false);
        }}
        onBlur={async () => {
          if (v === (us?.notes[k] ?? '')) return;
          await updateUserState(tripId, (u) => {
            const notes = { ...u.notes };
            if (v.trim()) notes[k] = v;
            else delete notes[k];
            return { ...u, notes };
          });
          setSaved(true);
        }}
        data-testid="note"
      />
      {saved && <span className="small ok">{tr.journal.saved}</span>}
    </label>
  );
}

/** Beş üzerinden puan. */
export function Rating({ tripId, k, us }: { tripId: string; k: string; us: UserState | undefined }) {
  const r = us?.ratings[k] ?? 0;
  return (
    <div className="rating" role="radiogroup" aria-label={tr.journal.rating} data-testid="rating">
      <span className="small muted">{tr.journal.rating}</span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          role="radio"
          aria-checked={r === n}
          aria-label={tr.journal.rate(n)}
          className={`star${n <= r ? ' on' : ''}`}
          onClick={() =>
            updateUserState(tripId, (u) => {
              const ratings = { ...u.ratings };
              if (ratings[k] === n) delete ratings[k];
              else ratings[k] = n;
              return { ...u, ratings };
            })
          }
        >
          {n <= r ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

/** Görsel: cihazda saklanmış kopyası varsa (Geziyi hazırla) o, yoksa ağdaki adres. */
export function StoredImg({ src, alt, className, onClick }: { src: string; alt: string; className?: string; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const obj = useRef<string | null>(null);
  useEffect(() => {
    let alive = true;
    storedImage(src).then((b) => {
      if (!alive) return;
      if (b) {
        obj.current = URL.createObjectURL(b);
        setUrl(obj.current);
      } else setUrl(src);
    });
    return () => {
      alive = false;
      if (obj.current) URL.revokeObjectURL(obj.current);
      obj.current = null;
    };
  }, [src]);
  if (!url) return <span className={`img-ph ${className ?? ''}`} aria-hidden="true" />;
  return <img src={url} alt={alt} className={className} loading="lazy" decoding="async" onClick={onClick} referrerPolicy="no-referrer" />;
}

/** Tam ekran kaplama (şoföre göster, garsona göster, fotoğraf). Esc ve Kapat ile kapanır. */
export function Fullscreen({ onClose, label, children, className }: { onClose: () => void; label: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className={`fullscreen ${className ?? ''}`} role="dialog" aria-modal="true" aria-label={label} ref={ref} tabIndex={-1} data-testid="fullscreen">
      <button className="btn fs-close" onClick={onClose} data-testid="fs-close">
        ✕ {tr.close}
      </button>
      {children}
    </div>
  );
}
