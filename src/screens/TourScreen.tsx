import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../i18n/tr';
import { stopsInOrder } from '../plan/normalize';
import type { Stop } from '../plan/types';
import { dayMapData } from '../map/fromDay';
import { TripMap } from '../map/TripMap';
import { compassIndex, hasCoord, type LatLng } from '../lib/geo';
import { formatDistance } from '../lib/format';
import { href, paths } from '../lib/router';
import { useSettings } from '../lib/settings';
import { speak, stopSpeaking, unlockSpeech } from '../lib/speech';
import { tourSpeech, tourStartSpeech } from '../tour/guideScript';
import { TipCards } from '../components/TipCards';
import { releaseWakeLock, requestWakeLock } from '../lib/wakelock';
import { addLog } from '../lib/log';
import { setLastKnownPosition } from '../lib/links';
import { cachedCandidates } from '../lib/youtube';
import { stopKey } from '../lib/userState';
import { ReturnHotelButton } from '../components/trip';
import { clearProgress, evaluateTour, loadProgress, saveProgress, type TourProgress } from '../tour/engine';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

// Otomatik anlatım bu sürede başlamazsa "Dinle" düğmesi çıkar (iOS ses kilidi).
const AUTOPLAY_WAIT_MS = 2500;

export function TourScreen({ tripKey, dayIndex }: { tripKey: string; dayIndex: number }) {
  const { rec, us } = useTrip(tripKey);
  const settings = useSettings();
  const day = rec?.trip.days[dayIndex];
  const stops = useMemo(() => (day ? stopsInOrder(day) : []), [day]);

  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [progress, setProgress] = useState<TourProgress>(() => loadProgress(tripKey, dayIndex));
  const [listenStop, setListenStop] = useState<Stop | null>(null);
  const [speakingStop, setSpeakingStop] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wakeFail, setWakeFail] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastTriggered, setLastTriggered] = useState<Stop | null>(null);
  const [spokenLength, setSpokenLength] = useState<'short' | 'long'>(settings.narrationLength);
  const [cachedVideo, setCachedVideo] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Tur modunda video kendiliğinden başlamaz; önbellekte adayı olan durak için öneri kartı çıkar.
    let alive = true;
    Promise.all(stops.map(async (s) => ((await cachedCandidates(tripKey, stopKey(s)))?.candidates.length ? stopKey(s) : null))).then((r) => alive && setCachedVideo(new Set(r.filter((x): x is string => !!x))));
    return () => {
      alive = false;
    };
  }, [stops, tripKey]);
  const hasVideo = (s: Stop) => !!(s.videos?.length || us?.videos[stopKey(s)] || cachedVideo.has(stopKey(s)));

  const progressRef = useRef(progress);
  progressRef.current = progress;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const stopsRef = useRef(stops);
  stopsRef.current = stops;
  const watchId = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastPos = useRef<LatLng | null>(null);
  const autoTimer = useRef<number | null>(null);

  const dayRef = useRef(day);
  dayRef.current = day;
  const pronRef = useRef(rec?.trip.pronunciations);
  pronRef.current = rec?.trip.pronunciations;

  // Varışta varsayılan uzunluk okunur (Ayarlar); diğeri "… dinle" düğmesiyle tek dokunuşla.
  const narrate = useCallback((s: Stop, auto: boolean, length?: 'short' | 'long') => {
    if (autoTimer.current) window.clearTimeout(autoTimer.current);
    if (auto && !settingsRef.current.autoNarrate) {
      setListenStop(s);
      return;
    }
    let started = false;
    setSpeakingStop(s.order);
    const len = length ?? settingsRef.current.narrationLength;
    setSpokenLength(len);
    const done = new Set([...progressRef.current.triggered, ...progressRef.current.passed, s.order]);
    const text = dayRef.current ? tourSpeech(dayRef.current, s, len, done).text : s.narration;
    speak(text, 'tr-TR', { pronunciations: pronRef.current }, {
      onStart: () => {
        started = true;
        setListenStop(null);
      },
      onEnd: () => setSpeakingStop(null),
      onError: (err) => {
        addLog('info', `Anlatım başlamadı: ${err}`);
        setSpeakingStop(null);
        setListenStop(s);
      },
    });
    if (auto) {
      autoTimer.current = window.setTimeout(() => {
        if (!started) {
          stopSpeaking();
          setSpeakingStop(null);
          setListenStop(s);
        }
      }, AUTOPLAY_WAIT_MS);
    }
  }, []);

  const onPosition = useCallback(
    (p: LatLng, acc: number | null, resumed = false) => {
      lastPos.current = p;
      setLastKnownPosition(p);
      setPos(p);
      setAccuracy(acc);
      const ev = evaluateTour(stopsRef.current, progressRef.current, p, settingsRef.current.radiusM);
      if (ev.enter || ev.newlyPassed.length) {
        progressRef.current = ev.progress;
        setProgress(ev.progress);
        saveProgress(tripKey, dayIndex, ev.progress);
      }
      const msgs: string[] = [];
      if (resumed) msgs.push(tr.tour.resumed);
      if (ev.newlyPassed.length) msgs.push(tr.tour.passed(ev.newlyPassed.map((o) => tr.stop.numbered(o)).join(', ')));
      if (msgs.length) setBanner(msgs.join(' '));
      if (ev.enter) {
        setLastTriggered(ev.enter);
        narrate(ev.enter, true);
      }
    },
    [tripKey, dayIndex, narrate],
  );

  const startWatch = useCallback(() => {
    if (settingsRef.current.simulate) return;
    if (!('geolocation' in navigator)) {
      setError(tr.tour.geoUnsupported);
      return;
    }
    const onErr = (e: GeolocationPositionError) => {
      setError(e.code === e.PERMISSION_DENIED ? tr.tour.geoDenied : tr.tour.geoUnavailable);
      addLog('info', `Konum hatası ${e.code}: ${e.message}`);
    };
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (g) => {
        setError(null);
        onPosition({ lat: g.coords.latitude, lng: g.coords.longitude }, g.coords.accuracy);
      },
      onErr,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, [onPosition]);

  const stopWatch = () => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  };

  const start = async () => {
    // Bu fonksiyon kullanıcı dokunuşunun içinde çalışır: ses kilidi burada açılır.
    unlockSpeech(day ? tourStartSpeech(day, dayIndex + 1) : tr.tour.started);
    runningRef.current = true;
    setRunning(true);
    setBanner(tr.tour.started);
    startWatch();
    setWakeFail(!(await requestWakeLock()));
  };

  const end = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    stopWatch();
    stopSpeaking();
    releaseWakeLock();
    setListenStop(null);
    setBanner(null);
  }, []);

  // Sayfa gizlenince tur duraklar; geri dönülünce kilit yeniden istenir, konum hemen değerlendirilir.
  useEffect(() => {
    const onVis = () => {
      if (!runningRef.current) return;
      if (document.visibilityState === 'hidden') {
        stopWatch();
        setPaused(true);
        return;
      }
      setPaused(false);
      requestWakeLock().then((ok) => setWakeFail(!ok));
      if (settingsRef.current.simulate) {
        if (lastPos.current) onPosition(lastPos.current, null, true);
        else setBanner(tr.tour.resumed);
        return;
      }
      startWatch();
      navigator.geolocation?.getCurrentPosition(
        (g) => onPosition({ lat: g.coords.latitude, lng: g.coords.longitude }, g.coords.accuracy, true),
        () => setBanner(tr.tour.resumed),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [onPosition, startWatch]);

  useEffect(() => () => end(), [end]);

  const mapData = useMemo(() => {
    if (!day) return { points: [], legs: [] };
    const d = dayMapData(day, tripKey, dayIndex, { venues: false, lodging: rec?.trip.lodging });
    const done = new Set([...progress.triggered, ...progress.passed]);
    const next = stops.find((s) => hasCoord(s) && !done.has(s.order));
    // Tur haritasında işaretler bağlantı değildir: simülasyonda dokunuş konum olarak haritaya geçer.
    return { legs: d.legs, points: d.points.map((p) => ({ ...p, href: undefined, done: p.kind === 'stop' && done.has(Number(p.label)), active: next && p.kind === 'stop' ? p.label === String(next.order) : false })) };
  }, [day, tripKey, dayIndex, progress, stops, rec?.trip.lodging]);

  if (rec === undefined) return <Loading />;
  if (!rec || !day) return <Missing />;

  const ev = evaluateTour(stops, progress, pos, settings.radiusM);
  const next = ev.next;
  const missingCoords = stops.some((s) => !hasCoord(s));

  return (
    <div className="page tour">
      <Header title={tr.tour.title} back={paths.day(tripKey, dayIndex)} kicker={<>{tr.day.label(dayIndex + 1)} · {day.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        {settings.simulate && <p className="note sim" data-testid="sim-note">{tr.tour.simOn}</p>}

        {listenStop && (
          <button className="btn btn-listen" data-testid="listen" onClick={() => narrate(listenStop, false)}>
            🔊 {tr.tour.listen}
            <span className="small">{tr.tour.inside(listenStop.order, listenStop.name)}</span>
            <span className="small">{tr.tour.listenHint}</span>
          </button>
        )}

        {lastTriggered && !listenStop && (
          <button className="btn btn-block" data-testid="other-length" onClick={() => narrate(lastTriggered, false, spokenLength === 'short' ? 'long' : 'short')}>
            🔊 {spokenLength === 'short' ? tr.player.long : tr.player.short}: {lastTriggered.name}
          </button>
        )}

        {lastTriggered && (
          <TipCards tips={(lastTriggered.tips ?? []).filter((x) => x.when === 'on-site')} owner={stopKey(lastTriggered)} tripId={tripKey} us={us} title={tr.tips.onSite} testid="tips-onsite" />
        )}

        {lastTriggered && hasVideo(lastTriggered) && (
          <a className="card video-hint" href={href(paths.stop(tripKey, dayIndex, lastTriggered.order))} data-testid="tour-video-hint">
            🎬 {tr.video.tourHint}
          </a>
        )}

        {banner && (
          <p className="banner" data-testid="banner" role="status">
            {banner}
          </p>
        )}
        {paused && <p className="banner">{tr.tour.paused}</p>}
        {error && <p className="error">{error}</p>}
        {wakeFail && running && <p className="note small">{tr.tour.wakeLockFail}</p>}

        {!running ? (
          <>
            <p className="lead">{tr.tour.intro}</p>
            <p className="note">{tr.tour.limit}</p>
            <button className="btn btn-primary btn-big btn-block" data-testid="start-tour" onClick={start}>
              ▶ {tr.tour.start}
            </button>
            <p className="note small">{tr.tour.battery}</p>
          </>
        ) : (
          <section className="next-card card" data-testid="next-card">
            {next ? (
              <>
                <div className="card-kicker">{tr.tour.nextStop}</div>
                <h2>
                  <span className="num big">{next.order}</span> <span data-testid="next-name">{next.name}</span>
                </h2>
                {ev.distanceToNext !== null && ev.bearingToNext !== null ? (
                  <p className="distance" data-testid="distance">
                    <span className="arrow" style={{ transform: `rotate(${Math.round(ev.bearingToNext)}deg)` }}>
                      ↑
                    </span>{' '}
                    {tr.tour.distance(formatDistance(ev.distanceToNext), tr.compass[compassIndex(ev.bearingToNext)])}
                  </p>
                ) : (
                  <p className="muted">{tr.tour.waitingFix}</p>
                )}
                {accuracy !== null && <p className="muted small">{tr.tour.accuracy(formatDistance(accuracy))}</p>}
              </>
            ) : (
              <p data-testid="all-done">{tr.tour.allDone}</p>
            )}
          </section>
        )}

        <TripMap points={mapData.points} legs={mapData.legs} user={pos} onTap={running && settings.simulate ? (p) => onPosition(p, null) : undefined} height={340} showLegend={false} />

        <ol className="tour-stops">
          {stops.map((s) => {
            const done = progress.triggered.includes(s.order);
            const passed = progress.passed.includes(s.order);
            return (
              <li key={s.order} className={done ? 'done' : passed ? 'passed' : ''} data-testid="tour-stop" data-state={done ? 'triggered' : passed ? 'passed' : 'open'}>
                <span className="num">{s.order}</span>
                <a href={href(paths.stop(tripKey, dayIndex, s.order))}>{s.name}</a>
                {done && <span className="muted small"> · {tr.tour.triggered}</span>}
                <button className="btn btn-small btn-ghost" onClick={() => narrate(s, false)} aria-label={`${tr.tour.listen}: ${s.name}`}>
                  {speakingStop === s.order ? '…' : '🔊'}
                </button>
              </li>
            );
          })}
        </ol>
        {missingCoords && <p className="note small">{tr.tour.noCoordStops}</p>}

        <ReturnHotelButton l={rec.trip.lodging} />
        {running && (
          <div className="stack">
            <button className="btn btn-block" data-testid="end-tour" onClick={end}>
              ■ {tr.tour.end}
            </button>
          </div>
        )}
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            clearProgress(tripKey, dayIndex);
            const empty = { triggered: [], passed: [] };
            progressRef.current = empty;
            setProgress(empty);
            setListenStop(null);
          }}
        >
          ↺ {tr.tour.reset}
        </button>
      </main>
    </div>
  );
}
