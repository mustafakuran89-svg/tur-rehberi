// Geliştirme 3, Aşama D: tam çevrimdışı. Örnek gezi hazırlanır (bölge dosyası sahte sunucudan:
// gerçek OpenStreetMap verisinden çıkarılmış küçük bir parça, e2e/fixtures/ornek-bolge.pmtiles),
// ağ kapatılır; her durağın haritası en yüksek ayrıntı düzeyinde açılır ve video dışında başarısız
// ağ isteği olmaz; fotoğraflar görünür; anlatım başlar; video kartı "İnternet gerekli" der;
// uygulama ağ kapalıyken yeniden yüklenip açılır.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { speechMock, spoken, YT_API_MOCK } from './helpers';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

// Bölge listesi ve dosyası test sunucusunda gerçek dosyadır (scripts/e2e-region.mjs); WebKit'te
// service worker'ın yaptığı istekler sahte yanıtla yakalanamadığı için.
async function fakeServices(context: BrowserContext, served: string[]) {
  context.on('request', (r) => r.url().includes('/haritalar/ornek.pmtiles') && served.push(r.headers()['range'] ?? 'tam'));
  await context.route('**/tiles.openfreemap.org/**', (r) => r.abort());
  for (const h of ['**/tr.wikipedia.org/**', '**/commons.wikimedia.org/**', '**/api.open-meteo.com/**', '**/www.googleapis.com/**', '**/upload.wikimedia.org/**', '**/www.youtube-nocookie.com/**']) await context.route(h, (r) => r.abort());
  await context.route('**/thumb.wikimedia.org/**', (r) => r.fulfill({ body: PNG, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
  await context.route('**/i.ytimg.com/**', (r) => r.fulfill({ body: PNG, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }));
  await context.route('**/www.youtube.com/iframe_api', (r) => r.fulfill({ body: YT_API_MOCK, contentType: 'text/javascript' }));
}

type MapLike = { jumpTo: (o: unknown) => void; once: (e: string, f: () => void) => void; areTilesLoaded: () => boolean; queryRenderedFeatures: () => unknown[]; getZoom: () => number; loaded: () => boolean };

/** Haritayı noktaya götürür, karolar yüklenene kadar bekler; görünen öge sayısını verir. */
async function showAt(page: Page, lng: number, lat: number, zoom: number): Promise<{ features: number; zoom: number }> {
  return page.evaluate(
    ([lng, lat, zoom]) =>
      new Promise<{ features: number; zoom: number }>((ok) => {
        const m = (window as unknown as { __tripMap: MapLike }).__tripMap;
        m.jumpTo({ center: [lng, lat], zoom });
        const done = () => ok({ features: m.queryRenderedFeatures().length, zoom: m.getZoom() });
        const t0 = Date.now();
        const wait = () => (m.loaded() && m.areTilesLoaded()) || Date.now() - t0 > 8000 ? done() : setTimeout(wait, 100);
        setTimeout(wait, 200);
      }),
    [lng, lat, zoom] as const,
  );
}

test('D: hazırlıktan sonra ağ kapalıyken harita, fotoğraf, anlatım; video "İnternet gerekli"; yeniden açılış', async ({ page, context, browserName }) => {
  test.setTimeout(120_000);
  await context.addInitScript(speechMock);
  const served: string[] = [];
  await fakeServices(context, served);
  await page.goto('./');
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  test.skip(!sw, `${browserName}: service worker bu test tarayıcısında yok`);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  // Gezi kartında rozet: hazırlanmadı
  await expect(page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Gezi' }).getByTestId('trip-offline')).toHaveAttribute('data-state', 'none');

  // Sabitlenmiş video (çevrimdışı kartı için)
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await page.locator('summary', { hasText: 'YouTube bağlantısı yapıştır' }).click();
  await page.getByTestId('video-paste').fill('https://youtu.be/BBBBBBBBBB1');
  await page.getByTestId('video-add').click();
  await expect(page.getByTestId('video-unpin')).toBeVisible();

  // Hazırlık: bölge bilgisi, boyut onayı, parça parça indirme, ağsız denetim
  await page.goto('./#/trip/__ornek__/prepare');
  await expect(page.getByTestId('prep-region')).toContainText('ÖRNEK Kent bölgesi, yaklaşık 3,4 MB');
  await expect(page.getByTestId('prep-where')).toHaveAttribute('data-mode', 'safari'); // iPhone boyutunda Safari sekmesi
  await page.getByTestId('prepare-start').click();
  await expect(page.getByRole('dialog')).toContainText('yaklaşık 3,4 MB');
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('prepare-done')).toBeVisible({ timeout: 60_000 });
  if (browserName === 'chromium') {
    expect(served.length).toBeGreaterThan(1); // 2 MB'lık parçalar
    expect(served.every((x) => x.startsWith('bytes='))).toBe(true);
  }
  await expect(page.getByTestId('prep-map')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('check-map')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('check-map')).toContainText(/Harita hazır, \d+ karo, 3,4 MB/);
  await expect(page.getByTestId('check-fonts')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('check-photos')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('check-voice')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('check-app')).toHaveAttribute('data-state', 'ok');
  await expect(page.getByTestId('check-video')).toContainText('Videolar internet ister');
  await expect(page.getByTestId('offline-check')).toHaveAttribute('data-ready', 'true');
  await page.goto('./');
  await expect(page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Gezi' }).getByTestId('trip-offline')).toHaveText('Çevrimdışı hazır');

  // Ağ kapalı: video dışındaki başarısız istekleri say
  const failed: string[] = [];
  page.on('requestfailed', (r) => {
    const u = r.url();
    // yalnız ağ istekleri (blob: işçi betiği ağ isteği değildir; WebKit onu da başarısız sayıyor)
    // sayfa değişirken iptal edilen yükleme ağ hatası değildir
    if (/cancel|ABORTED/i.test(r.failure()?.errorText ?? '')) return;
    if (/^https?:/.test(u) && !/youtube|ytimg/.test(u)) failed.push(`${u} ${r.failure()?.errorText}`);
  });
  await context.setOffline(true);
  await page.goto('./#/trip/__ornek__/day/0');
  await page.reload(); // ağ kapalıyken yeniden açılış
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const d of [0, 1]) {
    await page.goto(`./#/trip/__ornek__/day/${d}`);
    const map = page.getByTestId('map');
    await expect(map).toHaveAttribute('data-basemap', 'region', { timeout: 15_000 });
    const pts = JSON.parse(readFileSync(new URL('../src/sample/ornek-plan.json', import.meta.url), 'utf8')).days[d].stops.filter((s: { lat: number | null }) => s.lat !== null) as { lat: number; lng: number; name: string }[];
    for (const s of pts) {
      const at15 = await showAt(page, s.lng, s.lat, 15);
      expect(at15.features, `${s.name} 15. düzey`).toBeGreaterThan(20);
      const at17 = await showAt(page, s.lng, s.lat, 17); // bölgenin en yüksek düzeyinin ötesi: karo büyütülür
      expect(at17.features, `${s.name} 17. düzey`).toBeGreaterThan(5);
    }
    // indirilen alanın dışı
    await showAt(page, 11.6, 44.6, 14);
    await expect(page.getByTestId('outside-region')).toBeVisible();
  }

  // Fotoğraf, anlatım, video kartı
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('offline-first')).toBeVisible();
  await expect(page.getByTestId('gallery-item').first().locator('img')).toHaveAttribute('src', /^blob:/);
  await expect(page.getByTestId('need-internet')).toHaveText('İnternet gerekli');
  await expect(page.getByTestId('video-thumb')).toBeDisabled();
  // Küçük resim cihazdan (WebKit'te service worker'ın isteği sahte yanıtla yakalanamıyor; test ağında YouTube kapalı)
  if (browserName === 'chromium') await expect(page.getByTestId('video-thumb').locator('img')).toHaveAttribute('src', /^blob:/);
  await page.getByTestId('watch-later').click();
  await page.getByTestId('play').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Saat kulesi, rivayete göre');
  await page.goto('./#/trip/__ornek__/day/0/videos');
  await expect(page.getByTestId('watch-later-item')).toHaveCount(1);
  await expect(page.getByTestId('watch-later-item').getByTestId('need-internet')).toBeVisible();

  // Bütün ekranlar ağ kapalıyken açılır
  for (const r of ['./#/trip/__ornek__', './#/trip/__ornek__/day/0/food', './#/trip/__ornek__/phrases', './#/trip/__ornek__/arrival', './#/trip/__ornek__/checklist', './#/trip/__ornek__/practical', './#/trip/__ornek__/day/1/tour', './#/settings']) {
    await page.goto(r);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect(failed, failed.join('\n')).toEqual([]);
  await context.setOffline(false);
});

test('D: soğuk açılış ağ yokken son açık geziyi açar; gezi yaklaşırken hazırlık hatırlatılır', async ({ page, context, browserName }) => {
  await context.addInitScript(speechMock);
  await fakeServices(context, []);
  await page.goto('./');
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  test.skip(!sw, `${browserName}: service worker yok`);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  // Yakında başlayan gerçek gezi: hatırlatma kartı
  const plan = JSON.parse(readFileSync(new URL('../src/sample/ornek-plan.json', import.meta.url), 'utf8'));
  const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  plan.days = plan.days.map((d: Record<string, unknown>, i: number) => ({ ...d, date: day(2 + i), eveningEvents: [] }));
  await page.getByTestId('import-link').click();
  await page.getByTestId('paste').fill(JSON.stringify({ ...plan, id: 'yakin-gezi', title: 'ÖRNEK Yakın Gezi', startDate: day(2), endDate: day(3), arrival: null, departure: null }));
  await page.getByTestId('paste-import').click();
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await page.goto('./');
  await expect(page.getByTestId('prep-reminder')).toContainText('2 gün sonra');
  await expect(page.getByTestId('prep-reminder').getByRole('link')).toHaveAttribute('href', '#/trip/yakin-gezi/prepare');

  await page.goto('./#/trip/yakin-gezi');
  await context.setOffline(true);
  await page.evaluate(() => sessionStorage.clear()); // uygulama kapatıldı
  await page.goto('./');
  await expect(page).toHaveURL(/#\/trip\/yakin-gezi$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ÖRNEK Yakın Gezi');
  await context.setOffline(false);
});
