// Yakınımda (Geliştirme 4, Aşama E.3): bulunulan konumun çevresindeki Vikipedi maddeleri. Yalnız
// çevrimiçi çalışır; konum yalnız düğmeyle istenir. Kaynak ve lisans yazılır; rehber anlatımı değildir.
import { useState } from 'react';
import { tr } from '../i18n/tr';
import { paths } from '../lib/router';
import { formatDistance } from '../lib/format';
import { wikiNearby, wikiToSaved, type WikiPlace } from '../lib/places';
import { speak } from '../lib/speech';
import { useOnline } from '../lib/online';
import { addLog } from '../lib/log';
import { askPosition } from './DiscoverScreen';
import { SaveButton } from '../components/Save';
import { AddToRoute } from '../components/AddToRoute';
import type { SavedPlace } from '../lib/userState';
import { Header, Loading, Missing, SampleBadge, Toast, useToast, useTrip } from '../components/ui';

export function NearbyScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const online = useOnline();
  const [state, setState] = useState<'idle' | 'busy' | 'fail' | 'geo'>('idle');
  const [items, setItems] = useState<WikiPlace[] | null>(null);
  const [adding, setAdding] = useState<SavedPlace | null>(null);
  const [toast, showToast] = useToast();
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const find = async () => {
    setState('busy');
    const pos = await askPosition();
    if (!pos) return setState('geo');
    try {
      setItems(await wikiNearby(pos, 1000));
      setState('idle');
    } catch (e) {
      addLog('info', `Yakınımda: ${(e as Error).message}`);
      setState('fail');
    }
  };
  return (
    <div className="page">
      <Header title={tr.nearby.title} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="small">{tr.nearby.intro}</p>
        {!online ? (
          <p className="note" data-testid="nearby-offline">
            {tr.nearby.offline}
          </p>
        ) : (
          <button className="btn btn-primary btn-block" onClick={find} disabled={state === 'busy'} data-testid="nearby-find">
            📍 {state === 'busy' ? tr.nearby.finding : tr.nearby.find}
          </button>
        )}
        {state === 'fail' && <p className="error small">{tr.nearby.fail}</p>}
        {state === 'geo' && <p className="error small">{tr.nearby.geoFail}</p>}
        {items && !items.length && <p className="muted">{tr.nearby.none}</p>}
        {items && items.length > 0 && <p className="note small">{tr.nearby.notGuide}</p>}
        {items?.map((w) => (
          <article key={`${w.lang}${w.pageid}`} className="card wiki-card" data-testid="wiki-item">
            {w.thumb && <img src={w.thumb} alt="" className="place-thumb" loading="lazy" referrerPolicy="no-referrer" />}
            <div className="card-kicker">{tr.discover.away(formatDistance(w.distance))}</div>
            <h3>{w.title}</h3>
            {w.extract && <p>{w.extract}</p>}
            <p className="small muted" data-testid="wiki-source">
              {tr.nearby.source(w.lang, w.title)}
            </p>
            <div className="row">
              <button className="btn btn-small btn-ghost" onClick={() => speak(`${w.title}. ${w.extract}`, 'tr-TR')} data-testid="wiki-listen">
                🔊 {tr.tips.listen}
              </button>
              <SaveButton tripId={tripKey} us={us} place={wikiToSaved(w)} />
              <button className="btn btn-small btn-primary" onClick={() => setAdding(wikiToSaved(w))} data-testid="wiki-add">
                ＋ {tr.saved.addToRoute}
              </button>
              <a className="btn btn-small btn-ghost" href={w.url} target="_blank" rel="noopener noreferrer">
                {tr.nearby.read}
              </a>
            </div>
          </article>
        ))}
      </main>
      {adding && <AddToRoute trip={rec.trip} tripId={tripKey} place={adding} onClose={() => setAdding(null)} onDone={showToast} />}
      <Toast text={toast} />
    </div>
  );
}
