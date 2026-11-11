// plan.schema.json ile birebir tipler. Şema tek kaynaktır; burada değişiklik
// yapılırsa önce şema değişir.

export type ISODate = string; // YYYY-AA-GG
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type CoordSource = 'places' | 'manual' | 'other' | null;

export interface Source {
  title: string;
  url: string;
}

export interface Reservation {
  what: string;
  when?: string | null;
  note: string;
  url?: string | null;
}

export interface Dish {
  name: string;
  description: string;
  where: string;
}

export interface IntercityLeg {
  from: string;
  to: string;
  mode: 'drive' | 'transit' | 'flight' | 'ferry' | 'other';
  durationText?: string | null;
  note: string;
  roadStops?: string[];
}

export interface Phrase {
  original: string;
  script?: string | null;
  pronunciationTr: string;
  meaning: string;
  context?: string | null;
}

export interface PhraseList {
  language: string;
  langCode: string;
  items: Phrase[];
}

export interface EmergencyNumber {
  label: string;
  number: string;
}

export interface Practical {
  transport: string;
  moneyAndTipping: string;
  closedDays: string;
  emergency: EmergencyNumber[];
  notes?: string[];
}

export type TimelineKind = 'stop' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'travel' | 'free';

export interface TimelineItem {
  time: string;
  title: string;
  kind: TimelineKind;
  stopOrder?: number | null;
  venueCodes?: string[];
  fixed: boolean;
  note?: string | null;
}

export type LegMode = 'walk' | 'drive' | 'transit';

export interface Leg {
  mode: LegMode;
  minutes: number | null;
  approx: boolean;
}

export interface Stop {
  order: number;
  name: string;
  kind: 'main' | 'minor';
  lat: number | null;
  lng: number | null;
  coordSource: CoordSource;
  address: string;
  visitMinutes: number | null;
  openHours?: string | null;
  closedDays?: string | null;
  closedWeekdays?: Weekday[];
  fee?: string | null;
  ticketOrBooking?: string | null;
  bestTime?: string | null;
  narration: string;
  practicalLine: string;
  legToNext: Leg | null;
  sources: Source[];
  verifiedAt: ISODate | null;
}

export interface Venue {
  code: string;
  name: string;
  lat: number | null;
  lng: number | null;
  coordSource: CoordSource;
  address: string;
  whatToEat: string[];
  priceLevel: 1 | 2 | 3 | 4 | null;
  reservation: 'required' | 'recommended' | 'none' | null;
  reservationNote?: string | null;
  closedDays?: string | null;
  closedWeekdays?: Weekday[];
  queueNote?: string | null;
  suitsWhom: string;
  sources: Source[];
  verifiedAt: ISODate | null;
}

export interface Lunch {
  main: Venue;
  backup: Venue | null;
}

export interface Flex {
  swappable: string;
  skipIfTired: string;
  ifExtraTime: string;
  ifRain: string;
}

export interface Day {
  date: ISODate;
  title: string;
  theme: string;
  area: string;
  timeline: TimelineItem[];
  stops: Stop[];
  breakfast: Venue[];
  lunch: Lunch | null;
  dinner: Venue[];
  snacks: Venue[];
  flex: Flex;
  notes?: string | null;
}

export interface Trip {
  schemaVersion: 1;
  id: string;
  title: string;
  destinations: string[];
  startDate: ISODate;
  endDate: ISODate;
  summary: string;
  assumptions: string[];
  weatherNote: string;
  reservations: Reservation[];
  cuisine: Dish[];
  days: Day[];
  intercity?: IntercityLeg[];
  phrases: PhraseList[];
  practical: Practical;
  sources: Source[];
  verifiedAt: ISODate;
  notes?: string | null;
}
