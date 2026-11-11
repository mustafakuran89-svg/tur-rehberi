import { useSyncExternalStore } from 'react';

export interface Settings {
  rate: number; // okuma hızı
  autoNarrate: boolean;
  radiusM: number; // tetikleme yarıçapı
  simulate: boolean; // konum simülasyonu
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = { rate: 1, autoNarrate: true, radiusM: 40, simulate: false, theme: 'system' };

/** Tema seçimini sayfaya uygular (CSS: :root[data-theme]). */
export function applyTheme(t: Settings['theme']): void {
  const el = document.documentElement;
  if (t === 'system') el.removeAttribute('data-theme');
  else el.dataset.theme = t;
  const dark = t === 'dark' || (t === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121614' : '#1f4d45');
}
export const RATE_OPTIONS = [0.8, 0.9, 1, 1.1, 1.25];
export const RADIUS_OPTIONS = [25, 40, 60, 100];

const KEY = 'tur-rehberi:settings';
let current: Settings = load();
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* depolama kapalı olabilir */
  }
  return { ...DEFAULT_SETTINGS };
}

export function getSettings(): Settings {
  return current;
}

export function setSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* yok say */
  }
  listeners.forEach((l) => l());
  if (patch.theme) applyTheme(current.theme);
}

export function resetSettings(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* yok say */
  }
  current = { ...DEFAULT_SETTINGS };
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => current,
  );
}
