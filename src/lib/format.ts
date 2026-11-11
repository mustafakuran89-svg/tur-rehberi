import { tr } from '../i18n/tr';

const nf1 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });

/** YYYY-AA-GG → GG.AA.YYYY */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

export function weekdayName(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return tr.weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 75 → "1 sa 15 dk" */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} ${tr.units.min}`;
  if (m === 0) return `${h} ${tr.units.hour}`;
  return `${h} ${tr.units.hour} ${m} ${tr.units.min}`;
}

/** 240 → "240 m", 1234 → "1,2 km" */
export function formatDistance(m: number): string {
  if (m < 1000) return `${nf0.format(Math.round(m / 5) * 5)} ${tr.units.m}`;
  return `${nf1.format(m / 1000)} ${tr.units.km}`;
}

export function formatKm(km: number): string {
  return `${nf1.format(km)} ${tr.units.km}`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(n);
}
