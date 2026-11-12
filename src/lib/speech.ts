// Sesli okuma: cihazın kendi sesi (Web Speech API, speechSynthesis). Gerçek bir kişinin sesi taklit
// edilmez (değişmez kural 13). Tarayıcı sesi yalnız ses seçimi, hız, perde ve ses düzeyiyle
// yönlendirilebilir (SpeechSynthesisUtterance: voice, rate, pitch, volume; SSML desteklenmez).
// iOS'ta ilk okuma kullanıcı dokunuşuyla başlamalıdır; unlockSpeech() bu dokunuşta çağrılır.
// Anlatım cümle cümle okunur: cümle arasında kısa, paragraf arasında uzun duraklama
// (src/lib/narration.ts). Okunuş sözlüğü yalnız seslendirmeye uygulanır.
import type { Pronunciation } from '../plan/types';
import { getSettings } from './settings';
import { applyPronunciations, PAUSE_MS, speechUnits, type SpeechUnit } from './narration';

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

let voicesCache: SpeechSynthesisVoice[] = [];
const voiceListeners = new Set<() => void>();

function refreshVoices() {
  if (!speechSupported()) return;
  voicesCache = window.speechSynthesis.getVoices();
  voiceListeners.forEach((l) => l());
}

if (speechSupported()) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
}

/** Ses listesi geç dolabilir: liste değiştikçe haber verir. */
export function onVoicesChanged(l: () => void): () => void {
  voiceListeners.add(l);
  refreshVoices();
  return () => {
    voiceListeners.delete(l);
  };
}

const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');

/** Dil koduna (tr-TR, it-IT) uyan sesi bulur. Yerel (cihazda) ses önceliklidir. */
export function findVoice(lang: string, opts: { localOnly?: boolean } = {}): SpeechSynthesisVoice | null {
  const base = lang.toLowerCase().split('-')[0];
  const pool = opts.localOnly ? voicesCache.filter((v) => v.localService) : voicesCache;
  const exact = pool.filter((v) => norm(v) === lang.toLowerCase());
  const same = exact.length ? exact : pool.filter((v) => norm(v).split('-')[0] === base);
  if (!same.length) return null;
  return same.find((v) => v.localService && v.default) ?? same.find((v) => v.localService) ?? same[0];
}

/** Cihazdaki bütün Türkçe sesler (Ayarlar › Ses listesinde gösterilir). */
export function turkishVoices(): SpeechSynthesisVoice[] {
  return voicesCache.filter((v) => norm(v).startsWith('tr'));
}

/**
 * Okumada kullanılacak ses: seçilen ses bulunursa o; bulunamazsa varsayılan Türkçe ses.
 * Ağ isteyen (cihazda olmayan) bir ses seçilmişse çevrimdışıyken cihazdaki sese düşülür.
 */
export function resolveVoice(lang: string, voiceURI: string | null, online = navigator.onLine): SpeechSynthesisVoice | null {
  if (lang.toLowerCase().startsWith('tr') && voiceURI) {
    const chosen = voicesCache.find((v) => v.voiceURI === voiceURI);
    if (chosen && (online || chosen.localService)) return chosen;
  }
  return online ? findVoice(lang) : (findVoice(lang, { localOnly: true }) ?? findVoice(lang));
}

/** Ses listesi okunabildi mi? (Bazı tarayıcılar listeyi geç verir ya da hiç vermez.) */
export function voicesKnown(): boolean {
  return voicesCache.length > 0;
}

/** Metni okunacak parçalara böler (cümle sınırlarından). */
export function splitForSpeech(text: string): string[] {
  return speechUnits(text).map((u) => u.text);
}

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
  /** Okunan cümlenin sırası (0 tabanlı) ve toplam. */
  onChunk?: (index: number, total: number) => void;
}

export interface VoiceOpts {
  rate?: number;
  pitch?: number;
  voiceURI?: string | null;
  pronunciations?: Pronunciation[] | null;
}

let session = 0;

/** Ayarlardaki ses, hız ve perde; çağıran verdiyse onunki. */
function voiceOpts(o: VoiceOpts | number | undefined) {
  const s = getSettings();
  const x: VoiceOpts = typeof o === 'number' ? { rate: o } : (o ?? {});
  return { rate: x.rate ?? s.rate, pitch: x.pitch ?? s.pitch, voiceURI: x.voiceURI !== undefined ? x.voiceURI : s.voiceURI, pronunciations: x.pronunciations ?? null };
}

/**
 * Okuma birimlerini (cümleleri) startAt'ten başlayarak sırayla okur. Önceki okumayı keser.
 * Dönen fonksiyon okumayı durdurur.
 */
export function speakUnits(units: SpeechUnit[], lang: string, o: VoiceOpts | number | undefined, h: SpeakHandlers = {}, startAt = 0): () => void {
  if (!speechSupported()) {
    h.onError?.('unsupported');
    return () => {};
  }
  const synth = window.speechSynthesis;
  const my = ++session;
  synth.cancel();
  const opt = voiceOpts(o);
  const voice = resolveVoice(lang, opt.voiceURI);
  let started = false;
  let i = Math.max(0, startAt);
  let timer: number | null = null;
  const next = () => {
    if (my !== session) return;
    if (i >= units.length) {
      h.onEnd?.();
      return;
    }
    const unit = units[i];
    const u = new SpeechSynthesisUtterance(applyPronunciations(unit.text, opt.pronunciations));
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    u.rate = opt.rate;
    u.pitch = opt.pitch;
    u.onstart = () => {
      if (my !== session) return;
      h.onChunk?.(i, units.length);
      if (!started) {
        started = true;
        h.onStart?.();
      }
    };
    u.onend = () => {
      if (my !== session) return;
      const pause = PAUSE_MS[unit.pauseAfter];
      i++;
      if (pause) timer = window.setTimeout(next, pause);
      else next();
    };
    u.onerror = (e) => {
      if (my !== session) return;
      const err = (e as SpeechSynthesisErrorEvent).error ?? 'error';
      if (err === 'interrupted' || err === 'canceled') return;
      h.onError?.(err);
    };
    synth.speak(u);
  };
  next();
  return () => {
    if (timer) window.clearTimeout(timer);
    if (my === session) {
      session++;
      synth.cancel();
    }
  };
}

/** Metni okur (cümle cümle, duraklamalı). Önceki okumayı keser. Dönen fonksiyon okumayı durdurur. */
export function speak(text: string, lang: string, o?: VoiceOpts | number, h: SpeakHandlers = {}): () => void {
  return speakUnits(speechUnits(text), lang, o, h);
}

const stopListeners = new Set<() => void>();
/** Okuma dışarıdan durdurulunca (ör. video başlayınca) haber verir. */
export function onSpeechStopped(l: () => void): () => void {
  stopListeners.add(l);
  return () => {
    stopListeners.delete(l);
  };
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  session++;
  window.speechSynthesis.cancel();
  stopListeners.forEach((l) => l());
}

/**
 * iOS ses kilidini açar: kullanıcı dokunuşunun içinde kısa bir cümle okunur.
 * Sonraki otomatik okumalar bu sayede çoğu durumda izinli olur (gerçek iPhone'da doğrulanmalı).
 */
export function unlockSpeech(sentence: string, rate?: number): void {
  if (!speechSupported()) return;
  speak(sentence, 'tr-TR', rate);
}
