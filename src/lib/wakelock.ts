// Ekranı açık tutma (Screen Wake Lock API). Sayfa gizlenince tarayıcı kilidi bırakır;
// sayfa yeniden görünür olunca yeniden istenir.
type Sentinel = { release: () => Promise<void>; released: boolean };

let sentinel: Sentinel | null = null;

export function wakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

export async function requestWakeLock(): Promise<boolean> {
  if (!wakeLockSupported()) return false;
  try {
    if (sentinel && !sentinel.released) return true;
    const wl = (navigator as unknown as { wakeLock: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    sentinel = await wl.request('screen');
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await sentinel?.release();
  } catch {
    /* yok say */
  }
  sentinel = null;
}

export function wakeLockActive(): boolean {
  return !!sentinel && !sentinel.released;
}
