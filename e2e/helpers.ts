import type { BrowserContext, Page } from '@playwright/test';

/** Sesli okuma taklidi: okunan metinler window.__spoken dizisine yazılır. */
export const speechMock = () => {
  const w = window as unknown as Record<string, unknown>;
  w.__spoken = [] as string[];
  class U {
    text: string;
    lang = '';
    rate = 1;
    voice: unknown = null;
    onstart: ((e: unknown) => void) | null = null;
    onend: ((e: unknown) => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;
    constructor(t: string) {
      this.text = t;
    }
  }
  const voices = [
    { name: 'Test Türkçe', lang: 'tr-TR', localService: true, default: true, voiceURI: 'tr' },
    { name: 'Test İtalyanca', lang: 'it-IT', localService: true, default: false, voiceURI: 'it' },
  ];
  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    getVoices: () => voices,
    speak(u: U) {
      (w.__spoken as string[]).push(u.text);
      setTimeout(() => {
        u.onstart?.({});
        setTimeout(() => u.onend?.({}), 20);
      }, 5);
    },
    cancel() {},
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
