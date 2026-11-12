import type { BrowserContext, Page } from '@playwright/test';

/** Sesli okuma taklidi: okunan metinler window.__spoken dizisine yazılır. */
export const speechMock = () => {
  const w = window as unknown as Record<string, unknown>;
  w.__spoken = [] as string[];
  w.__utter = [] as { text: string; voice: string | null; rate: number; pitch: number }[];
  w.__cancels = 0;
  class U {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice: { voiceURI?: string } | null = null;
    onstart: ((e: unknown) => void) | null = null;
    onend: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    constructor(t: string) {
      this.text = t;
    }
  }
  const voices = [
    { name: 'Test Türkçe', lang: 'tr-TR', localService: true, default: true, voiceURI: 'tr' },
    { name: 'Test Türkçe Gelişmiş', lang: 'tr-TR', localService: true, default: false, voiceURI: 'tr-gelismis' },
    { name: 'Test Türkçe Bulut', lang: 'tr-TR', localService: false, default: false, voiceURI: 'tr-bulut' },
    { name: 'Test İtalyanca', lang: 'it-IT', localService: true, default: false, voiceURI: 'it' },
  ];
  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    getVoices: () => voices,
    speak(u: U) {
      (w.__spoken as string[]).push(u.text);
      (w.__utter as unknown[]).push({ text: u.text, voice: u.voice?.voiceURI ?? null, rate: u.rate, pitch: u.pitch });
      setTimeout(() => {
        u.onstart?.({});
        setTimeout(() => u.onend?.({}), 20);
      }, 5);
    },
    cancel() {
      (w.__cancels as number)++;
    },
    pause() {},
    resume() {},
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: U, configurable: true });
};

/** Harita altlığını engeller: testler dış servise bağlı kalmaz, "altlık yok" yolu sınanır. */
export async function blockBasemap(ctx: BrowserContext): Promise<void> {
  await ctx.route('**/tiles.openfreemap.org/**', (r) => r.abort());
  // Dış servisler testte kapalıdır; gereken testler kendi sahte yanıtını sonradan ekler (sonraki kural önce gelir).
  for (const h of ['**/tr.wikipedia.org/**', '**/commons.wikimedia.org/**', '**/api.open-meteo.com/**', '**/www.googleapis.com/**', '**/i.ytimg.com/**', '**/thumb.wikimedia.org/**', '**/upload.wikimedia.org/**', '**/www.youtube-nocookie.com/**']) {
    await ctx.route(h, (r) => r.abort());
  }
  await ctx.route('**/www.youtube.com/iframe_api', (r) => r.fulfill({ body: YT_API_MOCK, contentType: 'text/javascript' }));
}

/**
 * YouTube IFrame Player API taklidi: oynatıcıya bağlanır, "oynuyor" bildirir; anlık zaman
 * window.__ytTime'dan okunur. Gerçek API testte yüklenmez.
 */
export const YT_API_MOCK = `
window.__ytPlayers = 0;
window.YT = { PlayerState: { PLAYING: 1 }, Player: function (el, opts) {
  window.__ytPlayers++;
  setTimeout(function () { opts && opts.events && opts.events.onReady && opts.events.onReady(); }, 10);
  setTimeout(function () { opts && opts.events && opts.events.onStateChange && opts.events.onStateChange({ data: 1 }); }, 30);
  this.getCurrentTime = function () { return window.__ytTime || 0; };
  this.destroy = function () {};
} };
setTimeout(function () { window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 0);
`;

export async function utterances(page: Page): Promise<{ text: string; voice: string | null; rate: number; pitch: number }[]> {
  return page.evaluate(() => (window as unknown as { __utter: never[] }).__utter ?? []);
}

export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken ?? []);
}

/** Sayfayı gizli/görünür yapar (arka plana gitme taklidi). */
export async function setVisibility(page: Page, state: 'hidden' | 'visible'): Promise<void> {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { value: s, configurable: true });
    Object.defineProperty(document, 'hidden', { value: s === 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

// Örnek gezinin 1. günü, 1. durağı (scripts/make-sample.mjs içindeki merkez nokta)
export const S1 = { latitude: 44.4938, longitude: 11.3426 };
export const northOf = (p: { latitude: number; longitude: number }, m: number) => ({ latitude: p.latitude + m / 111320, longitude: p.longitude });
