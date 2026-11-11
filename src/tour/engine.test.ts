import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import { evaluateTour } from './engine';
import { moveTripNear } from '../sample/move';
import { distanceM } from '../lib/geo';
import { stopsInOrder } from '../plan/normalize';
import type { Trip } from '../plan/types';

const trip = structuredClone(sample) as Trip;
const stops = stopsInOrder(trip.days[0]);
const s1 = stops[0] as { lat: number; lng: number };
const s3 = stops[2] as { lat: number; lng: number };
const near = (p: { lat: number; lng: number }, northM: number) => ({ lat: p.lat + northM / 111320, lng: p.lng });

describe('tur motoru', () => {
  it('yarıçap dışında tetiklemez', () => {
    const e = evaluateTour(stops, { triggered: [], passed: [] }, near(s1, 80), 40);
    expect(e.enter).toBeNull();
    expect(e.next?.order).toBe(1);
    expect(Math.round(e.distanceToNext!)).toBe(80);
  });
  it('yarıçapa girince bir kez tetikler', () => {
    const e1 = evaluateTour(stops, { triggered: [], passed: [] }, near(s1, 20), 40);
    expect(e1.enter?.order).toBe(1);
    const e2 = evaluateTour(stops, e1.progress, near(s1, 10), 40);
    expect(e2.enter).toBeNull();
    expect(e2.next?.order).toBe(2);
  });
  it('ileri bir durağa girilince aradakiler geçildi sayılır', () => {
    const e = evaluateTour(stops, { triggered: [1], passed: [] }, near(s3, 5), 40);
    expect(e.enter?.order).toBe(3);
    expect(e.newlyPassed).toEqual([2]);
    expect(e.next?.order).toBe(4);
  });
  it('konum yokken sıradaki durağı verir, mesafe vermez', () => {
    const e = evaluateTour(stops, { triggered: [], passed: [] }, null, 40);
    expect(e.next?.order).toBe(1);
    expect(e.distanceToNext).toBeNull();
  });
});

describe('örnek geziyi taşıma', () => {
  it('1. durak verilen konumun 120 m kuzeyine gelir, aralar korunur', () => {
    const here = { lat: 41.0, lng: 29.0 };
    const moved = moveTripNear(trip, here);
    const m = stopsInOrder(moved.days[0]);
    expect(distanceM(here, m[0] as { lat: number; lng: number })).toBeCloseTo(120, -1);
    const before = distanceM(stops[0] as { lat: number; lng: number }, stops[4] as { lat: number; lng: number });
    const after = distanceM(m[0] as { lat: number; lng: number }, m[4] as { lat: number; lng: number });
    expect(Math.abs(before - after)).toBeLessThan(5);
  });
});
