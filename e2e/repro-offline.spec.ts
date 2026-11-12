// Geliştirme 3, "Başlamadan" 3: kullanıcının bildirdiği sorunun yeniden üretimi (v2.0 kodu üzerinde).
// Gezi hazırlanır (OpenFreeMap sahte yanıtla), ağ kapatılır; haritanın altlığı ve video kartı denetlenir.
import { expect, test } from '@playwright/test';
import { speechMock } from './helpers';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  for (const h of ['**/tr.wikipedia.org/**', '**/commons.wikimedia.org/**', '**/api.open-meteo.com/**', '**/www.googleapis.com/**', '**/thumb.wikimedia.org/**', '**/upload.wikimedia.org/**', '**/i.ytimg.com/**']) await context.route(h, (r) => r.abort());
  const style = {
    version: 8,
    sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eee' } }],
  };
  await context.route('**/tiles.openfreemap.org/**', (r) => {
    const u = r.request().url();
    if (u.includes('/styles/')) return r.fulfill({ json: style, headers: { 'access-control-allow-origin': '*' } });
    if (u.endsWith('/planet')) return r.fulfill({ json: { tiles: ['https://tiles.openfreemap.org/planet/test/{z}/{x}/{y}.pbf'], minzoom: 0, maxzoom: 14 }, headers: { 'access-control-allow-origin': '*' } });
    return r.fulfill({ body: Buffer.alloc(0), headers: { 'access-control-allow-origin': '*' } });
  });
});

test('yeniden üretim: hazırlıktan sonra ağ kapalıyken harita altlığı ve video', async ({ page, context, browserName }) => {
  await page.goto('./');
  const sw = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  test.skip(!sw, `${browserName}: service worker yok`);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await page.locator('summary', { hasText: 'YouTube bağlantısı yapıştır' }).click();
  await page.getByTestId('video-paste').fill('https://youtu.be/BBBBBBBBBB1');
  await page.getByTestId('video-add').click();
  await expect(page.getByTestId('video-unpin')).toBeVisible();
  await page.goto('./#/trip/__ornek__/prepare');
  await page.getByTestId('prepare-start').click();
  await expect(page.getByTestId('prepare-done')).toBeVisible({ timeout: 30_000 });
  const mapState = await page.getByTestId('prep-map').getAttribute('data-state');

  await context.setOffline(true);
  await page.goto('./#/trip/__ornek__/day/0');
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  const basemap = await map.getAttribute('data-basemap');
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  const card = page.getByTestId('video-card');
  await expect(card).toBeVisible();
  const offlineNote = await card.getByText('İnternet gerekli').count();
  const thumbs = await page.getByTestId('video-thumb').count();
  if (thumbs) await page.getByTestId('video-thumb').click();
  const frame = await page.getByTestId('video-frame').count();
  await context.setOffline(false);
  console.log(JSON.stringify({ browserName, mapState, basemap, offlineNote, thumbs, frameOpenedOffline: frame }));
});
