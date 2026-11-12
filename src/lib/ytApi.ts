// YouTube IFrame Player API (developers.google.com/youtube/iframe_api_reference): YouTube'un kendi
// oynatıcısına bağlanıp "oynamaya başladı" bilgisini ve anlık zamanı okumak için. Oynatıcı yine
// YouTube'un kendisidir (değişmez kural 12); API yüklenemezse iframe yalnız oynar, "başlangıcı
// ayarla" gizlenir.

export interface YtPlayerLike {
  getCurrentTime(): number;
  destroy(): void;
}
interface YtNs {
  Player: new (el: HTMLIFrameElement | string, opts: { events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void } }) => YtPlayerLike;
}
type W = Window & { YT?: YtNs; onYouTubeIframeAPIReady?: () => void };

let loading: Promise<YtNs | null> | null = null;

export function loadYtApi(timeoutMs = 8000): Promise<YtNs | null> {
  const w = window as W;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (!navigator.onLine) return Promise.resolve(null);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const done = (v: YtNs | null) => {
      if (!v) loading = null; // sonra yeniden denenebilir
      resolve(v);
    };
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      done(w.YT?.Player ? w.YT : null);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => done(null);
    document.head.appendChild(s);
    setTimeout(() => done(w.YT?.Player ? w.YT : null), timeoutMs);
  });
  return loading;
}

export const YT_PLAYING = 1;
