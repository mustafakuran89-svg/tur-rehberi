import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import sample from '../sample/ornek-plan.json';
import type { Trip } from '../plan/types';
import { openStatus } from './hours';
import { distinctiveWords, isoDurationSeconds, looksTurkish, parseYoutubeId, pickVideos, searchVideos, type YtVideoItem } from './youtube';
import { filterCommonsPages, mergeGallery, planImages, type CommonsPage, type GalleryImage } from './gallery';
import { buildIcs, firstClock, fold, tripIcsEvents, zonedToUtc } from './ics';
import { countdown, dayIndexOn, lateBy, leaveBand, nextFixed, tripActive, walkToNext } from './today';
import { returnToHotelUrl, safeHttps, telHref } from './links';
import { addLog, readLog, redact } from './log';
import { forecastRange, parseForecast, rainy } from './weather';
import { emptyUserState, eventKey, stopKey, venueKey } from './userState';
import { makeBackup, saveImported } from './store';
import { setYoutubeKey } from './youtube';
import { makeShare } from './share';

const trip = (): Trip => structuredClone(sample) as Trip;
const at = (iso: string, hm: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  return new Date(y, m - 1, d, h, mi);
};

describe('şu an açık mı', () => {
  const h = { fri: [['09:00', '18:00']], sat: [['17:00', '26:00']] };
  it('saat yoksa rozet yok', () => expect(openStatus(null, new Date())).toBeNull());
  it('açık, yakında kapanıyor, kapalı', () => {
    expect(openStatus(h, at('2027-05-14', '10:00'))?.state).toBe('open'); // cuma
    expect(openStatus(h, at('2027-05-14', '17:45'))).toEqual({ state: 'closing', closesAt: '18:00' });
    expect(openStatus(h, at('2027-05-14', '08:00'))).toEqual({ state: 'closed', opensAt: '09:00' });
    expect(openStatus(h, at('2027-05-14', '19:00'))?.state).toBe('closed');
  });
  it('gece yarısını aşan kapanış', () => {
    expect(openStatus(h, at('2027-05-15', '23:50'))).toEqual({ state: 'open', closesAt: '02:00' }); // cumartesi
    expect(openStatus(h, at('2027-05-16', '01:40'))).toEqual({ state: 'closing', closesAt: '02:00' }); // pazar 01:40, cumartesi aralığı
    expect(openStatus(h, at('2027-05-16', '02:10'))?.state).toBe('closed');
  });
  it('günü yazılmayan gün kapalıdır', () => {
    expect(openStatus(h, at('2027-05-12', '12:00'))?.state).toBe('closed'); // çarşamba
  });
});

const vid = (id: string, o: Partial<{ title: string; lang: string; dur: string; likes: string; views: string; live: string; desc: string }>): YtVideoItem => ({
  id,
  snippet: { title: o.title ?? 'Schönbrunn Sarayı gezisi', description: o.desc ?? '', defaultAudioLanguage: o.lang, liveBroadcastContent: o.live ?? 'none', channelTitle: 'Kanal' },
  contentDetails: { duration: o.dur ?? 'PT8M' },
  statistics: { likeCount: o.likes, viewCount: o.views ?? '100' },
});

describe('video seçme mantığı', () => {
  it('süre ve sözcükler', () => {
    expect(isoDurationSeconds('PT1H2M3S')).toBe(3723);
    expect(isoDurationSeconds('PT45S')).toBe(45);
    expect(distinctiveWords('Schönbrunn Sarayı')).toEqual(['schonbrunn']);
    expect(distinctiveWords('ÖRNEK Saat Kulesi')).toEqual(['saat']);
  });
  it('Türkçe sezgisi', () => {
    expect(looksTurkish({ defaultAudioLanguage: 'tr' })).toBe(true);
    expect(looksTurkish({ defaultAudioLanguage: 'de', title: 'Saray gezisi ve tarihi' })).toBe(false);
    expect(looksTurkish({ title: 'Viyana’da gezilecek yerler' })).toBe(true);
    expect(looksTurkish({ title: 'Vienna travel guide' })).toBe(false);
  });
  it('Türkçe olmayan, kısa, uzun, canlı ve konu dışı elenir; en çok beğenilen seçilir', () => {
    const items = [
      vid('aaaaaaaaaa1', { lang: 'de', likes: '9000' }),
      vid('aaaaaaaaaa2', { lang: 'tr', dur: 'PT1M30S', likes: '8000' }),
      vid('aaaaaaaaaa3', { lang: 'tr', dur: 'PT45M', likes: '7000' }),
      vid('aaaaaaaaaa4', { lang: 'tr', live: 'live', likes: '6000' }),
      vid('aaaaaaaaaa5', { lang: 'tr', title: 'Viyana sokakları', likes: '5000' }),
      vid('aaaaaaaaaa6', { lang: 'tr', likes: '120' }),
      vid('aaaaaaaaaa7', { lang: 'tr', likes: '450' }),
      vid('aaaaaaaaaa8', { title: 'Schönbrunn Sarayı nasıl gezilir, bilet ve tarihi', views: '99999' }), // dil yok, beğeni gizli
    ];
    const r = pickVideos(items, 'Schönbrunn Sarayı', '2026-11-11');
    expect(r.map((v) => v.youtubeId)).toEqual(['aaaaaaaaaa7', 'aaaaaaaaaa6', 'aaaaaaaaaa8']);
    expect(r[0]).toMatchObject({ likeCount: 450, durationSeconds: 480, source: 'auto', checkedAt: '2026-11-11', channel: 'Kanal' });
  });
  it('en çok beş aday saklanır', () => {
    const items = Array.from({ length: 9 }, (_, i) => vid(`bbbbbbbbbb${i}`, { lang: 'tr', likes: String(i) }));
    expect(pickVideos(items, 'Schönbrunn Sarayı', 'x')).toHaveLength(5);
  });
  it('bağlantıdan kimlik', () => {
    expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=1')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYoutubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseYoutubeId('kötü')).toBeNull();
  });
  it('arama hatası anahtarı mesaja yazmaz', async () => {
    const fake = (async () => new Response('{}', { status: 403 })) as unknown as typeof fetch;
    await expect(searchVideos('q', 'x', 'GIZLI-ANAHTAR-123', fake)).rejects.toThrow(/403/);
    await searchVideos('q', 'x', 'GIZLI-ANAHTAR-123', fake).catch((e: Error) => expect(e.message).not.toContain('GIZLI'));
  });
});

const page = (title: string, o: Partial<{ mime: string; w: number; h: number; artist: string; lic: string; url: string; missing: boolean }> = {}): CommonsPage => ({
  title,
  ...(o.missing ? { missing: '' } : {}),
  imagerepository: 'local',
  imageinfo: [
    {
      url: o.url ?? `https://upload.wikimedia.org/wikipedia/commons/a/ab/${encodeURIComponent(title)}`,
      thumburl: `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg/960px-x.jpg?utm=1`,
      width: o.w ?? 3000,
      height: o.h ?? 2000,
      mime: o.mime ?? 'image/jpeg',
      descriptionurl: 'https://commons.wikimedia.org/wiki/File:x.jpg',
      extmetadata: { Artist: { value: o.artist ?? '<a href="#">Ayşe</a>' }, LicenseShortName: { value: o.lic ?? 'CC BY-SA 4.0' } },
    },
  ],
});

describe('galeri', () => {
  it('lisansı okunamayan, Commons dışı, logo, harita, svg ve küçük görsel elenir', () => {
    const r = filterCommonsPages(
      [
        page('File:Saray.jpg'),
        page('File:Lisanssiz.jpg', { lic: '' }),
        page('File:Sahipsiz.jpg', { artist: ' ' }),
        page('File:Yabanci.jpg', { url: 'https://example.com/a.jpg' }),
        page('File:Wien Logo.png', { mime: 'image/png' }),
        page('File:Harita Viyana.jpg'),
        page('File:Plan.svg', { mime: 'image/svg+xml' }),
        page('File:Kucuk.jpg', { w: 300, h: 200 }),
        page('File:Yok.jpg', { missing: true }),
      ],
      'wiki',
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ credit: 'Ayşe', license: 'CC BY-SA 4.0', from: 'wiki' });
    expect(r[0].thumb).toBe('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/x.jpg/960px-x.jpg');
    expect(r[0].full).toContain('/1920px-');
  });
  it('plandaki görseller önce, gizlenen geri gelmez, en çok altı', () => {
    const plan = planImages([
      { url: 'https://example.org/p1.jpg', credit: 'A', license: 'CC0' },
      { url: 'https://example.org/p2.jpg', credit: '', license: 'CC0' }, // eser sahibi yok: gösterilmez
    ]);
    const fetched: GalleryImage[] = Array.from({ length: 8 }, (_, i) => ({ thumb: `https://thumb.wikimedia.org/wikipedia/commons/${i}.jpg`, full: 'f', credit: 'c', license: 'l', sourceUrl: null, from: 'wiki' }));
    const g = mergeGallery(plan, fetched, ['https://thumb.wikimedia.org/wikipedia/commons/0.jpg']);
    expect(g).toHaveLength(6);
    expect(g[0].thumb).toBe('https://example.org/p1.jpg');
    expect(g.some((x) => x.thumb.endsWith('/0.jpg'))).toBe(false);
  });
});

describe('takvim dosyası', () => {
  it('saat dilimi dönüşümü (yaz ve kış saati)', () => {
    expect(new Date(zonedToUtc('2026-11-19', '10:00', 'Europe/Vienna')).toISOString()).toBe('2026-11-19T09:00:00.000Z');
    expect(new Date(zonedToUtc('2027-05-14', '10:00', 'Europe/Vienna')).toISOString()).toBe('2027-05-14T08:00:00.000Z');
    expect(new Date(zonedToUtc('2027-05-14', '10:00', 'Europe/Istanbul')).toISOString()).toBe('2027-05-14T07:00:00.000Z');
  });
  it('geçerli dosya; otelden çıkış kaydında hatırlatma; seçilen etkinlik ve rezervasyon girer', () => {
    const t = trip();
    const us = emptyUserState('x');
    us.going[eventKey(t.days[0].eveningEvents![0])] = true;
    us.booked[venueKey(t.days[0].dinner[1])] = { done: true, note: '20:15, onay 42' };
    const ev = tripIcsEvents(t, us);
    const ics = buildIcs(ev, 'Europe/Rome', new Date('2026-11-11T10:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(ics.split('END:VEVENT').length - 1);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    // Otelden çıkış: 15.05.2027 21:00 Roma (UTC+2) → 19:00Z, iki hatırlatma
    const leave = ics.slice(ics.indexOf('UID:ornek-gezi-leave'));
    expect(leave).toContain('DTSTART:20270515T190000Z');
    expect(leave.slice(0, leave.indexOf('END:VEVENT'))).toMatch(/BEGIN:VALARM[\s\S]*TRIGGER:-PT30M[\s\S]*TRIGGER:PT0M/);
    expect(ics).toContain('SUMMARY:ÖRNEK Avlu Konseri');
    expect(ics).toContain('DTSTART:20270514T190000Z'); // konser 21:00
    expect(ics).toContain('Rezervasyon: ÖRNEK Teras Lokantası');
    expect(ics).toContain('DTSTART:20270514T181500Z'); // 20:15 nottan
    expect(ics).toContain('SUMMARY:⏰ Saat Kulesi'); // SABİT satır
    // seçilmeyen etkinlik girmez
    expect(ics).not.toContain('Fener Yürüyüşü');
  });
  it('saat dilimi bilinmiyorsa yüzer yerel saat', () => {
    const ics = buildIcs([{ uid: 'a', title: 'x', date: '2027-05-14', start: '23:30', minutes: 60 }], null);
    expect(ics).toContain('DTSTART:20270514T233000\r\n');
    expect(ics).toContain('DTEND:20270515T003000\r\n');
  });
  it('yardımcılar', () => {
    expect(firstClock('10:30–11:00')).toBe('10:30');
    expect(firstClock('08:30 civarı')).toBe('08:30');
    expect(firstClock('öğlen')).toBeNull();
    expect(fold('x'.repeat(80)).split('\r\n ')).toHaveLength(2);
  });
});

describe('bugün', () => {
  it('gezi tarihleri, gün, sabit saate geri sayım', () => {
    const t = trip();
    expect(tripActive(t, at('2027-05-14', '09:00'))).toBe(true);
    expect(tripActive(t, at('2027-05-16', '09:00'))).toBe(false);
    expect(dayIndexOn(t, at('2027-05-15', '09:00'))).toBe(1);
    const nf = nextFixed(t.days[0], at('2027-05-14', '09:15'));
    expect(nf?.time).toBe('10:30');
    expect(nf?.minutesLeft).toBe(75);
    expect(countdown(75)).toBe('1 sa 15 dk');
    expect(nextFixed(t.days[0], at('2027-05-14', '12:00'))).toBeNull();
  });
  it('geç kaldım ve yürüme süresi', () => {
    const t = trip();
    const us = emptyUserState('x');
    expect(lateBy(t.days[0], us, at('2027-05-14', '09:50'))).toBeNull(); // 1. durak 09:30, 20 dk
    expect(lateBy(t.days[0], us, at('2027-05-14', '10:15'))).toBe(45);
    expect(walkToNext(t.days[0], us)).toMatchObject({ minutes: 6, fromLodging: true });
    us.visited[stopKey(t.days[0].stops[0])] = 'x';
    expect(walkToNext(t.days[0], us)).toMatchObject({ minutes: 6, fromLodging: false });
  });
  it('dönüş bandı: geri sayım ve son 30 dakikada renk', () => {
    const t = trip();
    expect(leaveBand(t, at('2027-05-14', '20:00'))).toBeNull();
    expect(leaveBand(t, at('2027-05-15', '19:00'))).toEqual({ leaveBy: '21:00', minutesLeft: 120, urgent: false });
    expect(leaveBand(t, at('2027-05-15', '20:35'))).toEqual({ leaveBy: '21:00', minutesLeft: 25, urgent: true });
  });
});

describe('bağlantılar', () => {
  it('yalnız https kabul edilir', () => {
    expect(safeHttps('https://a.com/x')).toBe('https://a.com/x');
    expect(safeHttps('http://a.com')).toBeNull();
    expect(safeHttps('javascript:alert(1)')).toBeNull();
    expect(telHref('+43 1 533-52 88')).toBe('tel:+4315335288');
    expect(telHref('')).toBeNull();
  });
  it('otele dön: konum varsa oradan, yoksa otele yol tarifi', () => {
    const l = { name: 'Otel A', address: 'Cadde 1', lat: 48.2, lng: 16.37 };
    expect(returnToHotelUrl(l, { lat: 48.21, lng: 16.36 })).toBe('https://maps.apple.com/?saddr=48.210000,16.360000&daddr=48.2,16.37&dirflg=r&q=Otel%20A');
    expect(returnToHotelUrl(l, null)).toBe('https://maps.apple.com/?daddr=48.2,16.37&dirflg=r&q=Otel%20A');
    expect(returnToHotelUrl({ ...l, lat: null, lng: null }, null)).toBe('https://maps.apple.com/?q=Cadde%201');
  });
});

describe('hava', () => {
  it('tahmin penceresi ve çözümleme', () => {
    const t = trip();
    expect(forecastRange(t, at('2026-11-11', '10:00'))).toBeNull();
    expect(forecastRange(t, at('2027-05-10', '10:00'))).toEqual({ start: '2027-05-14', end: '2027-05-15' });
    const w = parseForecast({ timezone: 'Europe/Rome', daily: { time: ['2027-05-14'], precipitation_probability_max: [70], temperature_2m_max: [22], temperature_2m_min: [12], weather_code: [61] } });
    expect(w.timezone).toBe('Europe/Rome');
    expect(rainy(w.days[0])).toBe(true);
  });
});

describe('anahtar hiçbir dosyaya ve günlüğe yazılmaz', () => {
  beforeEach(() => localStorage.clear());
  it('günlük adreslerdeki ve kayıtlı anahtarı siler', () => {
    setYoutubeKey('AIzaGIZLIANAHTAR987');
    expect(redact('GET https://www.googleapis.com/youtube/v3/search?q=a&key=AIzaGIZLIANAHTAR987 403')).not.toContain('GIZLI');
    addLog('error', 'hata: AIzaGIZLIANAHTAR987 ile çağrı');
    expect(JSON.stringify(readLog())).not.toContain('GIZLI');
  });
  it('yedek ve paylaşım dosyasında anahtar yok', async () => {
    setYoutubeKey('AIzaGIZLIANAHTAR987');
    const t = trip();
    t.id = 'deneme';
    await saveImported(t);
    expect(JSON.stringify(await makeBackup())).not.toContain('GIZLI');
    expect(JSON.stringify(await makeShare('deneme'))).not.toContain('GIZLI');
  });
});
