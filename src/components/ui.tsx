import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { applyPins, migrateKeys, updateUserState, useUserState, type UserState } from '../lib/userState';
import { applyRoute } from '../lib/route';
import { tr } from '../i18n/tr';
import { getTrip, subscribeTrips, type TripRecord } from '../lib/store';
import type { RuleWarning } from '../plan/rules';
import type { Source } from '../plan/types';
import { formatDate } from '../lib/format';
import { href } from '../lib/router';

export function Header({ title, back, kicker, right }: { title: string; back?: string; kicker?: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      {back ? (
        <a className="back" href={href(back)} aria-label={tr.back}>
          ‹ {tr.back}
        </a>
      ) : (
        <span className="brand">{tr.appName}</span>
      )}
      {right}
      <div className="title-block">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1>{title}</h1>
      </div>
    </header>
  );
}

export function SampleBadge() {
  return <span className="badge badge-sample">{tr.sampleBadge}</span>;
}

export function FixedBadge() {
  return <span className="badge badge-fixed">{tr.fixedBadge}</span>;
}

export function UnverifiedBadge() {
  return (
    <span className="badge badge-warn" title={tr.unverifiedHint}>
      ⚠ {tr.unverified}
    </span>
  );
}

export function isUnverified(x: { sources: Source[]; verifiedAt: string | null }): boolean {
  return x.sources.length === 0 || !x.verifiedAt;
}

export function Warnings({ items, title }: { items: RuleWarning[]; title: string }) {
  if (!items.length) return null;
  return (
    <section className="warnings" data-testid="warnings">
      <h3>⚠ {title}</h3>
      <ul>
        {items.map((w, i) => (
          <li key={i}>{w.message}</li>
        ))}
      </ul>
    </section>
  );
}

export function SourceList({ sources, verifiedAt }: { sources: Source[]; verifiedAt: string | null }) {
  if (!sources.length && !verifiedAt) return null;
  return (
    <div className="sources">
      {sources.length > 0 && (
        <>
          <span className="muted">{tr.sources}: </span>
          {sources.map((s, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
            </span>
          ))}
        </>
      )}
      {verifiedAt && <div className="muted">{tr.verifiedAt(formatDate(verifiedAt))}</div>}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}

export function useToast(): [string | null, (t: string) => void] {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const id = setTimeout(() => setText(null), 3500);
    return () => clearTimeout(id);
  }, [text]);
  return [text, setText];
}

let version = 0;
const bump = () => {
  version++;
};
subscribeTrips(bump);

/**
 * Bir geziyi yerel veritabanından okur; veritabanı değişince yeniden okur. Kullanıcının iğne
 * düzeltmeleri plana uygulanmış olarak döner (plan kaydı değişmez).
 */
export function useTrip(key: string): { rec: TripRecord | null | undefined; us: UserState | undefined; raw: TripRecord | null | undefined } {
  const v = useSyncExternalStore(subscribeTrips, () => version);
  const [raw, setRaw] = useState<TripRecord | null | undefined>(undefined);
  const { us } = useUserState(key);
  useEffect(() => {
    let alive = true;
    getTrip(key).then((r) => alive && setRaw(r ?? null));
    return () => {
      alive = false;
    };
  }, [key, v]);
  // Plan kimlik kazanınca eski (ada bağlı) işaretler kimlik anahtarına taşınır
  useEffect(() => {
    if (!raw || !us) return;
    const m = migrateKeys(raw.trip, us);
    if (m) void updateUserState(key, () => m);
  }, [raw, us, key]);
  const rec = useMemo(() => (raw && us ? { ...raw, trip: applyRoute(applyPins(raw.trip, us), us).trip } : raw && us === undefined ? undefined : raw), [raw, us]);
  return { rec, us, raw };
}

export function useTripsVersion(): number {
  return useSyncExternalStore(subscribeTrips, () => version);
}

export function Missing({ text }: { text?: string }) {
  return (
    <div className="page">
      <Header title={tr.appName} back="/" />
      <main className="content">
        <p>{text ?? tr.tripNotFound}</p>
        <a className="btn" href={href('/')}>
          {tr.goHome}
        </a>
      </main>
    </div>
  );
}

export function Loading() {
  return (
    <div className="page">
      <main className="content">
        <p className="muted">{tr.loading}</p>
      </main>
    </div>
  );
}

export function Confirm({ title, body, okText, onOk, onCancel }: { title: string; body: string; okText: string; onOk: () => void; onCancel: () => void }) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="row">
          <button className="btn btn-ghost" onClick={onCancel}>
            {tr.cancel}
          </button>
          <button className="btn btn-primary" onClick={onOk} data-testid="confirm-ok">
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
