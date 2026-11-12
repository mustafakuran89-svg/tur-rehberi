import { describe, expect, it, vi } from 'vitest';
import { cleanTitle, findChapter, formatStamp, isGeneric, matchesAnyName, parseChapters, stopNames } from './chapters';
import { buildIndex, channelSearchUrl, parseChannelInput, type ChannelIndex } from './channels';
import { needsGeneralSearch, rankVideos } from './videoRank';
import { embedUrl, pickVideos, type YtVideoItem } from './youtube';
import { DEFAULT_CHANNELS } from './settings';

const DESC = `Viyana gezimizin bütün durakları:
00:00 Giriş
1) 2:15 - Stephansdom
▶ 12:34 Belvedere Sarayı
• 19:05 – Schönbrunn'a gidiyoruz
#4. 31:40 | Naschmarkt
32:00 Kısa geçiş
1:02:10 - Prater ve dönme dolap
Bize ulaşın: 0532 000 00 00
Saat 18:30'da kapanır`;

describe('bölüm ayrıştırma', () => {
  it('dakika-saniye, saat-dakika-saniye, numaralı ve simgeli satırlar', () => {
    const ch = parseChapters(DESC, 4000);
    const by = Object.fromEntries(ch.map((c) => [c.title, c]));
    expect(by['Stephansdom']).toEqual({ start: 135, end: 754, title: 'Stephansdom' });
    expect(by['Belvedere Sarayı']).toEqual({ start: 754, end: 1145, title: 'Belvedere Sarayı' });
    expect(by["Schönbrunn'a gidiyoruz"]?.start).toBe(1145);
    expect(by['Prater ve dönme dolap']).toEqual({ start: 3730, end: null, title: 'Prater ve dönme dolap' });
  });
  it('bitiş sonraki bölümden gelir; 30 saniyeden kısa bölüm aday olmaz', () => {
    const ch = parseChapters(DESC, 4000);
    expect(ch.find((c) => c.title === 'Naschmarkt')).toBeUndefined(); // 31:40 → 32:00 = 20 sn
    expect(ch.find((c) => c.title === 'Kısa geçiş')?.end).toBe(3730);
  });
  it('damgası satırın ortasında kalan metin bölüm sayılmaz', () => {
    const ch = parseChapters(DESC, 4000);
    expect(ch.some((c) => c.title.includes('kapanır'))).toBe(false);
  });
  it('başlık sonda damga', () => {
    expect(parseChapters('Hofburg 4:05\nKarlskirche 9:00', 900).map((c) => [c.title, c.start, c.end])).toEqual([
      ['Hofburg', 245, 540],
      ['Karlskirche', 540, null],
    ]);
  });
  it('başlık temizleme ve damga biçimi', () => {
    expect(cleanTitle(' – 3. ★ Belvedere Sarayı ✨')).toBe('Belvedere Sarayı');
    expect(formatStamp(754)).toBe('12:34');
    expect(formatStamp(3730)).toBe('1:02:10');
  });
});

describe('durak eşleşmesi', () => {
  it('aksan ve Türkçe karakter farkı eşleşmeyi bozmaz', () => {
    expect(matchesAnyName('SCHONBRUNN SARAYI', ['Schönbrunn Sarayı'])).toBe(true);
    expect(matchesAnyName("schönbrunn'a gidiyoruz", ['Schonbrunn'])).toBe(true);
    expect(matchesAnyName('İstiklal caddesi', ['istiklal'])).toBe(true);
    expect(matchesAnyName('Straße der Musik', ['Strasse der Musik'])).toBe(true);
  });
  it('genel sözcük tek başına eşleşmez (ekli biçimleri dahil)', () => {
    expect(matchesAnyName('Sarayı geziyoruz', ['Belvedere Sarayı'])).toBe(false);
    expect(matchesAnyName('Belvedere Sarayı', ['Sarayı'])).toBe(false);
    expect(matchesAnyName('Eski Pazar Meydanı', ['Eski Pazar'])).toBe(false);
    for (const w of ['saray', 'sarayi', 'muzesi', 'kilisesi', 'katedrali', 'camii', 'meydani', 'koprusu', 'kulesi', 'parki', 'carsisi', 'pazari', 'eski', 'yeni', 'buyuk']) expect(isGeneric(w)).toBe(true);
  });
  it('diğer adlar da eşleşir; ÖRNEK etiketi ayıklanır', () => {
    const names = stopNames({ name: 'ÖRNEK Belvedere', altNames: ['Oberes Belvedere', 'Schloss Belvedere'] });
    expect(names[0]).toBe('Belvedere');
    expect(findChapter(parseChapters(DESC, 4000), names)?.start).toBe(754);
  });
});

const idx = (channelId: string, title: string, videos: ChannelIndex['videos']): ChannelIndex => ({ channelId, title, fetchedAt: '2026-11-12', calls: 3, videos });
const vid = (id: string, title: string, desc: string, dur: number, likes: number | null) => ({ id, title, chapters: parseChapters(desc, dur), durationSeconds: dur, likeCount: likes, viewCount: 10 });

describe('beş basamaklı sıralama', () => {
  const channels = [{ id: 'UCaaaaaaaaaaaaaaaaaaaaaa', title: 'A' }, { id: 'UCbbbbbbbbbbbbbbbbbbbbbb', title: 'B' }];
  const A = idx('UCaaaaaaaaaaaaaaaaaaaaaa', 'Ayrıcalıklı Rotalar', [
    vid('A_chapter01', 'Viyana: imparatorluk başkenti', DESC, 4000, 100),
    vid('A_title0001', 'Belvedere Sarayı ve Klimt', '', 900, 500),
    vid('A_city00001', 'Viyana sokakları', '', 1800, 900),
    vid('A_short0001', 'Viyana 1 dakikada', '', 60, 99999),
  ]);
  const B = idx('UCbbbbbbbbbbbbbbbbbbbbbb', 'B Kanalı', [vid('B_chapter01', 'Avusturya turu', '0:00 Giriş\n5:00 Belvedere\n9:00 Son', 1200, 9999)]);
  const general = [{ youtubeId: 'G_general01', title: 'Belvedere', source: 'auto' as const, likeCount: 5 }];
  const stop = { name: 'Belvedere Sarayı', altNames: ['Schloss Belvedere'] };

  it('basamak sırası: plan → kanal bölümü → kanal başlığı → genel → şehir videosu', () => {
    const r = rankVideos({ stop: { ...stop, videos: [{ youtubeId: 'PLAN0000001', title: 'Plan', source: 'plan', startSeconds: 30 }] }, city: 'Viyana', channels, indexes: [A, B], general });
    expect(r.map((v) => [v.youtubeId, v.tier])).toEqual([
      ['PLAN0000001', 1],
      ['A_chapter01', 2],
      ['B_chapter01', 2], // aynı basamakta kanal listesi sırası (B'nin beğenisi daha çok olsa da)
      ['A_title0001', 3],
      ['G_general01', 4],
      ['A_city00001', 5],
    ]);
    expect(r[0].startSeconds).toBe(30);
    expect(r[1]).toMatchObject({ startSeconds: 754, endSeconds: 1145, chapterTitle: 'Belvedere Sarayı', rehber: true });
    expect(r[2]).toMatchObject({ startSeconds: 300, endSeconds: 540 });
    expect(r[5].cityVideo).toBe(true);
    expect(r.find((v) => v.youtubeId === 'A_short0001')).toBeUndefined(); // kısa şehir videosu "uzun" değil
  });
  it('kullanıcının sabitlediği video en başta; elle ayarlanan başlangıç kalıcı', () => {
    const r = rankVideos({ stop, city: 'Viyana', channels, indexes: [A, B], general, userVideo: { youtubeId: 'A_city00001', title: 'x', source: 'manual', pinned: true }, manualStart: { youtubeId: 'A_city00001', start: 412 } });
    expect(r[0]).toMatchObject({ youtubeId: 'A_city00001', tier: 1, startSeconds: 412, manualStart: true });
    const r2 = rankVideos({ stop, city: 'Viyana', channels, indexes: [A, B], general, manualStart: { youtubeId: 'A_chapter01', start: 800 } });
    expect(r2[0]).toMatchObject({ youtubeId: 'A_chapter01', startSeconds: 800, endSeconds: 1145 });
    const r3 = rankVideos({ stop, city: 'Viyana', channels, indexes: [A, B], general, manualStart: { youtubeId: 'A_chapter01', start: 1500 } });
    expect(r3[0]).toMatchObject({ startSeconds: 1500, endSeconds: null });
  });
  it('kanal dizini yoksa genel arama gerekir; bölüm bulunduysa gerekmez', () => {
    expect(needsGeneralSearch(rankVideos({ stop, city: 'Viyana', channels, indexes: [null, null], general: [] }))).toBe(true);
    expect(needsGeneralSearch(rankVideos({ stop, city: 'Viyana', channels, indexes: [A, B], general: [] }))).toBe(false);
  });
});

describe('genel arama: bölüm ve rehber', () => {
  const item = (id: string, title: string, desc: string, dur: string, likes: string, channelTitle = 'Kanal', channelId = 'UCx'): YtVideoItem => ({
    id,
    snippet: { title, description: desc, channelTitle, channelId, defaultAudioLanguage: 'tr', liveBroadcastContent: 'none' },
    contentDetails: { duration: dur },
    statistics: { likeCount: likes },
  });
  it('açıklamada bölümü olan uzun video süre sınırına takılmaz ve bölümden başlar', () => {
    const r = pickVideos([item('LONGVIDEO01', 'Viyana turu', '0:00 Giriş\n12:34 Belvedere Sarayı\n20:00 Son', 'PT1H10M', '10')], ['Belvedere Sarayı'], 'x');
    expect(r[0]).toMatchObject({ youtubeId: 'LONGVIDEO01', startSeconds: 754, endSeconds: 1200 });
  });
  it('eşit beğenide kanal adında "rehber" geçen öne', () => {
    const r = pickVideos(
      [item('NORMAL00001', 'Belvedere Sarayı', '', 'PT5M', '10', 'Gezi'), item('REHBER00001', 'Belvedere Sarayı', '', 'PT5M', '10', 'Gezi Rehberi TV', 'UCy')],
      'Belvedere Sarayı',
      'x',
    );
    expect(r.map((v) => v.youtubeId)).toEqual(['REHBER00001', 'NORMAL00001']);
    const r2 = pickVideos([item('NORMAL00001', 'Belvedere Sarayı', '', 'PT5M', '10', 'Gezi'), item('ACIKLAMA001', 'Belvedere Sarayı', '', 'PT5M', '10', 'X', 'UCz')], 'Belvedere Sarayı', 'x', new Set(['UCz']));
    expect(r2[0].youtubeId).toBe('ACIKLAMA001');
  });
});

describe('kanal girişi, dizin ve oynatıcı adresi', () => {
  it('kanal bağlantısı ya da @ad tanınır', () => {
    expect(parseChannelInput('@AyricalikliRotalar')).toMatchObject({ handle: '@AyricalikliRotalar' });
    expect(parseChannelInput('https://www.youtube.com/@AyricalikliRotalar/videos')).toMatchObject({ handle: '@AyricalikliRotalar' });
    expect(parseChannelInput('https://youtube.com/channel/UC1234567890123456789012')).toMatchObject({ id: 'UC1234567890123456789012' });
    expect(parseChannelInput('https://example.com/@x')).toBeNull();
    expect(parseChannelInput('merhaba')).toBeNull();
    expect(DEFAULT_CHANNELS[0].handle).toBe('@AyricalikliRotalar');
  });
  it('anahtarsız kanal içi arama adresi', () => {
    expect(channelSearchUrl({ handle: '@AyricalikliRotalar', title: 'x' }, 'Belvedere Viyana')).toBe('https://www.youtube.com/@AyricalikliRotalar/search?query=Belvedere%20Viyana');
    expect(channelSearchUrl({ id: 'UC1234567890123456789012', title: 'x' }, 'a')).toBe('https://www.youtube.com/channel/UC1234567890123456789012/search?query=a');
  });
  it('gömme adresi bölüm başlangıcı ve bitişini taşır', () => {
    expect(embedUrl('ABCDEFGHIJK', 754, 1145)).toContain('start=754&end=1145');
    expect(embedUrl('ABCDEFGHIJK')).not.toContain('start=');
  });
  it('dizin sayfa sayfa okunur, 2.000 ile sınırlı, kota sayılır; anahtar hata mesajına girmez', async () => {
    const pages = 3;
    const fake = vi.fn(async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith('/channels')) return new Response(JSON.stringify({ items: [{ id: 'UCaaaaaaaaaaaaaaaaaaaaaa', snippet: { title: 'Ayrıcalıklı Rotalar' }, contentDetails: { relatedPlaylists: { uploads: 'UUaaa' } } }] }));
      if (u.pathname.endsWith('/playlistItems')) {
        const p = Number(u.searchParams.get('pageToken') ?? 0);
        return new Response(JSON.stringify({ items: Array.from({ length: 50 }, (_, i) => ({ contentDetails: { videoId: `v${p * 50 + i}` } })), nextPageToken: p + 1 < pages ? String(p + 1) : undefined }));
      }
      const ids = u.searchParams.get('id')!.split(',');
      return new Response(JSON.stringify({ items: ids.map((id) => ({ id, snippet: { title: id, description: '0:00 A\n1:00 Belvedere' }, contentDetails: { duration: 'PT5M' }, statistics: { likeCount: '1' } })) }));
    });
    const ix = await buildIndex({ handle: '@AyricalikliRotalar', title: 'x' }, 'GIZLI-ANAHTAR', fake as unknown as typeof fetch, 120);
    expect(ix.videos).toHaveLength(120);
    expect(ix.calls).toBe(1 + 3 + 3);
    expect(ix.videos[0].chapters[1]).toMatchObject({ title: 'Belvedere', start: 60 });
    expect(String(fake.mock.calls[0][0])).toContain('forHandle=%40AyricalikliRotalar');
    const bad = (async () => new Response('', { status: 403 })) as unknown as typeof fetch;
    await expect(buildIndex({ handle: '@x', title: 'x' }, 'GIZLI-ANAHTAR', bad)).rejects.toThrow(/403/);
    await buildIndex({ handle: '@x', title: 'x' }, 'GIZLI-ANAHTAR', bad).catch((e: Error) => expect(e.message).not.toContain('GIZLI'));
  });
});
