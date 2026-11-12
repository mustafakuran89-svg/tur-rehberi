// Son açılan gezi: ağ yokken soğuk açılışta o gezi açılır.
const KEY = 'tur-rehberi:last-trip';
export function rememberTrip(key: string): void {
  try {
    localStorage.setItem(KEY, key);
  } catch {
    /* yok say */
  }
}
export function lastTripKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// Oturumun ilk açılışı kök adresten mi (soğuk açılış)? Uygulama yüklenirken bir kez hesaplanır.
let cold = false;
try {
  if (!sessionStorage.getItem('tur-rehberi:session')) {
    sessionStorage.setItem('tur-rehberi:session', '1');
    cold = ['', '#', '#/'].includes(location.hash);
  }
} catch {
  /* yok say */
}
/** Soğuk açılışsa bir kez true döner. */
export function consumeColdStart(): boolean {
  const c = cold;
  cold = false;
  return c;
}
