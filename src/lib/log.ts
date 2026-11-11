// Cihazda oluşan hataları kaydeder; Ayarlar › Geliştirici › Hata günlüğünde gösterilir.
// Windows'tan iPhone Safari'sine hata ayıklayıcı bağlanamadığı için vardır.
export interface LogEntry {
  t: string; // ISO zaman
  kind: 'error' | 'rejection' | 'console' | 'info';
  msg: string;
}

const KEY = 'tur-rehberi:log';
const MAX = 100;
const listeners = new Set<() => void>();

export function readLog(): LogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LogEntry[];
  } catch {
    return [];
  }
}

export function addLog(kind: LogEntry['kind'], msg: string): void {
  const entries = readLog();
  entries.push({ t: new Date().toISOString(), kind, msg: msg.slice(0, 2000) });
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l());
}

export function clearLog(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l());
}

export function subscribeLog(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function str(a: unknown): string {
  if (a instanceof Error) return a.stack ?? a.message;
  if (typeof a === 'string') return a;
  try {
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

let installed = false;
export function installErrorCapture(): void {
  if (installed) return;
  installed = true;
  window.addEventListener('error', (e) => {
    const where = e.filename ? ` (${e.filename.split('/').pop()}:${e.lineno}:${e.colno})` : '';
    addLog('error', `${e.message}${where}${e.error?.stack ? '\n' + e.error.stack : ''}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    addLog('rejection', str(e.reason));
  });
  const orig = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      addLog('console', args.map(str).join(' '));
    } catch {
      /* yok say */
    }
    orig(...args);
  };
}
