// Durak video kartı. Sıra: kullanıcının sabitlediği/eklediği → planla gelen → (anahtar varsa)
// uygulamanın bulduğu adaylar → yoksa "YouTube'da ara" düğmesi. Önce küçük resim; dokununca
// gizlilik dostu oynatıcı sayfa içinde açılır ve sesli anlatım susar. Kendiliğinden başlamaz.
import { useEffect, useState } from 'react';
import { tr } from '../i18n/tr';
import type { Stop, Video } from '../plan/types';
import { stopSpeaking } from '../lib/speech';
import { addLog } from '../lib/log';
import { formatDate, formatMinutes, formatNumber } from '../lib/format';
import { cachedCandidates, embedUrl, getCandidates, getYoutubeKey, parseYoutubeId, searchUrl, thumbUrl, videoQueryFor } from '../lib/youtube';
import { stopKey, updateUserState, type UserState } from '../lib/userState';
import { StoredImg } from './v2';

export function useStopVideos(tripId: string, stop: Stop, city: string, us: UserState | undefined, opts: { search: boolean }) {
  const k = stopKey(stop);
  const userVideo = us?.videos[k];
  const plan = stop.videos ?? [];
  const [auto, setAuto] = useState<Video[] | null>(null);
  const [state, setState] = useState<'idle' | 'searching' | 'fail'>('idle');
  const key = getYoutubeKey();
  useEffect(() => {
    let alive = true;
    if (userVideo || plan.length) return;
    (async () => {
      const cached = await cachedCandidates(tripId, k);
      if (!alive) return;
      if (cached) setAuto(cached.candidates);
      if (!opts.search || !key || !navigator.onLine) return;
      setState('searching');
      try {
        const r = await getCandidates(tripId, k, videoQueryFor(stop, city), stop.name, key);
        if (alive) {
          setAuto(r?.candidates ?? []);
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
  }, [tripId, k, !!userVideo, plan.length, key, opts.search]);
  const list: Video[] = userVideo ? [userVideo] : plan.length ? plan : (auto ?? []);
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

export function VideoPlayer({ v, autoplayOnTap = true }: { v: Video; autoplayOnTap?: boolean }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [v.youtubeId]);
  if (playing)
    return (
      <div className="video-frame">
        <iframe
          src={embedUrl(v.youtubeId)}
          title={v.title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-testid="video-frame"
        />
      </div>
    );
  return (
    <button
      className="video-thumb"
      aria-label={tr.video.play(v.title)}
      data-testid="video-thumb"
      onClick={() => {
        stopSpeaking(); // video başlayınca sesli anlatım susar
        if (autoplayOnTap) setPlaying(true);
      }}
    >
      <StoredImg src={thumbUrl(v.youtubeId)} alt="" />
      <span className="play-icon" aria-hidden="true">
        ▶
      </span>
    </button>
  );
}

export function VideoCard({ tripId, stop, city, us }: { tripId: string; stop: Stop; city: string; us: UserState | undefined }) {
  const { list, state, hasKey, userVideo } = useStopVideos(tripId, stop, city, us, { search: true });
  const [i, setI] = useState(0);
  const [paste, setPaste] = useState('');
  const [bad, setBad] = useState(false);
  const k = stopKey(stop);
  const v = list[i % Math.max(1, list.length)];

  const pin = (video: Video | null) =>
    updateUserState(tripId, (u) => {
      const videos = { ...u.videos };
      if (video) videos[k] = { ...video, pinned: true };
      else delete videos[k];
      return { ...u, videos };
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
    <section className="card video-card" data-testid="video-card">
      <h2 className="card-title">{tr.video.title}</h2>
      {v ? (
        <>
          <VideoPlayer v={v} />
          <p className="video-title">{v.title}</p>
          <p className="small muted" data-testid="video-meta">
            {videoMeta(v)}
            {v.source === 'plan' && ` · ${tr.video.fromPlan}`}
          </p>
          {v.durationSeconds ? <p className="small muted">{tr.video.data(Math.max(1, Math.round(v.durationSeconds / 60)))}</p> : null}
          <div className="row">
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
          </div>
        </>
      ) : (
        <>
          {state === 'searching' && <p className="muted small">{tr.video.searching}</p>}
          {state === 'fail' && <p className="note small">{tr.video.fail}</p>}
          {state === 'idle' && hasKey && list.length === 0 && <p className="muted small">{tr.video.none}</p>}
          <a className="btn btn-small" href={searchUrl(videoQueryFor(stop, city))} target="_blank" rel="noopener noreferrer" data-testid="video-search">
            {tr.video.search}
          </a>
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
