import { useState } from 'react';
import { tr } from '../i18n/tr';
import { paths } from '../lib/router';
import { prepareTrip, type PrepReport } from '../lib/prepare';
import { addLog } from '../lib/log';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

const LABEL: Record<string, string> = {
  videos: tr.prepare.stepVideos,
  thumbs: tr.prepare.stepThumbs,
  photos: tr.prepare.stepPhotos,
  weather: tr.prepare.stepWeather,
  map: tr.prepare.stepMap,
};
const ICON: Record<string, string> = { wait: '○', run: '…', ok: '✓', partial: '◐', skip: '–', fail: '✕' };

export function PrepareScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const [rep, setRep] = useState<PrepReport | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const run = async () => {
    setRunning(true);
    setDone(false);
    try {
      await prepareTrip(tripKey, rec.trip, rec.isSample, us, setRep);
      setDone(true);
    } catch (e) {
      addLog('error', `Hazırlık: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };
  const missing = (rep?.missing ?? []).map((m) => {
    if (m === 'nokey') return tr.prepare.noKey;
    if (m === 'noforecast') return tr.prepare.noForecast;
    if (m === 'map') return tr.prepare.mapFail;
    if (m.startsWith('video:')) return tr.prepare.noVideo(m.slice(6));
    if (m.startsWith('photos:')) return tr.prepare.photoFail(Number(m.slice(7)));
    return m;
  });
  return (
    <div className="page">
      <Header title={tr.prepare.title} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="lead">{tr.prepare.intro}</p>
        {!navigator.onLine && <p className="error">{tr.prepare.offline}</p>}
        <button className="btn btn-primary btn-big btn-block" onClick={run} disabled={running || !navigator.onLine} data-testid="prepare-start">
          {running ? tr.prepare.running : tr.prepare.start}
        </button>
        {rep && (
          <ul className="plain prep-steps" data-testid="prep-steps">
            {rep.steps.map((s) => (
              <li key={s.id} className={`prep-step prep-${s.state}`} data-testid={`prep-${s.id}`} data-state={s.state}>
                <span className="prep-icon" aria-hidden="true">
                  {ICON[s.state]}
                </span>
                <span>{LABEL[s.id]}</span>
                {s.total > 0 && <span className="muted small">{tr.prepare.progress(s.done, s.total)}</span>}
              </li>
            ))}
          </ul>
        )}
        {done && (
          <p className="ok" role="status" data-testid="prepare-done">
            ✓ {tr.prepare.done}
          </p>
        )}
        {done && (
          <section>
            <h2 className="section-title">{tr.prepare.missing}</h2>
            {missing.length ? (
              <ul className="bullets" data-testid="prep-missing">
                {missing.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            ) : (
              <p className="ok">{tr.prepare.nothing}</p>
            )}
          </section>
        )}
        <p className="note small">{tr.prepare.mapNote}</p>
      </main>
    </div>
  );
}
