// Durak video kartı (Geliştirme 3). Sıra src/lib/videoRank.ts içinde: plan/sabitlenen → öncelikli
// rehber kanalında durağın bölümü → kanal başlığı → genel arama → şehir videosu. Bölümü olan videoda
// oynatıcı o saniyeden başlar ve bölüm bitince durur (YouTube oynatıcısının start/end parametreleri).
// Çevrimdışıyken oynatıcı açılmaz: küçük resim, başlık, bölüm, "İnternet gerekli" ve "Sonra izle".
// Video cihaza indirilmez; YouTube'un kendi oynatıcısıyla oynar (değişmez kural 12).
import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Stop, Video } from '../plan/types';
import { stopSpeaking } from '../lib/speech';
import { addLog } from '../lib/log';
import { formatDate, formatMinutes, formatNumber } from '../lib/format';
import { cachedCandidates, embedUrl, getCandidates, getYoutubeKey, parseYoutubeId, searchUrl, thumbUrl, videoQueryFor, type PickedVideo } from '../lib/youtube';
import { stopKey, updateUserState, type UserState } from '../lib/userState';
import { getSettings, setSettings, useSettings, type PriorityChannel } from '../lib/settings';
import { cachedIndexes, channelKey, channelSearchUrl, getIndex, sameChannel, type ChannelIndex } from '../lib/channels';
import { formatStamp } from '../lib/chapters';
import { needsGeneralSearch, rankVideos, type RankedVideo } from '../lib/videoRank';
import { useOnline } from '../lib/online';
import { loadYtApi, YT_PLAYING, type YtPlayerLike } from '../lib/ytApi';
import { StoredImg } from './v2';

// Aynı oturumda bir kanal dizini en çok bir kez kurulur (kota).
const building = new Map<string, Promise<void>>();
function refreshIndex(c: PriorityChannel, key: string): Promise<void> {
  const k = channelKey(c);
  let p = building.get(k);
  if (!p) {
    p = getIndex(c, key)
      .then(() => undefined)
      .catch((e) => addLog('info', `Kanal dizini: ${(e as Error).message}`));
    building.set(k, p);
  }
  return p;
}

export function useStopVideos(tripId: string, stop: Stop, city: string, us: UserState | undefined, opts: { search: boolean }) {
  const settings = useSettings();
  const k = stopKey(stop);
  const userVideo = us?.videos[k] ?? null;
  const manualStart = us?.videoStarts?.[k] ?? null;
  const [indexes, setIndexes] = useState<(ChannelIndex | null)[]>([]);
  const [general, setGeneral] = useState<PickedVideo[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'indexing' | 'fail'>('idle');
  const key = getYoutubeKey();
  const chKey = settings.channels.map(channelKey).join('|');
  const planCount = stop.videos?.length ?? 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      const chans = settings.channels;
      let ix = await cachedIndexes(chans);
      const cached = await cachedCandidates(tripId, k);
      if (!alive) return;
      setIndexes(ix);
      setGeneral(cached?.candidates ?? []);
      if (!opts.search || !key || !navigator.onLine) return;
      // Öncelikli kanal dizinleri (30 günde bir yenilenir)
      setState('indexing');
      await Promise.all(chans.map((c) => refreshIndex(c, key)));
      ix = await cachedIndexes(chans);
      if (!alive) return;
      setIndexes(ix);
      setState('idle');
      // Basamak 1-3 boşsa genel arama (günde ~100 çağrılık kovadan; durak başına 30 günde bir)
      const pre = rankVideos({ stop, city, userVideo, channels: chans, indexes: ix, general: [] });
      if (!needsGeneralSearch(pre) || cached) return;
      setState('searching');
      try {
        const r = await getCandidates(tripId, k, videoQueryFor(stop, city), [stop.name, ...(stop.altNames ?? [])], key);
        if (alive) {
          setGeneral(r?.candidates ?? []);
          setState('idle');
        }
      } catch (e) {
        addLog('info', `Video araması: ${(e as Error).message}`);
        if (alive) setState('fail');
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, k, !!userVideo, planCount, key, opts.search, chKey]);

  const list = useMemo(
    () => rankVideos({ stop, city, userVideo, manualStart, channels: settings.channels, indexes, general }),
    [stop, city, userVideo, manualStart, settings.channels, indexes, general],
  );
  return { list, state, hasKey: !!key, userVideo };
}

export function videoMeta(v: Video): string {
  const parts: string[] = [];
  if (v.channel) parts.push(v.channel);
  if (v.durationSeconds) parts.push(formatMinutes(Math.max(1, Math.round(v.durationSeconds / 60))));
  if (v.likeCount != null) parts.push(tr.video.likes(formatNumber(v.likeCount)));
  else if (v.viewCount != null) parts.push(tr.video.views(formatNumber(v.viewCount)));
  if (v.checkedAt) parts.push(tr.video.checked(formatDate(v.checkedAt)));
  return parts.join(' · ');
}

/** "Bölüm: Belvedere Sarayı, 14:20-19:05" ya da elle ayarlanan başlangıç. */
export function chapterLine(v: Partial<RankedVideo>): string | null {
  if (v.manualStart && v.startSeconds != null) return tr.video.fromStart(formatStamp(v.startSeconds));
  if (v.startSeconds == null) return null;
  return tr.video.chapter(v.chapterTitle || tr.video.title, formatStamp(v.startSeconds), v.endSeconds != null ? formatStamp(v.endSeconds) : null);
}

type PlayableVideo = Partial<RankedVideo> & Pick<Video, 'youtubeId' | 'title'>;

interface PlayerProps {
  v: PlayableVideo;
  /** Başlangıcı ayarla: verilirse oynatıcıdan anlık zaman okunup buraya yazılır. */
  onSetStart?: (sec: number) => void;
}

export function VideoPlayer({ v, onSetStart }: PlayerProps) {
  const online = useOnline();
  const [playing, setPlaying] = useState(false);
  const [full, setFull] = useState(false);
  const [api, setApi] = useState(false);
  const [setting, setSetting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<YtPlayerLike | null>(null);
  useEffect(() => {
    setPlaying(false);
    setFull(false);
    setSetting(false);
  }, [v.youtubeId]);
  useEffect(() => {
    if (!online) setPlaying(false);
  }, [online]);

  const start = full ? null : (v.startSeconds ?? null);
  const end = full ? null : (v.endSeconds ?? null);
  const src = `${embedUrl(v.youtubeId, start, end)}&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;

  // Oynatıcıya bağlan: oynamaya başlayınca anlatım susar; "buradan başlat" anlık zamanı okur.
  useEffect(() => {
    if (!playing) return;
    let alive = true;
    setApi(false);
    loadYtApi().then((YT) => {
      if (!alive || !YT || !frame.current) return;
      try {
        player.current = new YT.Player(frame.current, {
          events: {
            onReady: () => alive && setApi(true),
            onStateChange: (e) => {
              if (e.data === YT_PLAYING) stopSpeaking();
            },
          },
        });
      } catch (e) {
        addLog('info', `YouTube oynatıcı API: ${(e as Error).message}`);
      }
    });
    return () => {
      alive = false;
      player.current = null;
    };
  }, [playing, src]);

  if (!online || !playing)
    return (
      <div className="video-wrap">
        <button
          className="video-thumb"
          aria-label={online ? tr.video.play(v.title) : `${v.title}: ${tr.video.needInternet}`}
          data-testid="video-thumb"
          disabled={!online}
          onClick={() => {
            stopSpeaking(); // video başlayınca sesli anlatım susar
            setPlaying(true);
          }}
        >
          <StoredImg src={thumbUrl(v.youtubeId)} alt="" />
          {online ? (
            <span className="play-icon" aria-hidden="true">
              ▶
            </span>
          ) : (
            <span className="video-offline" data-testid="need-internet">
              {tr.video.needInternet}
            </span>
          )}
        </button>
        {online && v.startSeconds != null && (
          <button
            className="btn btn-small btn-ghost"
            data-testid="watch-all"
            onClick={() => {
              stopSpeaking();
              setFull(true);
              setPlaying(true);
            }}
          >
            {tr.video.watchAll}
          </button>
        )}
      </div>
    );
  return (
    <div className="video-wrap">
      <div className="video-frame">
        <iframe
          ref={frame}
          key={src}
          src={src}
          title={v.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-testid="video-frame"
        />
      </div>
      <div className="row">
        {v.startSeconds != null && (
          <button className="btn btn-small btn-ghost" data-testid={full ? 'watch-chapter' : 'watch-all'} onClick={() => setFull((x) => !x)}>
            {full ? tr.video.watchChapter : tr.video.watchAll}
          </button>
        )}
        {onSetStart && api && !setting && (
          <button className="btn btn-small" data-testid="set-start" onClick={() => setSetting(true)}>
            {tr.video.setStart}
          </button>
        )}
      </div>
      {setting && (
        <div className="note small" data-testid="set-start-box">
          <p>{tr.video.setStartHint}</p>
          <button
            className="btn btn-primary btn-small"
            data-testid="start-here"
            onClick={() => {
              const t = player.current?.getCurrentTime?.();
              if (typeof t !== 'number' || !isFinite(t)) {
                setMsg(tr.video.startUnavailable);
                return;
              }
              onSetStart?.(Math.floor(t));
              setMsg(tr.video.startSaved(formatStamp(Math.floor(t))));
              setSetting(false);
            }}
          >
            {tr.video.startHere}
          </button>
        </div>
      )}
      {msg && (
        <p className="small" role="status" data-testid="start-msg">
          {msg}
        </p>
      )}
    </div>
  );
}

/** "Sonra izle" listesine ekler (cihaz ayarı; Videolar sayfasında durur, yedek dosyasına girer). */
export function addWatchLater(v: PlayableVideo, stopName: string | null): void {
  const cur = getSettings().watchLater;
  if (cur.some((x) => x.youtubeId === v.youtubeId)) return;
  setSettings({
    watchLater: [...cur, { youtubeId: v.youtubeId, title: v.title, channel: v.channel ?? null, start: v.startSeconds ?? null, end: v.endSeconds ?? null, stopName, addedAt: new Date().toISOString() }],
  });
}

export function VideoCard({ tripId, stop, city, us }: { tripId: string; stop: Stop; city: string; us: UserState | undefined }) {
  const settings = useSettings();
  const online = useOnline();
  const { list, state, hasKey, userVideo } = useStopVideos(tripId, stop, city, us, { search: true });
  const [i, setI] = useState(0);
  const [paste, setPaste] = useState('');
  const [bad, setBad] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const k = stopKey(stop);
  const v = list[i % Math.max(1, list.length)];
  const manual = us?.videoStarts?.[k];
  const later = !!v && settings.watchLater.some((x) => x.youtubeId === v.youtubeId);
  const priority = !!v && (v.priority || settings.channels.some((c) => sameChannel(c, { id: v.channelId })));
  const q = videoQueryFor(stop, city);

  const pin = (video: Video | null) =>
    updateUserState(tripId, (u) => {
      const videos = { ...u.videos };
      if (video) {
        const { tier, priority: pr, rehber, cityVideo, manualStart, ...plain } = video as RankedVideo;
        void [tier, pr, rehber, cityVideo, manualStart];
        videos[k] = { ...plain, pinned: true };
      } else delete videos[k];
      return { ...u, videos };
    });

  const setStart = (sec: number) => {
    if (!v) return;
    void updateUserState(tripId, (u) => ({ ...u, videoStarts: { ...(u.videoStarts ?? {}), [k]: { youtubeId: v.youtubeId, start: sec } } }));
  };
  const clearStart = () =>
    updateUserState(tripId, (u) => {
      const videoStarts = { ...(u.videoStarts ?? {}) };
      delete videoStarts[k];
      return { ...u, videoStarts };
    });

  const addPasted = () => {
    const id = parseYoutubeId(paste);
    if (!id) {
      setBad(true);
      return;
    }
    setBad(false);
    setPaste('');
    pin({ youtubeId: id, title: tr.video.manual, source: 'manual', pinned: true, checkedAt: new Date().toISOString().slice(0, 10) });
  };

  return (
    <section className="card video-card" data-testid="video-card" data-online={online}>
      <h2 className="card-title">{tr.video.title}</h2>
      {v ? (
        <>
          <div className="row badges">
            {v.rehber && (
              <span className="badge badge-guide" data-testid="guide-badge">
                {tr.video.guideBadge}
              </span>
            )}
            {v.cityVideo && (
              <span className="badge" data-testid="city-badge">
                {tr.video.cityVideo}
              </span>
            )}
          </div>
          <VideoPlayer v={v} onSetStart={setStart} />
          <p className="video-title">{v.title}</p>
          <p className="small muted" data-testid="video-meta">
            {videoMeta(v)}
            {v.source === 'plan' && ` · ${tr.video.fromPlan}`}
          </p>
          {chapterLine(v) && (
            <p className="small video-chapter" data-testid="video-chapter">
              {chapterLine(v)}
            </p>
          )}
          {v.cityVideo && !v.manualStart && <p className="small muted">{tr.video.cityVideoHint}</p>}
          {!online && (
            <p className="note small" data-testid="video-offline-note">
              {tr.video.offlineHint}
            </p>
          )}
          {online && v.durationSeconds ? <p className="small muted">{tr.video.data(Math.max(1, Math.round(((v.endSeconds ?? v.durationSeconds) - (v.startSeconds ?? 0)) / 60)))}</p> : null}
          <div className="row">
            <button className="btn btn-small" disabled={later} onClick={() => addWatchLater(v, stop.name)} data-testid="watch-later">
              {later ? `✓ ${tr.video.watchLaterAdded}` : tr.video.watchLater}
            </button>
            {list.length > 1 && !userVideo && (
              <button className="btn btn-small" onClick={() => setI((x) => x + 1)} data-testid="video-next">
                {tr.video.another}
              </button>
            )}
            {userVideo ? (
              <button className="btn btn-small btn-ghost" onClick={() => pin(null)} data-testid="video-unpin">
                {tr.video.unpin}
              </button>
            ) : (
              <button className="btn btn-small" onClick={() => pin(v)} data-testid="video-pin">
                📌 {tr.video.pin}
              </button>
            )}
            {manual && manual.youtubeId === v.youtubeId && (
              <button className="btn btn-small btn-ghost" onClick={clearStart} data-testid="start-clear">
                {tr.video.startClear}
              </button>
            )}
            {!priority && v.channelId && v.channel && (
              <button
                className="btn btn-small btn-ghost"
                data-testid="make-priority"
                onClick={() => {
                  setSettings({ channels: [...settings.channels, { id: v.channelId, title: v.channel! }] });
                  setNote(tr.video.priorityAdded(v.channel!));
                }}
              >
                {tr.video.makePriority}
              </button>
            )}
          </div>
          {note && (
            <p className="small" role="status">
              {note}
            </p>
          )}
        </>
      ) : (
        <>
          {state === 'indexing' && <p className="muted small">{tr.video.indexing}</p>}
          {state === 'searching' && <p className="muted small">{tr.video.searching}</p>}
          {state === 'fail' && <p className="note small">{tr.video.fail}</p>}
          {state === 'idle' && hasKey && list.length === 0 && <p className="muted small">{tr.video.none}</p>}
          <div className="row">
            {settings.channels[0] && (
              <a className="btn btn-small" href={channelSearchUrl(settings.channels[0], q)} target="_blank" rel="noopener noreferrer" data-testid="channel-search">
                {tr.video.searchInChannel(settings.channels[0].title)}
              </a>
            )}
            <a className="btn btn-small" href={searchUrl(q)} target="_blank" rel="noopener noreferrer" data-testid="video-search">
              {tr.video.search}
            </a>
          </div>
          {!hasKey && <p className="small muted">{tr.video.searchHint}</p>}
        </>
      )}
      <details className="video-paste">
        <summary>{tr.video.paste}</summary>
        <div className="row">
          <input className="text-input" value={paste} placeholder={tr.video.pastePh} aria-label={tr.video.paste} onChange={(e) => setPaste(e.target.value)} data-testid="video-paste" />
          <button className="btn btn-small" onClick={addPasted} disabled={!paste.trim()} data-testid="video-add">
            {tr.video.add}
          </button>
        </div>
        {bad && <p className="error small">{tr.video.badLink}</p>}
      </details>
    </section>
  );
}
