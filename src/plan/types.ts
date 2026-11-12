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
  // sürüm 2
  phone?: string | null;
  website?: string | null;
  hours?: WeeklyHours | null;
  ticketUrl?: string | null;
  lookFor?: string[];
  narrationShort?: string | null;
  videoQuery?: string | null;
  videos?: Video[];
  wikipediaTr?: string | null;
  images?: PlanImage[];
  // sürüm 3
  altNames?: string[];
}

/** SS:DD; gece yarısından sonraki kapanış 24:00-29:59. */
export type Hhmm = string;
export type Interval = Hhmm[]; // [açılış, kapanış]; şema iki öge şartını denetler
export type WeeklyHours = Partial<Record<Weekday, Interval[]>>;

export interface Video {
  youtubeId: string;
  title: string;
  channel?: string | null;
  language?: string | null;
  durationSeconds?: number | null;
  likeCount?: number | null;
  viewCount?: number | null;
  checkedAt?: ISODate | null;
  source: 'plan' | 'auto' | 'manual';
  pinned?: boolean;
  // sürüm 3
  channelId?: string | null;
  startSeconds?: number | null;
  endSeconds?: number | null;
  chapterTitle?: string | null;
}

export interface Pronunciation {
  text: string;
  say: string;
}

export interface PlanImage {
  url: string;
  credit: string;
  license: string;
  sourceUrl?: string | null;
}

export interface Michelin {
  distinction: '3-stars' | '2-stars' | '1-star' | 'bib-gourmand' | 'selected';
  greenStar?: boolean;
  year: number;
  url?: string | null;
}

export type TransferMode = 'walk' | 'train' | 'metro' | 'tram' | 'bus' | 'shuttle' | 'taxi' | 'other';

export interface TransferStep {
  mode: TransferMode;
  instruction: string;
  from?: string | null;
  to?: string | null;
  line?: string | null;
  direction?: string | null;
  stopsCount?: number | null;
  durationMinutes?: number | null;
  ticket?: string | null;
  costText?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Transfer {
  title: string;
  date?: ISODate | null;
  flight?: string | null;
  flightTime?: string | null;
  hubName: string;
  hubLat?: number | null;
  hubLng?: number | null;
  leaveBy?: string | null;
  steps: TransferStep[];
  totalMinutes?: number | null;
  costText?: string | null;
  alternatives?: { title: string; summary: string; minutes?: number | null; costText?: string | null }[];
  note?: string | null;
  sources: Source[];
  verifiedAt: ISODate | null;
}

export interface Lodging {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  coordSource?: CoordSource;
  phone?: string | null;
  website?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  note?: string | null;
}

export interface DayLeg {
  mode: LegMode;
  minutes?: number | null;
  instruction: string;
}

export type EventKind = 'concert' | 'opera' | 'theatre' | 'dance' | 'market' | 'tour' | 'sport' | 'nightlife' | 'other';

export interface EveningEvent {
  title: string;
  kind: EventKind;
  venueName: string;
  address?: string | null;
  lat: number | null;
  lng: number | null;
  coordSource?: CoordSource;
  date: ISODate;
  startTime?: string | null;
  endTime?: string | null;
  priceText?: string | null;
  bookingUrl?: string | null;
  website?: string | null;
  note?: string | null;
  suitsWhom?: string | null;
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
  // sürüm 2
  phone?: string | null;
  website?: string | null;
  hours?: WeeklyHours | null;
  menuUrl?: string | null;
  images?: PlanImage[];
  bookingUrl?: string | null;
  michelin?: Michelin | null;
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
  eveningEvents?: EveningEvent[];
  fromLodging?: DayLeg | null;
  toLodging?: DayLeg | null;
}

export interface Trip {
  schemaVersion: 1 | 2 | 3;
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
  lodging?: Lodging | null;
  arrival?: Transfer | null;
  departure?: Transfer | null;
  // sürüm 3
  pronunciations?: Pronunciation[];
}
