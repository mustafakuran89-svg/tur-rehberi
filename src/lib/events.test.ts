import { describe, expect, it } from 'vitest';
import sample from '../sample/ornek-plan.json';
import type { Trip } from '../plan/types';
import { eventConflicts, eventsOnDate, interval, isDaytime, isFree, onDate, tonight, tripEvents } from './events';
import { emptyUserState, eventKey, venueKey } from './userState';

const clone = (): Trip => structuredClone(sample) as Trip;

describe('etkinlikler', () => {
  it('çok günlü etkinlik gezinin doğru günlerinde görünür', () => {
    const t = clone();
    const d1 = eventsOnDate(t, '2027-05-14').map((r) => r.e.title);
    const d2 = eventsOnDate(t, '2027-05-15').map((r) => r.e.title);
    expect(d1).toContain('ÖRNEK Eski Haritalar Sergisi'); // 01.05–30.06
    expect(d1).not.toContain('ÖRNEK Çiçek Festivali'); // 15–16.05
    expect(d2).toContain('ÖRNEK Çiçek Festivali');
    expect(d2).toContain('ÖRNEK Eski Haritalar Sergisi');
    expect(onDate({ date: '2027-05-15', endDate: null }, '2027-05-16')).toBe(false);
    expect(tripEvents(t).filter((r) => r.multi)).toHaveLength(2);
  });
  it('saat aralığı, ücretsiz ve gündüz', () => {
    expect(interval({ startTime: '21:00', endTime: '22:30' })).toEqual([1260, 1350]);
    expect(interval({ startTime: '23:30', endTime: '01:00' })).toEqual([1410, 1500]); // gece yarısını geçer
    expect(interval({ startTime: '20:00', durationMinutes: 45 })).toEqual([1200, 1245]);
    expect(interval({ startTime: null })).toBeNull();
    expect(isFree({ priceText: 'Ücretsiz' })).toBe(true);
    expect(isFree({ priceText: 'ÖRNEK 15 Avro' })).toBe(false);
    expect(isDaytime({ startTime: '11:00' })).toBe(true);
    expect(isDaytime({ startTime: '21:00' })).toBe(false);
  });
});

describe('çakışma denetimi', () => {
  const ref = (t: Trip, i: number) => tripEvents(t).find((r) => !r.multi && r.dayIndex === 0 && r.i === i)!;
  it('seçili başka etkinlikle çakışma', () => {
    const t = clone();
    const us = emptyUserState(t.id);
    const konser = ref(t, 0); // 21:00–22:30
    const fener = ref(t, 1); // 22:00, 45 dk
    us.going[konser.key] = true;
    us.going[fener.key] = true;
    expect(eventConflicts(t, us, konser, '2027-05-14').map((c) => c.kind)).toEqual(['event']);
    delete us.going[fener.key];
    expect(eventConflicts(t, us, konser, '2027-05-14')).toEqual([]);
  });
  it('SABİT satırla çakışma', () => {
    const t = clone();
    const us = emptyUserState(t.id);
    const e = ref(t, 0);
    e.e.startTime = '10:00';
    e.e.endTime = '10:45'; // SABİT 10:30–11:00 kule
    expect(eventConflicts(t, us, e, '2027-05-14').map((c) => c.kind)).toEqual(['fixed']);
  });
  it('yapılmış rezervasyonla çakışma (saat nottan)', () => {
    const t = clone();
    const us = emptyUserState(t.id);
    us.booked[venueKey(t.days[0].dinner[1])] = { done: true, note: '21:15, onay 42' };
    expect(eventConflicts(t, us, ref(t, 0), '2027-05-14').map((c) => c.kind)).toEqual(['booking']);
    us.booked[venueKey(t.days[0].dinner[1])] = { done: true, note: '19:00' };
    expect(eventConflicts(t, us, ref(t, 0), '2027-05-14')).toEqual([]);
  });
  it('çok günlü etkinlik esnektir, denetlenmez', () => {
    const t = clone();
    const h = tripEvents(t).find((r) => r.multi)!;
    expect(eventConflicts(t, emptyUserState(t.id), h, '2027-05-14')).toEqual([]);
  });
});

describe('bu akşam', () => {
  it('seçim yoksa öneriler (rehberin seçimi başta); seçilen; bitince otele dönüş', () => {
    const t = clone();
    const us = emptyUserState(t.id);
    const a = tonight(t, us, '2027-05-14', 18 * 60);
    expect(a.chosen).toBeNull();
    expect(a.picks[0].e.recommended).toBe(true);
    us.going[eventKey(t.days[0].eveningEvents![1])] = true;
    const b = tonight(t, us, '2027-05-14', 21 * 60);
    expect(b.chosen?.e.title).toBe('ÖRNEK Fener Yürüyüşü');
    expect(b.ended).toBeNull();
    expect(tonight(t, us, '2027-05-14', 23 * 60).ended?.e.title).toBe('ÖRNEK Fener Yürüyüşü');
  });
});
