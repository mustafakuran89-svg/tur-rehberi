// Günün kişisel rotası (Geliştirme 4, Aşama E.5-6): eklenen yerler, elle sıralama (yukarı/aşağı),
// rotadan çıkarma ve "özgün plana dön". Plan değişmez; değişiklik kullanıcı durumundadır.
import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { effectiveSeq } from '../lib/route';
import { applyPins, updateUserState, type DayRoute } from '../lib/userState';
import { inBbox, savedRegions } from '../map/regions';
import { href, paths } from '../lib/router';
import { Confirm, Toast, useToast, useTrip } from './ui';

export function RouteEditor({ tripKey, dayIndex }: { tripKey: string; dayIndex: number }) {
  const { raw, us } = useTrip(tripKey);
  const [editing, setEditing] = useState(false);
  const [ask, setAsk] = useState(false);
  const [outside, setOutside] = useState<string[]>([]);
  const [toast, showToast] = useToast();
  const base = raw && us ? applyPins(raw.trip, us).days[dayIndex] : undefined;
  const r: DayRoute | undefined = base ? us?.route?.[base.date] : undefined;
  const added = r?.added ?? [];
  useEffect(() => {
    if (!added.length) return setOutside([]);
    savedRegions().then((regs) => {
      if (!regs.length) return setOutside([]);
      setOutside(added.filter((a) => a.place.lat !== null && a.place.lng !== null && !regs.some((g) => inBbox(g.bbox, { lat: a.place.lat!, lng: a.place.lng! }))).map((a) => a.place.name));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(added.map((a) => a.place.key))]);
  if (!base || !us) return null;
  const { seq, orphaned } = effectiveSeq(base, r);
  const changed = !!r && (r.added.length > 0 || !!r.order?.length);
  const save = (fn: (r: DayRoute) => DayRoute | null) =>
    updateUserState(tripKey, (u) => {
      const route = { ...(u.route ?? {}) };
      const next = fn(route[base.date] ?? { added: [], order: null });
      if (next && (next.added.length || next.order?.length)) route[base.date] = next;
      else delete route[base.date];
      return { ...u, route };
    });
  const move = (i: number, d: -1 | 1) => {
    const keys = seq.map((x) => x.key);
    const j = i + d;
    if (j < 0 || j >= keys.length) return;
    [keys[i], keys[j]] = [keys[j], keys[i]];
    void save((cur) => ({ ...cur, order: keys }));
  };
  const remove = (key: string) => save((cur) => ({ added: cur.added.filter((a) => a.place.key !== key), order: cur.order ? cur.order.filter((k) => k !== key) : null }));

  return (
    <section className="route-editor" data-testid="route-editor" data-changed={changed}>
      {changed && <p className="small muted">{tr.route.personalNote}</p>}
      {orphaned.length > 0 && (
        <p className="note small" data-testid="route-orphaned">
          {tr.route.orphaned(orphaned.join(', '))}
        </p>
      )}
      {outside.length > 0 && (
        <p className="note small" data-testid="route-outside">
          {tr.route.outsideMap} <a href={href(paths.prepare(tripKey))}>{tr.prepare.title}</a>
        </p>
      )}
      <div className="row">
        <button className="btn btn-small" onClick={() => setEditing((x) => !x)} data-testid="route-edit">
          {editing ? tr.route.doneOrder : tr.route.editOrder}
        </button>
        {changed && (
          <button className="btn btn-small btn-ghost" onClick={() => setAsk(true)} data-testid="route-reset">
            ↺ {tr.route.reset}
          </button>
        )}
      </div>
      {editing && (
        <ol className="route-list" data-testid="route-list">
          {seq.map((x, i) => (
            <li key={x.key} data-testid="route-item" data-key={x.key} data-added={x.baseIndex === null}>
              <span className="num">{i + 1}</span> <span className="route-name">{x.stop.name}</span>
              {x.baseIndex === null && <span className="badge badge-guide">{tr.route.addedBadge}</span>}
              <span className="row">
                <button className="btn btn-small btn-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`${tr.route.up}: ${x.stop.name}`} data-testid="route-up">
                  ↑
                </button>
                <button className="btn btn-small btn-ghost" disabled={i === seq.length - 1} onClick={() => move(i, 1)} aria-label={`${tr.route.down}: ${x.stop.name}`} data-testid="route-down">
                  ↓
                </button>
                {x.baseIndex === null && (
                  <button className="btn btn-small btn-danger" onClick={() => remove(x.key)} aria-label={`${tr.route.remove}: ${x.stop.name}`} data-testid="route-remove">
                    ✕
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      {ask && (
        <Confirm
          title={tr.route.reset}
          body={tr.route.resetConfirm}
          okText={tr.route.reset}
          onCancel={() => setAsk(false)}
          onOk={async () => {
            setAsk(false);
            await save(() => null);
            showToast(tr.route.resetDone);
          }}
        />
      )}
      <Toast text={toast} />
    </section>
  );
}
