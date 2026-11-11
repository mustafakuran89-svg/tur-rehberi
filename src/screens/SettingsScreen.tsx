import { useEffect, useState, useSyncExternalStore } from 'react';
import { tr } from '../i18n/tr';
import { RADIUS_OPTIONS, RATE_OPTIONS, resetSettings, setSettings, useSettings } from '../lib/settings';
import { clearLog, readLog, subscribeLog } from '../lib/log';
import { deleteAll, downloadJson, ensureSample, getTrip, isPersisted, makeBackup, putTrip, requestPersist, sampleTrip, SAMPLE_KEY } from '../lib/store';
import { findVoice, onVoicesChanged, speak, speechSupported, voicesKnown } from '../lib/speech';
import { moveTripNear } from '../sample/move';
import { formatDate, formatNumber } from '../lib/format';
import { href, paths } from '../lib/router';
import { getYoutubeKey, setYoutubeKey } from '../lib/youtube';
import { forgetUserState } from '../lib/userState';

function YoutubeKeySection({ onToast }: { onToast: (t: string) => void }) {
  const [has, setHas] = useState(() => !!getYoutubeKey());
  const [val, setVal] = useState('');
  return (
    <section className="settings-group" data-testid="yt-key">
      <h2 className="section-title">{tr.ytKey.title}</h2>
      <p className="small">{tr.ytKey.intro}</p>
      <p className="small" data-testid="yt-key-status">
        {has ? `✓ ${tr.ytKey.has}` : tr.ytKey.none}
      </p>
      <div className="row">
        <input
          className="text-input"
          type="password"
          autoComplete="off"
          spellCheck={false}
          aria-label={tr.ytKey.label}
          placeholder={tr.ytKey.placeholder}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          data-testid="yt-key-input"
        />
        <button
          className="btn btn-small btn-primary"
          disabled={!val.trim()}
          data-testid="yt-key-save"
          onClick={() => {
            setYoutubeKey(val);
            setVal('');
            setHas(true);
            onToast(tr.ytKey.saved);
          }}
        >
          {tr.ytKey.save}
        </button>
      </div>
      {has && (
        <button
          className="btn btn-small btn-danger"
          data-testid="yt-key-clear"
          onClick={() => {
            setYoutubeKey('');
            setHas(false);
            onToast(tr.ytKey.cleared);
          }}
        >
          {tr.ytKey.clear}
        </button>
      )}
      <details>
        <summary>{tr.ytKey.howTitle}</summary>
        <ol className="how">
          {tr.ytKey.how.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
        <p className="small muted">{tr.ytKey.quota}</p>
      </details>
    </section>
  );
}
import { Confirm, Header, Toast, useToast } from '../components/ui';

declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;

let logVersion = 0;
subscribeLog(() => {
  logVersion++;
});

export function SettingsScreen() {
  const s = useSettings();
  const [toast, showToast] = useToast();
  const [persist, setPersist] = useState<boolean | null | 'loading'>('loading');
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  useSyncExternalStore(subscribeLog, () => logVersion);
  const log = readLog();

  useEffect(() => {
    requestPersist().then(() => isPersisted().then(setPersist));
  }, []);
  useEffect(() => onVoicesChanged(() => setVoiceName(voicesKnown() ? findVoice('tr-TR')?.name ?? '' : null)), []);

  const moveSample = () => {
    if (!('geolocation' in navigator)) {
      showToast(tr.tour.geoUnsupported);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (g) => {
        await ensureSample();
        const rec = await getTrip(SAMPLE_KEY);
        if (rec) await putTrip({ ...rec, trip: moveTripNear(sampleTrip(), { lat: g.coords.latitude, lng: g.coords.longitude }) });
        setBusy(false);
        showToast(tr.settings.moved);
      },
      (e) => {
        setBusy(false);
        showToast(e.code === e.PERMISSION_DENIED ? tr.tour.geoDenied : tr.tour.geoUnavailable);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  return (
    <div className="page">
      <Header title={tr.settings.title} back={paths.trips()} />
      <main className="content">
        <section className="settings-group">
          <h2 className="section-title">{tr.settings.speech}</h2>
          <label className="field">
            <span>{tr.settings.rate}</span>
            <select value={s.rate} onChange={(e) => setSettings({ rate: Number(e.target.value) })}>
              {RATE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {formatNumber(r)}×
                </option>
              ))}
            </select>
          </label>
          <label className="field check">
            <input type="checkbox" checked={s.autoNarrate} onChange={(e) => setSettings({ autoNarrate: e.target.checked })} />
            <span>{tr.settings.autoNarrate}</span>
          </label>
          <label className="field">
            <span>{tr.settings.radius}</span>
            <select value={s.radiusM} onChange={(e) => setSettings({ radiusM: Number(e.target.value) })} data-testid="radius">
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} m
                </option>
              ))}
            </select>
          </label>
          <p className="muted small" data-testid="voice-status">
            {!speechSupported() ? tr.player.unsupported : voiceName === null ? '' : voiceName ? tr.settings.voiceOk(voiceName) : tr.settings.voiceMissing}
          </p>
          {voiceName === '' && <p className="note small">{tr.player.noVoice}</p>}
          <button className="btn" onClick={() => speak(tr.settings.testSentence, 'tr-TR', s.rate)} disabled={!speechSupported()}>
            🔊 {tr.settings.testVoice}
          </button>
        </section>

        <section className="settings-group">
          <h2 className="section-title">{tr.theme.title}</h2>
          <div className="segmented" role="radiogroup" aria-label={tr.theme.label}>
            {(['system', 'light', 'dark'] as const).map((th) => (
              <button key={th} role="radio" aria-checked={s.theme === th} className={`seg${s.theme === th ? ' on' : ''}`} onClick={() => setSettings({ theme: th })} data-testid={`theme-${th}`}>
                {tr.theme[th]}
              </button>
            ))}
          </div>
        </section>

        <YoutubeKeySection onToast={showToast} />

        <section className="settings-group">
          <h2 className="section-title">{tr.settings.data}</h2>
          <button className="btn btn-block" onClick={async () => downloadJson(`tur-rehberi-yedek-${new Date().toISOString().slice(0, 10)}.json`, await makeBackup())}>
            {tr.settings.exportBackup}
          </button>
          <p className="muted small">{tr.settings.exportBackupHint}</p>
          <p className="small" data-testid="persist-status">
            {persist === 'loading' ? '' : persist === true ? tr.settings.persisted : persist === false ? tr.settings.notPersisted : tr.settings.persistUnknown}
          </p>
          <p className="note small">{tr.settings.install}</p>
          <button className="btn btn-danger btn-block" onClick={() => setConfirmAll(true)}>
            {tr.settings.deleteAll}
          </button>
        </section>

        <section className="settings-group dev">
          <h2 className="section-title">{tr.settings.dev}</h2>
          <label className="field check">
            <input type="checkbox" checked={s.simulate} onChange={(e) => setSettings({ simulate: e.target.checked })} data-testid="simulate" />
            <span>{tr.settings.simulate}</span>
          </label>
          <button className="btn btn-block" onClick={moveSample} disabled={busy}>
            📍 {tr.settings.moveSample}
          </button>
          <p className="muted small">{tr.settings.moveSampleHint}</p>
          <button
            className="btn btn-block btn-ghost"
            onClick={async () => {
              const rec = await getTrip(SAMPLE_KEY);
              if (rec) await putTrip({ ...rec, trip: sampleTrip() });
              else await ensureSample();
              showToast(tr.settings.resetDone);
            }}
          >
            {tr.settings.resetSample}
          </button>

          <h3>{tr.settings.log}</h3>
          {log.length === 0 ? (
            <p className="muted small" data-testid="log-empty">{tr.settings.logEmpty}</p>
          ) : (
            <ol className="log" data-testid="log">
              {log
                .slice()
                .reverse()
                .map((e, i) => (
                  <li key={i}>
                    <span className="muted">
                      {formatDate(e.t.slice(0, 10))} {e.t.slice(11, 19)} · {e.kind}
                    </span>
                    <pre>{e.msg}</pre>
                  </li>
                ))}
            </ol>
          )}
          {log.length > 0 && (
            <button className="btn btn-small" onClick={clearLog}>
              {tr.settings.logClear}
            </button>
          )}
        </section>

        <p className="muted small">{tr.settings.about}</p>
        <p className="muted small">{tr.settings.version(__APP_VERSION__, __BUILD_DATE__)}</p>
        <a className="btn btn-small" href={href(paths.whatsnew())} data-testid="whatsnew-link">
          {tr.settings.whatsnew}
        </a>
      </main>
      <Toast text={toast} />
      {confirmAll && (
        <Confirm
          title={tr.settings.deleteAll}
          body={tr.settings.deleteAllConfirm}
          okText={tr.yes}
          onCancel={() => setConfirmAll(false)}
          onOk={async () => {
            setConfirmAll(false);
            await deleteAll();
            forgetUserState();
            resetSettings();
            clearLog();
            try {
              Object.keys(localStorage)
                .filter((k) => k.startsWith('tur-rehberi:'))
                .forEach((k) => localStorage.removeItem(k));
            } catch {
              /* yok say */
            }
            await ensureSample();
            showToast(tr.settings.deleted);
          }}
        />
      )}
    </div>
  );
}
