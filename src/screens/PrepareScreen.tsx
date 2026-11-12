import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import { paths } from '../lib/router';
import { prepareTrip, tripPoints, type PrepReport } from '../lib/prepare';
import { addLog } from '../lib/log';
import { formatDate, formatNumber } from '../lib/format';
import { getManifest, regionFor, savedRegions, type Region, type SavedRegion } from '../map/regions';
import { getOfflineStatus, offlineCheck, type OfflineStatus } from '../lib/offlineCheck';
import { isPersisted, requestPersist } from '../lib/store';
import { appMode } from '../lib/appMode';
import { Confirm, Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

const LABEL: Record<string, string> = {
  videos: tr.prepare.stepVideos,
  thumbs: tr.prepare.stepThumbs,
  photos: tr.prepare.stepPhotos,
  weather: tr.prepare.stepWeather,
  map: tr.prepare.stepMap,
};
const ICON: Record<string, string> = { wait: '○', run: '…', ok: '✓', partial: '◐', skip: '–', fail: '✕', warn: '◐', info: 'ℹ' };
export const mb = (b: number) => `${formatNumber(Math.round((b / 1e6) * 10) / 10)} MB`;
const ymd = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

export function PrepareScreen({ tripKey }: { tripKey: string }) {
  const { rec, us } = useTrip(tripKey);
  const [rep, setRep] = useState<PrepReport | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [region, setRegion] = useState<Region | null | undefined>(undefined);
  const [saved, setSaved] = useState<SavedRegion | null>(null);
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [ask, setAsk] = useState(false);
  const [persist, setPersist] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const mode = appMode();

  useEffect(() => {
    if (!rec) return;
    let alive = true;
    (async () => {
      const m = await getManifest();
      const r = m ? regionFor(tripPoints(rec.trip), m.bolgeler) : null;
      const sv = r ? ((await savedRegions()).find((x) => x.id === r.id) ?? null) : null;
      const st = await getOfflineStatus(tripKey);
      if (!alive) return;
      setRegion(r);
      setSaved(sv);
      setStatus(st);
      setPersist(await isPersisted());
    })();
    return () => {
      alive = false;
    };
  }, [rec, tripKey, done]);

  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const needDownload = !!region && (!saved || saved.surum !== region.surum);

  const run = async () => {
    setAsk(false);
    setRunning(true);
    setDone(false);
    try {
      const r = await prepareTrip(tripKey, rec.trip, rec.isSample, us, setRep, { region });
      if (r.check) setStatus(r.check);
      setPersist(await requestPersist());
      setDone(true);
    } catch (e) {
      addLog('error', `Hazırlık: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };
  const recheck = async () => {
    setChecking(true);
    try {
      setStatus(await offlineCheck(tripKey, rec.trip, us));
    } finally {
      setChecking(false);
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
  const online = navigator.onLine;

  return (
    <div className="page">
      <Header title={tr.prepare.title} back={paths.summary(tripKey)} kicker={<>{rec.trip.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="lead">{tr.prepare.intro3}</p>
        <section className={mode === 'safari' ? 'note' : 'muted small'} data-testid="prep-where" data-mode={mode}>
          <p>{mode === 'safari' ? tr.prepare.whereSafari : mode === 'home' ? tr.prepare.whereHome : tr.prepare.whereOther}</p>
          {mode === 'safari' && (
            <ol className="how">
              {tr.prepare.howHome.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ol>
          )}
        </section>
        {region === undefined ? null : region ? (
          <p data-testid="prep-region">
            {tr.prepare.regionFound(region.ad, mb(region.bayt))}{' '}
            {saved && saved.surum === region.surum && tr.prepare.regionSaved(region.ad, formatDate(saved.savedAt.slice(0, 10)))}
            {saved && saved.surum !== region.surum && tr.prepare.regionUpdate(formatDate(ymd(region.surum)))}
          </p>
        ) : (
          <p className="note small" data-testid="prep-region-none">
            {tr.prepare.regionNone}
          </p>
        )}
        {!online && <p className="error">{tr.prepare.offline}</p>}
        <button className="btn btn-primary btn-big btn-block" onClick={() => (needDownload ? setAsk(true) : run())} disabled={running || !online} data-testid="prepare-start">
          {running ? tr.prepare.running : needDownload ? tr.prepare.regionDownload : tr.prepare.start}
        </button>
        {rep && (
          <ul className="plain prep-steps" data-testid="prep-steps">
            {rep.steps.map((s) => (
              <li key={s.id} className={`prep-step prep-${s.state}`} data-testid={`prep-${s.id}`} data-state={s.state}>
                <span className="prep-icon" aria-hidden="true">
                  {ICON[s.state]}
                </span>
                <span>{s.id === 'map' && s.unit === 'bytes' ? tr.prepare.stepRegion : LABEL[s.id]}</span>
                {s.total > 0 && <span className="muted small">{s.unit === 'bytes' ? tr.prepare.regionProgress(mb(s.done), mb(s.total)) : tr.prepare.progress(s.done, s.total)}</span>}
              </li>
            ))}
          </ul>
        )}
        {done && (
          <p className="ok" role="status" data-testid="prepare-done">
            ✓ {tr.prepare.done}
          </p>
        )}
        {status && (
          <section className="card" data-testid="offline-check" data-ready={status.ready}>
            <h2 className="card-title">{tr.prepare.checkTitle}</h2>
            <p className="small muted">
              {tr.prepare.checkIntro} {formatDate(status.at.slice(0, 10))}
            </p>
            <ul className="plain prep-steps">
              {status.lines.map((l) => (
                <li key={l.id} className={`prep-step prep-${l.state}`} data-testid={`check-${l.id}`} data-state={l.state}>
                  <span className="prep-icon" aria-hidden="true">
                    {ICON[l.state]}
                  </span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
            {!status.ready && (
              <div className="row">
                <button className="btn btn-small" onClick={() => (online ? (needDownload ? setAsk(true) : run()) : recheck())} disabled={running || checking} data-testid="check-retry">
                  {tr.prepare.retry}
                </button>
              </div>
            )}
          </section>
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
        {persist !== null && <p className="small muted" data-testid="prep-persist">{persist ? tr.prepare.persisted : tr.prepare.notPersisted}</p>}
      </main>
      {ask && region && <Confirm title={tr.prepare.title} body={tr.prepare.regionAsk(mb(region.bayt))} okText={tr.prepare.regionDownload} onCancel={() => setAsk(false)} onOk={run} />}
    </div>
  );
}
