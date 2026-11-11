// Sesli okuma: cihazın kendi sesi (Web Speech API, speechSynthesis).
// iOS'ta ilk okuma kullanıcı dokunuşuyla başlamalıdır; unlockSpeech() bu dokunuşta çağrılır.
// Uzun metinler iOS'ta yarıda kesilebildiği için cümle cümle sıraya konur.

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

export function onVoicesChanged(l: () => void): () => void {
  voiceListeners.add(l);
  refreshVoices();
  return () => {
    voiceListeners.delete(l);
  };
}

/** Dil koduna (tr-TR, it-IT) uyan sesi bulur. Yerel (cihazda) ses önceliklidir. */
export function findVoice(lang: string): SpeechSynthesisVoice | null {
  const base = lang.toLowerCase().split('-')[0];
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  const exact = voicesCache.filter((v) => norm(v) === lang.toLowerCase());
  const same = exact.length ? exact : voicesCache.filter((v) => norm(v).split('-')[0] === base);
  if (!same.length) return null;
  return same.find((v) => v.localService) ?? same[0];
}

/** Ses listesi okunabildi mi? (Bazı tarayıcılar listeyi geç verir ya da hiç vermez.) */
export function voicesKnown(): boolean {
  return voicesCache.length > 0;
}

/** Metni okunacak parçalara böler (cümle sonlarından, en fazla ~220 karakter). */
export function splitForSpeech(text: string, max = 220): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + ' ' + s).trim().length > max && buf) {
      out.push(buf.trim());
      buf = s;
    } else buf = (buf + ' ' + s).trim();
  }
  if (buf) out.push(buf.trim());
  // tek cümle çok uzunsa virgüllerden böl
  return out.flatMap((p) => (p.length <= max * 1.5 ? [p] : p.split(/(?<=,)\s+/)));
}

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
  onChunk?: (index: number, total: number) => void;
}

let session = 0;

/** Metni okur. Önceki okumayı keser. Dönen fonksiyon okumayı durdurur. */
export function speak(text: string, lang: string, rate: number, h: SpeakHandlers = {}): () => void {
  if (!speechSupported()) {
    h.onError?.('unsupported');
    return () => {};
  }
  const synth = window.speechSynthesis;
  const my = ++session;
  synth.cancel();
  const parts = splitForSpeech(text);
  const voice = findVoice(lang);
  let started = false;
  let i = 0;
  const next = () => {
    if (my !== session) return;
    if (i >= parts.length) {
      h.onEnd?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(parts[i]);
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onstart = () => {
      if (my !== session) return;
      h.onChunk?.(i, parts.length);
      if (!started) {
        started = true;
        h.onStart?.();
      }
    };
    u.onend = () => {
      if (my !== session) return;
      i++;
      next();
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
    if (my === session) {
      session++;
      synth.cancel();
    }
  };
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

export function pauseSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.pause();
}

export function resumeSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.resume();
}

/**
 * iOS ses kilidini açar: kullanıcı dokunuşunun içinde kısa bir cümle okunur.
 * Sonraki otomatik okumalar bu sayede çoğu durumda izinli olur (gerçek iPhone'da doğrulanmalı).
 */
export function unlockSpeech(sentence: string, rate: number): void {
  if (!speechSupported()) return;
  speak(sentence, 'tr-TR', rate);
}
