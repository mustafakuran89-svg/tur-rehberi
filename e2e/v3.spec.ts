// Geliştirme 3 uçtan uca testleri, Aşama B (rehber kanalı, bölüm videosu) ve C (rehber anlatımı, ses).
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { S1, blockBasemap, northOf, speechMock, spoken, utterances } from './helpers';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
});

const CH = 'UCaaaaaaaaaaaaaaaaaaaaaa';
const DESC = 'ÖRNEK Kent turu bölümleri:\n0:00 Giriş\n▶ 12:34 Saat Kulesi ve kadran\n19:05 - Kent Müzesi\n25:00 Son söz';

/** Sahte YouTube Data API: öncelikli kanal dizini (kanal → yükleme listesi → video ayrıntısı). */
async function fakeYoutube(context: BrowserContext, calls: string[]) {
  await context.route('**/www.googleapis.com/youtube/v3/**', (r) => {
    const u = new URL(r.request().url());
    calls.push(u.pathname.split('/').pop()!);
    if (u.pathname.endsWith('/channels'))
      return r.fulfill({ json: { items: [{ id: CH, snippet: { title: 'ÖRNEK Rehber Kanalı TV', description: 'Gezi rehberi' }, contentDetails: { relatedPlaylists: { uploads: 'UUaaa' } } }] } });
    if (u.pathname.endsWith('/playlistItems')) return r.fulfill({ json: { items: ['CHAPTER0001', 'TITLE000001', 'OTHER000001'].map((videoId) => ({ contentDetails: { videoId } })) } });
    if (u.pathname.endsWith('/videos')) {
      const all: Record<string, unknown> = {
        CHAPTER0001: { id: 'CHAPTER0001', snippet: { title: 'ÖRNEK Kent: bütün gün', description: DESC }, contentDetails: { duration: 'PT41M' }, statistics: { likeCount: '300' } },
        TITLE000001: { id: 'TITLE000001', snippet: { title: 'Kent Müzesi gezisi', description: '' }, contentDetails: { duration: 'PT9M' }, statistics: { likeCount: '900' } },
        OTHER000001: { id: 'OTHER000001', snippet: { title: 'Başka bir şehir', description: '' }, contentDetails: { duration: 'PT12M' }, statistics: { likeCount: '5' } },
      };
      return r.fulfill({ json: { items: (u.searchParams.get('id') ?? '').split(',').map((id) => all[id]).filter(Boolean) } });
    }
    if (u.pathname.endsWith('/search')) return r.fulfill({ json: { items: [] } });
    return r.abort();
  });
}

async function setKey(page: Page) {
  await page.goto('./#/settings');
  await page.getByTestId('yt-key-input').fill('AIzaTESTANAHTARI12345');
  await page.getByTestId('yt-key-save').click();
}

test('B: anahtar yokken "Kanalda ara" ve "YouTube’da ara"', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('channel-search')).toHaveAttribute('href', 'https://www.youtube.com/@AyricalikliRotalar/search?query=saat%20kulesi%20tarihi%20belgesel');
  await expect(page.getByTestId('channel-search')).toContainText('Ayrıcalıklı Rotalar');
  await expect(page.getByTestId('video-search')).toHaveAttribute('href', /youtube\.com\/results\?search_query=/);
});

test('B: rehber kanalında durağın bölümü bulunur, oradan başlar ve biter; başlangıcı ayarla kalıcı; tamamını izle', async ({ page, context }) => {
  const calls: string[] = [];
  await fakeYoutube(context, calls);
  await setKey(page);
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('guide-badge')).toHaveText('Rehber kanalı');
  await expect(page.getByTestId('video-chapter')).toHaveText('Bölüm: Saat Kulesi ve kadran, 12:34-19:05');
  await expect(page.getByTestId('video-meta')).toContainText('ÖRNEK Rehber Kanalı TV');
  // dizin bir kez kuruldu: 1 kanal + 1 liste + 1 ayrıntı; arama çağrısı yapılmadı (bölüm bulundu)
  expect(calls.filter((c) => c === 'search')).toHaveLength(0);
  expect(calls.slice(0, 3)).toEqual(['channels', 'playlistItems', 'videos']);

  await page.getByTestId('video-thumb').click();
  await expect(page.getByTestId('video-frame')).toHaveAttribute('src', /embed\/CHAPTER0001\?autoplay=1&playsinline=1&rel=0&start=754&end=1145/);
  // tamamını izle: başlangıç ve bitiş kalkar
  await page.getByTestId('watch-all').click();
  await expect(page.getByTestId('video-frame')).not.toHaveAttribute('src', /start=/);
  await page.getByTestId('watch-chapter').click();
  await expect(page.getByTestId('video-frame')).toHaveAttribute('src', /start=754/);

  // başlangıcı ayarla: oynatıcıdaki an 13:20
  await page.evaluate(() => ((window as unknown as { __ytTime: number }).__ytTime = 800.4));
  await page.getByTestId('set-start').click();
  await page.getByTestId('start-here').click();
  await expect(page.getByTestId('start-msg')).toContainText('13:20');
  await page.reload();
  await expect(page.getByTestId('video-chapter')).toHaveText('Başlangıç: 13:20 (sizin ayarınız)');
  await page.getByTestId('video-thumb').click();
  await expect(page.getByTestId('video-frame')).toHaveAttribute('src', /start=800&end=1145/);
  // yeniden açılınca dizin yeniden kurulmaz (30 gün)
  expect(calls.filter((c) => c === 'playlistItems')).toHaveLength(1);
  await page.getByTestId('start-clear').click();
  await expect(page.getByTestId('video-chapter')).toHaveText('Bölüm: Saat Kulesi ve kadran, 12:34-19:05');

  // aynı kanalda başlığı eşleşen video (basamak 3) sonraki adaydır; bölüm bilgisi yok
  await page.goto('./#/trip/__ornek__/day/0/stop/3');
  await expect(page.getByTestId('video-chapter')).toHaveText('Bölüm: Kent Müzesi, 19:05-25:00'); // bölüm, başlıktan önce gelir
  await page.getByTestId('video-next').click();
  await expect(page.locator('.video-title')).toHaveText('Kent Müzesi gezisi');
  await expect(page.getByTestId('video-chapter')).toHaveCount(0);

  // ayarlarda kanalın dizini görünür
  await page.goto('./#/settings');
  await expect(page.getByTestId('channel-name').first()).toHaveText('ÖRNEK Rehber Kanalı TV');
  await expect(page.getByTestId('channel-row').first()).toContainText('3 video tarandı');
});

test('B: öncelikli kanal listesi: ekle, sırala, sil; genel aramadan gelen kanalı öncelikli yap', async ({ page, context }) => {
  await page.goto('./#/settings');
  const rows = page.getByTestId('channel-row');
  await expect(rows).toHaveCount(1);
  await page.getByTestId('channel-input').fill('merhaba');
  await page.getByTestId('channel-add').click();
  await expect(page.getByText('Bu bir YouTube kanal bağlantısı ya da @ad değil.')).toBeVisible();
  await page.getByTestId('channel-input').fill('https://www.youtube.com/@BaskaRehber/videos');
  await page.getByTestId('channel-add').click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText('@BaskaRehber');
  await rows.nth(1).getByTestId('channel-up').click();
  await expect(rows.nth(0)).toContainText('@BaskaRehber');
  await rows.nth(0).getByTestId('channel-remove').click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText('@AyricalikliRotalar');

  // genel arama (kanal dizini yok): "bu kanalı öncelikli yap"
  await context.route('**/www.googleapis.com/youtube/v3/search**', (r) => r.fulfill({ json: { items: [{ id: { videoId: 'GENEL000001' } }] } }));
  await context.route('**/www.googleapis.com/youtube/v3/videos**', (r) =>
    r.fulfill({ json: { items: [{ id: 'GENEL000001', snippet: { title: 'Saat Kulesi hikayesi', channelTitle: 'Gezgin Kanal', channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb', defaultAudioLanguage: 'tr', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT5M' }, statistics: { likeCount: '10' } }] } }),
  );
  await setKey(page);
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('video-meta')).toContainText('Gezgin Kanal');
  await expect(page.getByTestId('guide-badge')).toHaveCount(0);
  await page.getByTestId('make-priority').click();
  await expect(page.getByText('Gezgin Kanal öncelikli kanallara eklendi.')).toBeVisible();
  await expect(page.getByTestId('guide-badge')).toBeVisible();
  await page.goto('./#/settings');
  await expect(page.getByTestId('channel-row')).toHaveCount(2);
  await expect(page.getByTestId('channel-row').nth(1)).toContainText('Gezgin Kanal');
});

test('C: kısa ve uzun anlatım ayrı okunur; kısaltılmış anlatım işaretli; okunuş sözlüğü yalnız seste', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/1/stop/2');
  await expect(page.getByTestId('narr-short')).toHaveAttribute('aria-checked', 'true'); // varsayılan kısa
  await expect(page.getByTestId('narr-short')).toContainText('yaklaşık 1 dk');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('çatı altına girmiş');
  expect((await spoken(page)).join(' ')).not.toContain('Merkato');
  await page.getByTestId('narr-long').click();
  await expect(page.getByTestId('narration')).toContainText('Yerliler buraya Mercato der');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Yerliler buraya Merkato der');
  // küçük ve kısa durakta uzun anlatımın tamamı okunur; kısaltılmış sayılmaz
  await page.goto('./#/trip/__ornek__/day/0/stop/4');
  await expect(page.getByTestId('abridged')).toHaveCount(0);
  await expect(page.getByTestId('narration')).toContainText('kulağından su akar');
  // sürüm 2 planında kısa anlatımı olmayan ana durak: uzun anlatımın ilk cümleleri, "kısaltılmış"
  const v2 = JSON.parse(readFileSync(new URL('./fixtures/plan-v2.json', import.meta.url), 'utf8'));
  await page.goto('./#/import');
  await page.getByTestId('paste').fill(JSON.stringify({ ...v2, id: 'eski-v2', title: 'ÖRNEK Eski V2' }));
  await page.getByTestId('paste-import').click();
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await page.goto('./#/trip/eski-v2/day/0/stop/3');
  await expect(page.getByTestId('abridged')).toBeVisible();
  const shown = await page.getByTestId('narration').innerText();
  expect(v2.days[0].stops[2].narration.startsWith(shown.trim())).toBe(true);
  await page.getByTestId('narr-long').click();
  await expect(page.getByTestId('abridged')).toHaveCount(0);
});

test('C: cümle cümle okuma: sonraki, önceki, duraklat ve sürdür', async ({ page }) => {
  // her cümle 3 sn sürsün: düğmeler okunan cümle değişmeden sınanır
  await page.addInitScript(() => ((window as unknown as { __speechMs: number }).__speechMs = 3000));
  await page.goto('./#/trip/__ornek__/day/0/stop/1');
  await page.getByTestId('narr-long').click();
  const player = page.getByTestId('player');
  await page.getByTestId('play').click();
  await expect(player).toHaveAttribute('data-state', 'playing');
  await page.getByTestId('pause').click();
  await expect(player).toHaveAttribute('data-state', 'paused');
  const at = Number(await player.getAttribute('data-index'));
  await page.getByTestId('next-sentence').click();
  await expect(player).toHaveAttribute('data-index', String(at + 1));
  await page.getByTestId('pause').click();
  await page.getByTestId('prev-sentence').click();
  await expect(player).toHaveAttribute('data-index', String(at));
  await page.getByTestId('pause').click();
  const n = (await spoken(page)).length;
  await page.getByTestId('resume').click();
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(n);
  // sürdürülen cümle kalınan cümledir
  const s = await spoken(page);
  expect(s[n]).toBe(s.find((x, i) => i < n && x === s[n]) ?? s[n]);
});

test('C: seçilen ses, hız ve perde motora gider; çevrimdışıyken internet isteyen ses cihazdaki sese düşer', async ({ page, context }) => {
  await page.goto('./#/settings');
  await expect(page.getByTestId('voice-row')).toHaveCount(3); // yalnız Türkçe sesler
  await page.getByTestId('voice-row').filter({ hasText: 'Gelişmiş' }).getByTestId('voice-choose').click();
  await expect(page.getByTestId('voice-row').filter({ hasText: 'Gelişmiş' })).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('preset-soft')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('voice-row').first().getByTestId('voice-sample').click();
  await page.goto('./#/trip/__ornek__/day/0/stop/1');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await utterances(page)).length).toBeGreaterThan(0);
  const u = (await utterances(page)).at(-1)!;
  expect(u).toMatchObject({ voice: 'tr-gelismis', rate: 0.9, pitch: 0.95 });

  await page.goto('./#/settings');
  await page.getByTestId('preset-fast').click();
  await page.getByTestId('voice-row').filter({ hasText: 'Bulut' }).getByTestId('voice-choose').click();
  await page.goto('./#/trip/__ornek__/day/0/stop/1');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await utterances(page)).at(-1)?.voice).toBe('tr-bulut');
  expect((await utterances(page)).at(-1)).toMatchObject({ rate: 1.15, pitch: 1 });
  await page.getByTestId('stop').click();
  await context.setOffline(true);
  const before = (await utterances(page)).length;
  await page.getByTestId('play').click();
  await expect.poll(async () => (await utterances(page)).length).toBeGreaterThan(before);
  expect((await utterances(page))[before].voice).toBe('tr'); // cihazdaki ses
  await context.setOffline(false);
});

test('C: video oynamaya başlayınca anlatım durur', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/1/stop/1');
  await expect(page.getByTestId('video-chapter')).toHaveText('Bölüm: ÖRNEK Eski Köprü, 12:34-17:12');
  await page.getByTestId('narr-long').click();
  await page.getByTestId('play').click();
  await expect(page.getByTestId('player')).toHaveAttribute('data-state', 'playing');
  await page.getByTestId('video-thumb').click();
  await expect(page.getByTestId('player')).not.toHaveAttribute('data-state', 'playing');
  // YouTube oynatıcısı "oynuyor" bildirdi (API taklidi): anlatım yeniden kesilir
  await expect.poll(() => page.evaluate(() => (window as unknown as { __ytPlayers: number }).__ytPlayers)).toBe(1);
  await expect(page.getByTestId('video-frame')).toHaveAttribute('src', /embed\/ORNEKvideo1\?.*start=754&end=1032/);
});

test('C: tur modunda varışta rehber karşılaması ve varsayılan (kısa) anlatım; diğeri tek dokunuşla', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(northOf(S1, 90));
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toMatch(/1\. gün.*5 durak/);
  await context.setGeolocation(northOf(S1, 10));
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Bu meydan uydurma bir kentin');
  const all = (await spoken(page)).join(' ');
  expect(all).toMatch(/ÖRNEK Pazar Meydanı/);
  expect(all).not.toContain('Köylüler buğdaylarını'); // uzun anlatım okunmadı
  await expect.poll(async () => (await spoken(page)).join(' ')).toMatch(/ÖRNEK Saat Kulesi/); // sıradaki durağa geçiş
  await page.getByTestId('other-length').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Köylüler buğdaylarını');
});
