// Plan güncelleme özeti: aynı kimlikle yeni plan gelince eklenen, çıkan ve saati değişen duraklar.
// Durak kimliği gün tarihi + durak adıdır (kullanıcı durumuyla aynı ad anahtarı).
import type { Day, Trip } from './types';
import { slug } from '../lib/userState';

export interface StopRef {
  date: string;
  name: string;
}
export interface PlanDiff {
  added: StopRef[];
  removed: StopRef[];
  timeChanged: (StopRef & { from: string; to: string })[];
}

function stopTimes(day: Day): Map<string, { name: string; time: string }> {
  const m = new Map<string, { name: string; time: string }>();
  for (const s of day.stops) {
    const t = day.timeline.find((i) => i.kind === 'stop' && i.stopOrder === s.order)?.time ?? '';
    m.set(slug(s.name), { name: s.name, time: t });
  }
  return m;
}

export function diffPlans(oldTrip: Trip, newTrip: Trip): PlanDiff {
  const out: PlanDiff = { added: [], removed: [], timeChanged: [] };
  const byDate = (t: Trip) => new Map(t.days.map((d) => [d.date, stopTimes(d)]));
  const a = byDate(oldTrip);
  const b = byDate(newTrip);
  const dates = [...new Set([...a.keys(), ...b.keys()])].sort();
  for (const date of dates) {
    const oa = a.get(date) ?? new Map();
    const nb = b.get(date) ?? new Map();
    for (const [k, v] of nb) {
      const o = oa.get(k);
      if (!o) out.added.push({ date, name: v.name });
      else if (o.time.trim() !== v.time.trim()) out.timeChanged.push({ date, name: v.name, from: o.time, to: v.time });
    }
    for (const [k, v] of oa) if (!nb.has(k)) out.removed.push({ date, name: v.name });
  }
  return out;
}

export function diffIsEmpty(d: PlanDiff): boolean {
  return d.added.length + d.removed.length + d.timeChanged.length === 0;
}
