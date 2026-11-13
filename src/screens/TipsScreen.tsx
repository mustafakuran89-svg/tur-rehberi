import { useMemo, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Tip, TipKind, Trip } from '../plan/types';
import { paths } from '../lib/router';
import { eventKey, placeKey, stopKey, venueKey } from '../lib/userState';
import { foldText } from '../lib/chapters';
import { TipCard } from '../components/TipCards';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

export interface TipRef {
  tip: Tip;
  owner: string; // kullanıcı durumundaki anahtar (gezi geneli: 'trip')
  context: string | null; // "Durak: …"
}

/** Gezinin bütün ipuçları: gezi geneli, duraklar, mekanlar, etkinlikler, keşfet. */
export function allTips(t: Trip): TipRef[] {
  const out: TipRef[] = (t.tips ?? []).map((tip) => ({ tip, owner: 'trip', context: null }));
  t.days.forEach((d) => {
    d.stops.forEach((s) => (s.tips ?? []).forEach((tip) => out.push({ tip, owner: stopKey(s), context: tr.tips.fromStop(s.name) })));
    [...d.breakfast, ...d.dinner, ...d.snacks, ...(d.lunch ? [d.lunch.main, ...(d.lunch.backup ? [d.lunch.backup] : [])] : [])].forEach((v) => (v.tips ?? []).forEach((tip) => out.push({ tip, owner: venueKey(v), context: v.name })));
    (d.eveningEvents ?? []).forEach((e) => (e.tips ?? []).forEach((tip) => out.push({ tip, owner: eventKey(e), context: e.title })));
  });
  (t.happenings ?? []).forEach((e) => (e.tips ?? []).forEach((tip) => out.push({ tip, owner: eventKey(e), context: e.title })));
  (t.discover ?? []).forEach((p) => (p.tips ?? []).forEach((tip) => out.push({ tip, owner: placeKey(p), context: p.name })));
  return out;
}

const ORDER: TipKind[] = ['transport', 'ticket', 'money', 'timing', 'etiquette', 'safety', 'food', 'shopping', 'photo', 'other'];

export function matchTip(r: TipRef, q: string): boolean {
  if (!q.trim()) return true;
  const hay = foldText([r.tip.title, r.tip.text, ...(r.tip.steps ?? []), r.context ?? ''].join(' '));
  return foldText(q)
    .split(' ')
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function TipsScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const [q, setQ] = useState('');
  const tips = useMemo(() => (rec ? allTips(rec.trip) : []), [rec]);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const general = tips.filter((x) => x.owner === 'trip');
  // Arama yokken gezi geneli ipuçları türe göre gruplanır; arama bütün ipuçlarını (duraklar dahil) kapsar.
  const shown = q.trim() ? tips.filter((x) => matchTip(x, q)) : general;
  const groups = ORDER.map((k) => ({ k, items: shown.filter((x) => (x.tip.kind ?? 'other') === k) })).filter((g) => g.items.length);
  return (
    <div className="page">
      <Header title={tr.tips.pageTitle} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <input className="text-input" type="search" placeholder={tr.tips.search} aria-label={tr.tips.search} value={q} onChange={(e) => setQ(e.target.value)} data-testid="tips-search" />
        {!tips.length && <p className="muted">{tr.tips.none}</p>}
        {tips.length > 0 && !shown.length && <p className="muted">{tr.tips.noResult}</p>}
        {groups.map((g) => (
          <section key={g.k} data-testid="tip-group" data-kind={g.k}>
            <h2 className="section-title">{tr.tips.kinds[g.k]}</h2>
            {g.items.map((x, i) => (
              <TipCard key={i} tip={x.tip} owner={x.owner} tripId={tripKey} us={us} context={x.context ?? undefined} />
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
