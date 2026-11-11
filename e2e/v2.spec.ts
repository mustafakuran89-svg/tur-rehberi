// Geliştirme 2 uçtan uca testleri: plan güncelleme, video, galeri, rezervasyon, Michelin, Bugün,
// varış/dönüş, akşam etkinliği, takvim, hazırlık, garsona göster, koyu tema, erişilebilirlik.
import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { blockBasemap, speechMock, spoken } from './helpers';

const sample = () => JSON.parse(readFileSync(new URL('../src/sample/ornek-plan.json', import.meta.url), 'utf8'));
const v1 = () => JSON.parse(readFileSync(new URL('./fixtures/plan-v1.json', import.meta.url), 'utf8'));

function asReal(p: Record<string, unknown>, id = 'deneme-v2'): string {
  return JSON.stringify({ ...p, id, title: 'ÖRNEK Deneme V2' });
}

async function importText(page: Page, text: string) {
  await page.goto('./#/import');
  await page.getByTestId('paste').fill(text);
  await page.getByTestId('paste-import').click();
}

// Service worker kapalı: sahte dış servis yanıtları sayfa düzeyinde verilir (çevrimdışı açılış
// import-offline.spec.ts içinde service worker ile ayrıca sınanır).
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
});

test('A: sürüm 1 ve sürüm 2 planları içe aktarılır; güncellemede işaret ve notlar kalır', async ({ page }) => {
  // sürüm 1: konaklama/varış/etkinlik bölümleri hiç görünmez, ekran bozulmaz
  await importText(page, JSON.stringify({ ...v1(), id: 'eski-plan', title: 'ÖRNEK Eski Plan' }));
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await page.goto('./#/trip/eski-plan');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ÖRNEK Eski Plan');
  await expect(page.getByTestId('lodging')).toHaveCount(0);
  await expect(page.getByTestId('mark-hotel')).toBeVisible();
  await expect(page.getByTestId('arrival-link')).toHaveCount(0);
  await expect(page.getByTestId('departure-link')).toHaveCount(0);
  await page.goto('./#/trip/eski-plan/day/0');
  await expect(page.getByTestId('evening')).toHaveCount(0);
  await expect(page.getByTestId('from-lodging')).toHaveCount(0);
  await expect(page.getByTestId('return-hotel')).toHaveCount(0);
  await expect(page.getByTestId('stop-link')).toHaveCount(5);

  // sürüm 2 ve kullanıcı durumu
  await importText(page, asReal(sample()));
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await page.goto('./#/trip/deneme-v2/day/0/stop/2');
  await page.getByTestId('seen').check();
  await page.getByTestId('note').fill('Kule çok güzeldi');
  await page.getByTestId('note').blur();
  await expect(page.getByText('Kaydedildi')).toBeVisible();

  // aynı kimlikle güncelleme: bir durak çıkar, bir saat değişir
  const upd = sample();
  upd.days[0].stops = upd.days[0].stops.filter((s: { order: number }) => s.order !== 4);
  upd.days[0].stops.find((s: { order: number }) => s.order === 5).order = 4;
  upd.days[0].stops.find((s: { order: number }) => s.order === 3).legToNext = { mode: 'walk', minutes: 10, approx: false };
  upd.days[0].timeline = upd.days[0].timeline.filter((i: { stopOrder: number | null }) => i.stopOrder !== 4).map((i: { stopOrder: number | null; time: string }) => (i.stopOrder === 5 ? { ...i, stopOrder: 4 } : i.stopOrder === 2 ? { ...i, time: '11:00' } : i));
  await importText(page, asReal(upd));
  await expect(page.getByRole('dialog')).toContainText('Bu gezi zaten var');
  await page.getByTestId('confirm-ok').click();
  const ok = page.getByTestId('import-ok');
  await expect(ok).toContainText('korundu');
  await expect(ok).toContainText('Çıkan durak: ÖRNEK Çeşme Sokağı');
  await expect(ok).toContainText('Saati değişen: ÖRNEK Saat Kulesi: 10:30–11:00 → 11:00');
  await page.goto('./#/trip/deneme-v2/day/0/stop/2');
  await expect(page.getByTestId('seen')).toBeChecked();
  await expect(page.getByTestId('note')).toHaveValue('Kule çok güzeldi');
});

test('B: kısa ve uzun dinle; anahtar yokken "YouTube’da ara"; anahtarla Türkçe video, dokununca sayfa içinde oynar ve anlatım susar', async ({ page, context }) => {
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('look-for')).toContainText('Kadrandaki on iki kabartma');
  await page.getByTestId('play-short').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('uzak limanlardan dönen');
  await page.getByTestId('play').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Kule önce ahşaptan yapılmış');
  await expect(page.getByTestId('video-search')).toHaveAttribute('href', /youtube\.com\/results\?search_query=saat%20kulesi/);

  // Anahtar girilince uygulama arar (YouTube API sahte yanıtla)
  const calls: string[] = [];
  await context.route('**/www.googleapis.com/youtube/v3/search**', (r) => {
    calls.push(r.request().url());
    return r.fulfill({ json: { items: [{ id: { videoId: 'AAAAAAAAAA1' } }, { id: { videoId: 'AAAAAAAAAA2' } }, { id: { videoId: 'AAAAAAAAAA3' } }] } });
  });
  await context.route('**/www.googleapis.com/youtube/v3/videos**', (r) =>
    r.fulfill({
      json: {
        items: [
          { id: 'AAAAAAAAAA1', snippet: { title: 'Clock tower walk', defaultAudioLanguage: 'en', channelTitle: 'EN' }, contentDetails: { duration: 'PT8M' }, statistics: { likeCount: '9000', viewCount: '1' } },
          { id: 'AAAAAAAAAA2', snippet: { title: 'Saat Kulesi tarihi ve hikayesi', defaultAudioLanguage: 'tr', channelTitle: 'Gezi Kanalı', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT6M30S' }, statistics: { likeCount: '1200', viewCount: '50000' } },
          { id: 'AAAAAAAAAA3', snippet: { title: 'Saat Kulesi canlı', defaultAudioLanguage: 'tr', liveBroadcastContent: 'live' }, contentDetails: { duration: 'PT0S' }, statistics: { likeCount: '99999' } },
        ],
      },
    }),
  );
  await page.goto('./#/settings');
  await page.getByTestId('yt-key-input').fill('AIzaTESTANAHTARI12345');
  await page.getByTestId('yt-key-save').click();
  await expect(page.getByTestId('yt-key-status')).toContainText('Anahtar kayıtlı');
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('video-meta')).toContainText('Gezi Kanalı');
  await expect(page.getByTestId('video-meta')).toContainText('1.200 beğeni');
  await expect(page.getByTestId('video-meta')).toContainText('7 dk');
  await expect(page.getByTestId('video-search')).toHaveCount(0);
  expect(calls[0]).toContain('relevanceLanguage=tr');
  expect(calls[0]).toContain('videoEmbeddable=true');
  // anlatım çalarken videoya dokununca anlatım durur
  await context.route('**/www.youtube-nocookie.com/**', (r) => r.fulfill({ body: '<html></html>', contentType: 'text/html' }));
  const cancels = await page.evaluate(() => (window as unknown as { __cancels: number }).__cancels);
  await page.getByTestId('video-thumb').click();
  expect(await page.evaluate(() => (window as unknown as { __cancels: number }).__cancels)).toBeGreaterThan(cancels);
  await expect(page.getByTestId('video-frame')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/AAAAAAAAAA2\?autoplay=1&playsinline=1/);
  await expect(page.getByTestId('play')).toBeVisible();
  // sabitle; yeniden yüklenince arama yapılmaz (önbellek), sabitlenen kalır
  await page.getByTestId('video-pin').click();
  await expect(page.getByTestId('video-unpin')).toBeVisible();
  const before = calls.length;
  await page.reload();
  await expect(page.getByTestId('video-unpin')).toBeVisible();
  expect(calls.length).toBe(before);
  // anahtar hata günlüğüne ve paylaşım dosyasına girmez
  const log = await page.evaluate(() => localStorage.getItem('tur-rehberi:log') ?? '');
  expect(log).not.toContain('AIzaTESTANAHTARI12345');
  // anahtar silinince arama düğmesi döner (sabitleme kaldırılınca, önbellekte aday varsa o gösterilir)
  await page.getByTestId('video-unpin').click();
  await page.goto('./#/settings');
  await page.getByTestId('yt-key-clear').click();
  await page.goto('./#/trip/__ornek__/day/0/stop/1');
  await expect(page.getByTestId('video-search')).toBeVisible();
});

test('B: galeri — plandaki görsel önce, lisanssız ve Commons dışı elenir, gizlenen geri gelmez', async ({ page, context }) => {
  await context.route('**/tr.wikipedia.org/w/api.php**', (r) => r.fulfill({ json: { query: { pages: { '1': { title: 'Saat kulesi', images: [{ title: 'Dosya:Kule A.jpg' }, { title: 'Dosya:Lisanssiz.jpg' }, { title: 'Dosya:Logo.svg' }] } } } } }));
  const page_ = (title: string, lic: string) => ({
    title,
    imagerepository: 'local',
    imageinfo: [{ url: `https://upload.wikimedia.org/wikipedia/commons/a/aa/${title.slice(5)}`, thumburl: `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/aa/${title.slice(5)}/960px-x.jpg`, width: 2000, height: 1500, mime: 'image/jpeg', descriptionurl: 'https://commons.wikimedia.org/wiki/x', extmetadata: { Artist: { value: 'Ali Veli' }, LicenseShortName: { value: lic } } }],
  });
  await context.route('**/commons.wikimedia.org/w/api.php**', (r) => r.fulfill({ json: { query: { pages: { '1': page_('File:Kule A.jpg', 'CC BY 4.0'), '2': page_('File:Lisanssiz.jpg', '') } } } }));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await context.route('**/thumb.wikimedia.org/**', (r) => r.fulfill({ body: png, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  const items = page.getByTestId('gallery-item');
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toHaveAttribute('data-from', 'plan');
  await expect(items.nth(0).getByTestId('credit')).toHaveText('Scotch Mist · CC BY-SA 4.0');
  await expect(items.nth(1).getByTestId('credit')).toHaveText('Ali Veli · CC BY 4.0');
  await expect(page.getByTestId('wiki-link')).toHaveAttribute('href', 'https://tr.wikipedia.org/wiki/Saat_kulesi');
  await items.nth(1).getByRole('button').click();
  await expect(page.getByTestId('fs-credit')).toHaveText('Ali Veli · CC BY 4.0');
  await page.getByTestId('gallery-hide').click();
  await expect(items).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('gallery-item')).toHaveCount(1);
});

test('B: rezervasyon düğmesi yalnız verisi olan mekanda; Michelin süzgeci ve rozet; rezervasyon işareti', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/0/food');
  const a2 = page.locator('#v-A2');
  await expect(a2.getByTestId('act-book')).toHaveAttribute('href', 'https://example.com/ornek/rezervasyon');
  await expect(a2.getByTestId('act-book')).toHaveAttribute('target', '_blank');
  await expect(a2.getByTestId('michelin-badge')).toHaveText('Michelin 1 yıldız · 2026 · Yeşil yıldız');
  await expect(a2.locator('a.badge-link')).toHaveAttribute('href', 'https://example.com/ornek/michelin-teras');
  const a1 = page.locator('#v-A1');
  await expect(a1.getByTestId('act-book')).toHaveCount(0);
  await expect(a1.getByTestId('act-call-book')).toHaveText(/Arayıp yer ayırt/);
  await expect(a1.getByTestId('michelin-badge')).toContainText('Bib Gourmand');
  const k1 = page.locator('#v-K1');
  await expect(k1.getByTestId('act-book')).toHaveCount(0);
  await expect(k1.getByTestId('act-call-book')).toHaveCount(0);
  await expect(page.locator('#v-A3').getByTestId('act-book')).toHaveCount(0);
  // Michelin süzgeci
  await page.getByTestId('michelin-filter').check();
  await expect(page.getByTestId('venue')).toHaveCount(2);
  await expect(page.locator('[data-testid="venue"][data-code="A1"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="venue"][data-code="A2"]')).toHaveCount(1);
  await page.getByTestId('michelin-filter').uncheck();
  // rezervasyon işareti ve not; hazırlık listesinde görünür
  await a2.getByTestId('booked').check();
  await a2.getByTestId('booked-note').fill('20:15, onay 42');
  await a2.getByTestId('booked-note').blur();
  await expect(a2.getByTestId('booked-badge')).toBeVisible();
  await page.goto('./#/trip/__ornek__/checklist');
  const items = page.getByTestId('check-item');
  await expect(items.first()).toHaveAttribute('data-kind', 'required');
  const done = page.locator('[data-testid="check-item"][data-done="true"]').filter({ hasText: 'ÖRNEK Teras Lokantası' });
  await expect(done.first()).toContainText('20:15, onay 42');
  // haritada Michelin işareti ayırt edilir
  await page.goto('./#/trip/__ornek__/day/0');
  await expect(page.getByTestId('map').locator('.mk-michelin')).toHaveCount(2);
});

test('C: Bugün ekranı — sıradaki adım, sabit saate geri sayım, açık-kapalı rozeti, geç kaldım, hava yoksa plandaki not', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2027, 4, 14, 10, 15));
  await page.goto('./#/trip/__ornek__/today');
  await expect(page.getByTestId('next-step-name')).toHaveText('ÖRNEK Pazar Meydanı');
  await expect(page.getByTestId('walk')).toContainText('otelden');
  await expect(page.getByTestId('countdown')).toHaveText('10:30 · 15 dk kaldı');
  await expect(page.getByTestId('late')).toContainText('45 dk gerisindesiniz');
  await expect(page.getByTestId('weather-fallback')).toContainText('mayıs ortası ılık');
  const kule = page.getByTestId('today-stop').filter({ hasText: 'Saat Kulesi' });
  await expect(kule.getByTestId('open-badge')).toHaveAttribute('data-state', 'open');
  await page.getByTestId('today-stop').first().getByTestId('today-seen').click();
  await expect(page.getByTestId('next-step-name')).toHaveText('ÖRNEK Saat Kulesi');
  await expect(page.getByTestId('late')).toHaveCount(0);
});

test('C: gece yarısından sonra açık mekan ve kapanan durak', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2027, 4, 15, 1, 40)); // cumartesi 01:40
  await page.goto('./#/trip/__ornek__/day/1/food');
  await expect(page.locator('#v-A3').getByTestId('open-badge')).toHaveAttribute('data-state', 'closing');
  await expect(page.locator('#v-A3').getByTestId('open-badge')).toContainText('02:00');
  await expect(page.locator('#v-K1').getByTestId('open-badge')).toHaveAttribute('data-state', 'closed');
  // kapalı olanlar sona düşer
  await expect(page.locator('section:has(> h2:text-is("Akşam"))').getByTestId('venue').first()).toHaveAttribute('data-code', 'A3');
});

test('C: hava servisi yağış bekliyorsa yağmur notu öne çıkar; gezi tarihindeyken açılış ekranı Bugün olur', async ({ page, context }) => {
  await context.route('**/api.open-meteo.com/**', (r) => r.fulfill({ json: { timezone: 'Europe/Rome', daily: { time: ['2027-05-14', '2027-05-15'], precipitation_probability_max: [80, 10], temperature_2m_max: [21, 23], temperature_2m_min: [12, 13], weather_code: [61, 1] } } }));
  await page.clock.setFixedTime(new Date(2027, 4, 14, 9, 0));
  await importText(page, asReal(sample(), 'bugun-gezisi'));
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('./');
  await expect(page).toHaveURL(/#\/trip\/bugun-gezisi\/today$/);
  await expect(page.getByTestId('rain-card')).toContainText('müzede daha uzun kalın');
  await expect(page.getByTestId('weather')).toContainText('12° / 21°');
  await expect(page.getByTestId('arrival-card')).toBeVisible();
});

test('D: varış adımları sırayla işaretlenir ve ağ kapalıyken açılır; dönüş bandı son 30 dakikada renk değiştirir', async ({ page, context }) => {
  await page.goto('./#/trip/__ornek__');
  await context.setOffline(true);
  await page.goto('./#/trip/__ornek__/arrival');
  const steps = page.getByTestId('step');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toHaveAttribute('data-next', 'true');
  await steps.nth(0).getByTestId('step-done').click();
  await expect(steps.nth(0)).toHaveAttribute('data-done', 'true');
  await expect(steps.nth(1)).toHaveAttribute('data-next', 'true');
  await steps.nth(1).getByTestId('step-done').click();
  await steps.nth(2).getByTestId('step-done').click();
  await expect(page.getByTestId('transfer-all-done')).toBeVisible();
  await page.goto('./#/trip/__ornek__/departure');
  await expect(page.getByTestId('step')).toHaveCount(3);
  await context.setOffline(false);

  await page.clock.setFixedTime(new Date(2027, 4, 15, 19, 0));
  await page.goto('./#/trip/__ornek__/today');
  await expect(page.getByTestId('leave-band')).toHaveAttribute('data-urgent', 'false');
  await expect(page.getByTestId('leave-band')).toContainText('2 sa 00 dk kaldı');
  await page.clock.setFixedTime(new Date(2027, 4, 15, 20, 35));
  await page.reload();
  await expect(page.getByTestId('leave-band')).toHaveAttribute('data-urgent', 'true');
  await expect(page.getByTestId('leave-band')).toContainText('25 dk');
  await expect(page.getByTestId('return-hotel')).toHaveAttribute('href', /maps\.apple\.com\/\?daddr=.*dirflg=r/);
});

test('D: otel kartı, şoföre göster, akşam etkinliği "gidiyorum" akışa, Bugün’e ve takvim dosyasına girer', async ({ page }) => {
  await page.goto('./#/trip/__ornek__');
  await expect(page.getByTestId('lodging')).toContainText('ÖRNEK Dere Oteli');
  await page.getByTestId('show-driver').click();
  await expect(page.getByTestId('driver-name')).toHaveText('ÖRNEK Dere Oteli');
  await expect(page.getByTestId('driver-address')).toHaveText('ÖRNEK Dere Caddesi No: 7, ÖRNEK Kent');
  await page.getByTestId('fs-close').click();

  await page.goto('./#/trip/__ornek__/day/0');
  await expect(page.getByTestId('from-lodging')).toContainText('Otelden ilk durağa');
  await expect(page.getByTestId('to-lodging')).toContainText('Otele dönüş');
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  await expect(map.locator('.mk-event')).toHaveCount(2);
  await expect(map.locator('.mk-lodging')).toHaveCount(1);
  await expect(map).toHaveAttribute('data-legs', '4'); // etkinlikler rotaya girmez
  await expect(page.getByTestId('tl-event')).toHaveCount(0);
  await page.getByTestId('event').first().getByTestId('going').click();
  await expect(page.getByTestId('tl-event')).toHaveText(/E1\s*ÖRNEK Avlu Konseri/);

  await page.goto('./#/trip/__ornek__');
  const dl = page.waitForEvent('download');
  await page.getByTestId('ics-export').click();
  const file = await dl;
  const text = readFileSync(await file.path(), 'utf8');
  expect(text).toMatch(/^BEGIN:VCALENDAR\r\n/);
  expect(text).toContain('SUMMARY:ÖRNEK Avlu Konseri');
  expect(text).toMatch(/UID:ornek-gezi-leave@tur-rehberi[\s\S]*?TRIGGER:-PT30M[\s\S]*?END:VEVENT/);

  await page.clock.setFixedTime(new Date(2027, 4, 14, 18, 0));
  await page.goto('./#/trip/__ornek__/today');
  await expect(page.getByTestId('today-event')).toContainText('ÖRNEK Avlu Konseri');
});

test('E: geziyi hazırla sonrası ağ kapalıyken galeri fotoğrafları ve video küçük resmi görünür', async ({ page, context }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await context.route('**/thumb.wikimedia.org/**', (r) => r.fulfill({ body: png, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
  await context.route('**/i.ytimg.com/**', (r) => r.fulfill({ body: png, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
  await context.route('**/tr.wikipedia.org/w/api.php**', (r) => r.fulfill({ json: { query: { pages: { '-1': { title: 'x', missing: '' } } } } }));
  // sabitlenmiş video (kullanıcı ekledi) küçük resmi de kaydedilir
  await page.goto('./#/trip/__ornek__/day/0/stop/1');
  await page.locator('summary', { hasText: 'YouTube bağlantısı yapıştır' }).click();
  await page.getByTestId('video-paste').fill('https://youtu.be/BBBBBBBBBB1');
  await page.getByTestId('video-add').click();
  await expect(page.getByTestId('video-unpin')).toBeVisible();

  await page.goto('./#/trip/__ornek__/prepare');
  await page.getByTestId('prepare-start').click();
  await expect(page.getByTestId('prepare-done')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('prep-photos')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('prep-thumbs')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('prep-missing')).toContainText('YouTube anahtarı yok');

  await context.setOffline(true);
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  const img = page.getByTestId('gallery-item').first().locator('img');
  await expect(img).toHaveAttribute('src', /^blob:/);
  await page.goto('./#/trip/__ornek__/day/0/stop/1');
  await expect(page.getByTestId('video-thumb').locator('img')).toHaveAttribute('src', /^blob:/);
  await context.setOffline(false);
});

test('F: koyu tema, paylaşım dosyasında anahtar yok ve içe aktarılır, sürüm notları', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.goto('./#/settings');
  await page.evaluate(() => localStorage.setItem('tur-rehberi:youtube-key', 'AIzaPAYLASIMTESTI999'));
  await page.getByTestId('theme-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(18, 22, 20)');
  await page.getByTestId('whatsnew-link').click();
  await expect(page.getByTestId('whatsnew')).toContainText('Bugün ekranı');

  await page.goto('./#/trip/__ornek__');
  const dl = page.waitForEvent('download');
  await page.getByTestId('share').click();
  const text = readFileSync(await (await dl).path(), 'utf8');
  expect(text).toContain('"format": "tur-rehberi-paylasim"');
  expect(text).not.toContain('AIzaPAYLASIMTESTI999');
  // paylaşım dosyası içe aktarılır
  const shared = JSON.parse(text);
  shared.trip.id = 'paylasilan';
  shared.user.notes = { 's:ornek-saat-kulesi': 'Arkadaşımın notu' };
  await importText(page, JSON.stringify(shared));
  await expect(page.getByTestId('import-ok')).toContainText('notlar ve işaretler de alındı');
  await page.goto('./#/trip/paylasilan/day/0/stop/2');
  await expect(page.getByTestId('note')).toHaveValue('Arkadaşımın notu');
  await page.goto('./#/settings');
  await page.getByTestId('theme-system').click();
});

for (const theme of ['light', 'dark'] as const) {
  test(`F: erişilebilirlik denetimi (${theme}) — kritik hata yok`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const routes = ['./', './#/trip/__ornek__', './#/trip/__ornek__/day/0', './#/trip/__ornek__/day/0/stop/2', './#/trip/__ornek__/day/0/food', './#/trip/__ornek__/phrases', './#/trip/__ornek__/arrival', './#/trip/__ornek__/checklist', './#/trip/__ornek__/prepare', './#/settings'];
    const problems: string[] = [];
    for (const r of routes) {
      await page.goto(r);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(300);
      const res = await new AxeBuilder({ page }).exclude('.maplibregl-canvas').analyze();
      for (const v of res.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious')) {
        problems.push(`${r} ${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
      }
    }
    expect(problems).toEqual([]);
  });
}
