import { useEffect, useState } from 'react';

// Yönlendirme adres çubuğundaki # ile yapılır; statik barındırmada alt yol sorunu çıkmaz.
export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/' + h;
}

export function useHashPath(): string {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const on = () => setPath(currentPath());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export function go(path: string, replace = false): void {
  if (replace) window.location.replace('#' + path);
  else window.location.hash = path;
}

export function href(path: string): string {
  return '#' + path;
}

export type PinKind = 'stop' | 'venue' | 'event' | 'lodging';
const PIN_KINDS: PinKind[] = ['stop', 'venue', 'event', 'lodging'];

export type Route =
  | { name: 'trips' }
  | { name: 'import' }
  | { name: 'settings' }
  | { name: 'summary'; key: string }
  | { name: 'phrases'; key: string }
  | { name: 'practical'; key: string }
  | { name: 'day'; key: string; day: number }
  | { name: 'food'; key: string; day: number }
  | { name: 'tour'; key: string; day: number }
  | { name: 'stop'; key: string; day: number; order: number }
  | { name: 'pin'; key: string; day: number; kind: PinKind; ref: string }
  | { name: 'today'; key: string }
  | { name: 'transfer'; key: string; which: 'arrival' | 'departure' }
  | { name: 'prepare'; key: string }
  | { name: 'checklist'; key: string }
  | { name: 'videos'; key: string; day: number }
  | { name: 'whatsnew' }
  | { name: 'notFound' };

export function parseRoute(path: string): Route {
  const p = path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  if (p.length === 0) return { name: 'trips' };
  if (p[0] === 'import' && p.length === 1) return { name: 'import' };
  if (p[0] === 'settings' && p.length === 1) return { name: 'settings' };
  if (p[0] === 'whatsnew' && p.length === 1) return { name: 'whatsnew' };
  if (p[0] === 'trip' && p[1]) {
    const key = p[1];
    if (p.length === 2) return { name: 'summary', key };
    if (p[2] === 'phrases' && p.length === 3) return { name: 'phrases', key };
    if (p[2] === 'practical' && p.length === 3) return { name: 'practical', key };
    if (p[2] === 'today' && p.length === 3) return { name: 'today', key };
    if ((p[2] === 'arrival' || p[2] === 'departure') && p.length === 3) return { name: 'transfer', key, which: p[2] };
    if (p[2] === 'prepare' && p.length === 3) return { name: 'prepare', key };
    if (p[2] === 'checklist' && p.length === 3) return { name: 'checklist', key };
    if (p[2] === 'day' && /^\d+$/.test(p[3] ?? '')) {
      const day = Number(p[3]);
      if (p.length === 4) return { name: 'day', key, day };
      if (p[4] === 'food' && p.length === 5) return { name: 'food', key, day };
      if (p[4] === 'tour' && p.length === 5) return { name: 'tour', key, day };
      if (p[4] === 'videos' && p.length === 5) return { name: 'videos', key, day };
      if (p[4] === 'stop' && /^\d+$/.test(p[5] ?? '') && p.length === 6) return { name: 'stop', key, day, order: Number(p[5]) };
      if (p[4] === 'pin' && PIN_KINDS.includes(p[5] as PinKind) && p[6] && p.length === 7) return { name: 'pin', key, day, kind: p[5] as PinKind, ref: p[6] };
    }
  }
  return { name: 'notFound' };
}

const k = (key: string) => encodeURIComponent(key);
export const paths = {
  trips: () => '/',
  import: () => '/import',
  settings: () => '/settings',
  summary: (key: string) => `/trip/${k(key)}`,
  phrases: (key: string) => `/trip/${k(key)}/phrases`,
  practical: (key: string) => `/trip/${k(key)}/practical`,
  today: (key: string) => `/trip/${k(key)}/today`,
  transfer: (key: string, which: 'arrival' | 'departure') => `/trip/${k(key)}/${which}`,
  prepare: (key: string) => `/trip/${k(key)}/prepare`,
  checklist: (key: string) => `/trip/${k(key)}/checklist`,
  videos: (key: string, d: number) => `/trip/${k(key)}/day/${d}/videos`,
  whatsnew: () => '/whatsnew',
  day: (key: string, d: number) => `/trip/${k(key)}/day/${d}`,
  food: (key: string, d: number) => `/trip/${k(key)}/day/${d}/food`,
  tour: (key: string, d: number) => `/trip/${k(key)}/day/${d}/tour`,
  stop: (key: string, d: number, o: number) => `/trip/${k(key)}/day/${d}/stop/${o}`,
  pin: (key: string, d: number, kind: PinKind, ref: string | number) => `/trip/${k(key)}/day/${d}/pin/${kind}/${ref}`,
};
