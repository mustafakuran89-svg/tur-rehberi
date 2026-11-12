import { useSyncExternalStore } from 'react';

/** Öncelikli rehber kanalı: kimlik (UC…) ya da @ad; ikisinden en az biri. */
export interface PriorityChannel {
  id?: string | null;
  handle?: string | null;
  title: string;
}

/** Sonra izle listesindeki video (Videolar sayfasında durur). */
export interface WatchLaterItem {
  youtubeId: string;
  title: string;
  channel?: string | null;
  start?: number | null;
  end?: number | null;
  stopName?: string | null;
  addedAt: string;
}

export type VoicePreset = 'soft' | 'natural' | 'fast' | 'custom';
export const VOICE_PRESETS: Record<Exclude<VoicePreset, 'custom'>, { rate: number; pitch: number }> = {
  soft: { rate: 0.9, pitch: 0.95 }, // Yumuşak rehber: biraz yavaş, biraz pes
  natural: { rate: 1, pitch: 1 },
  fast: { rate: 1.15, pitch: 1 },
};

export const DEFAULT_CHANNELS: PriorityChannel[] = [{ handle: '@AyricalikliRotalar', title: 'Ayrıcalıklı Rotalar' }];

export interface Settings {
  rate: number; // okuma hızı
  pitch: number; // perde
  voicePreset: VoicePreset;
  voiceURI: string | null; // seçilen ses; bulunamazsa varsayılan Türkçe ses
  narrationLength: 'short' | 'long'; // durak ve tur modunda varsayılan anlatım
  channels: PriorityChannel[];
  watchLater: WatchLaterItem[];
  autoNarrate: boolean;
  radiusM: number; // tetikleme yarıçapı
  simulate: boolean; // konum simülasyonu
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  ...VOICE_PRESETS.soft,
  voicePreset: 'soft',
  voiceURI: null,
  narrationLength: 'short',
  channels: DEFAULT_CHANNELS,
  watchLater: [],
  autoNarrate: true,
  radiusM: 40,
  simulate: false,
  theme: 'system',
};

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
    if (raw) return migrateSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    /* depolama kapalı olabilir */
  }
  return { ...DEFAULT_SETTINGS };
}

/** Eski kayıt: sürüm 2'de perde ve ses ayarı yoktu; yeni "Yumuşak rehber" başlangıcı uygulanır. */
export function migrateSettings(x: Partial<Settings>): Settings {
  const out = { ...DEFAULT_SETTINGS, ...x };
  if (x.pitch === undefined) Object.assign(out, VOICE_PRESETS.soft, { voicePreset: 'soft' });
  if (!Array.isArray(out.channels)) out.channels = DEFAULT_CHANNELS;
  if (!Array.isArray(out.watchLater)) out.watchLater = [];
  return out;
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
