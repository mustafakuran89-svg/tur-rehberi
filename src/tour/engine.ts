// Tur modunun saf mantığı: konum + durak listesi → hangi durak tetiklendi, hangileri geçildi,
// sıradaki durak hangisi. Tarayıcı API'si kullanmaz; birim testiyle sınanır.
import type { Stop } from '../plan/types';
import { bearingDeg, distanceM, hasCoord, type LatLng } from '../lib/geo';

export interface TourProgress {
  triggered: number[]; // anlatımı tetiklenmiş durak numaraları (order)
  passed: number[]; // yanına uğramadan geçilmiş durak numaraları
}

export interface TourEval {
  /** Bu değerlendirmede yarıçapına girilen ve ilk kez tetiklenen durak. */
  enter: Stop | null;
  /** Bu değerlendirmede geçildi sayılan duraklar (sıradaki yerine daha ileri bir durağa girildi). */
  newlyPassed: number[];
  /** Sıradaki durak (henüz tetiklenmemiş ve geçilmemiş, koordinatlı ilk durak). */
  next: Stop | null;
  distanceToNext: number | null;
  bearingToNext: number | null;
  progress: TourProgress;
}

export function evaluateTour(stops: Stop[], progress: TourProgress, pos: LatLng | null, radiusM: number): TourEval {
  const sorted = [...stops].sort((a, b) => a.order - b.order).filter(hasCoord);
  const done = new Set([...progress.triggered, ...progress.passed]);
  let triggered = progress.triggered;
  let passed = progress.passed;
  let enter: Stop | null = null;
  let newlyPassed: number[] = [];

  if (pos) {
    // Yarıçap içindeki tetiklenmemiş duraklardan en yakını
    const inside = sorted
      .filter((s) => !progress.triggered.includes(s.order))
      .map((s) => ({ s, d: distanceM(pos, s) }))
      .filter((x) => x.d <= radiusM)
      .sort((a, b) => a.d - b.d)[0];
    if (inside) {
      enter = inside.s;
      triggered = [...triggered, inside.s.order];
      // Bundan önce gelen, ne tetiklenmiş ne geçilmiş duraklar geçilmiş sayılır
      newlyPassed = sorted.filter((s) => s.order < inside.s.order && !done.has(s.order)).map((s) => s.order);
      passed = [...passed.filter((o) => o !== inside.s.order), ...newlyPassed];
    }
  }

  const doneAfter = new Set([...triggered, ...passed]);
  const next = sorted.find((s) => !doneAfter.has(s.order)) ?? null;
  return {
    enter,
    newlyPassed,
    next,
    distanceToNext: pos && next ? distanceM(pos, next) : null,
    bearingToNext: pos && next ? bearingDeg(pos, next) : null,
    progress: { triggered, passed },
  };
}

// İlerleme cihazda saklanır: sayfa yenilense de aynı durak ikinci kez tetiklenmez.
const key = (tripKey: string, day: number) => `tur-rehberi:tour:${tripKey}:${day}`;

export function loadProgress(tripKey: string, day: number): TourProgress {
  try {
    const raw = localStorage.getItem(key(tripKey, day));
    if (raw) return JSON.parse(raw) as TourProgress;
  } catch {
    /* yok say */
  }
  return { triggered: [], passed: [] };
}

export function saveProgress(tripKey: string, day: number, p: TourProgress): void {
  try {
    localStorage.setItem(key(tripKey, day), JSON.stringify(p));
  } catch {
    /* yok say */
  }
}

export function clearProgress(tripKey: string, day: number): void {
  try {
    localStorage.removeItem(key(tripKey, day));
  } catch {
    /* yok say */
  }
}
