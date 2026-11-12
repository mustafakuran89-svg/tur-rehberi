import { expect, test } from '@playwright/test';
import { speechMock } from './helpers';

// Yayımlanmış adrese karşı kısa alt küme (playwright.live.config.ts).
test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
});

test('yayın: açılış, örnek gezi, gün haritası, durak', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByText('Tur Rehberi').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gezilerim' })).toBeVisible();
  await page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Gezi' }).click();
  await page.getByTestId('day-link').first().click();
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  await expect(map.locator('.mk-stop')).toHaveCount(5);
  await page.getByTestId('stop-link').first().click();
  await expect(page.getByTestId('narration')).toBeVisible();
});

test('yayın: sürüm 2 — otel kartı, hızlı bakış, kısa dinle, varış adımları, sürüm notları', async ({ page }) => {
  await page.goto('./#/trip/__ornek__');
  await expect(page.getByTestId('lodging')).toContainText('ÖRNEK Dere Oteli');
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('look-for')).toBeVisible();
  await expect(page.getByTestId('narr-short')).toBeVisible();
  await expect(page.getByTestId('video-card')).toBeVisible();
  await page.goto('./#/trip/__ornek__/arrival');
  await expect(page.getByTestId('step')).toHaveCount(3);
  await page.goto('./#/whatsnew');
  await expect(page.getByTestId('whatsnew')).toContainText('Bugün ekranı');
});

test('yayın: sürüm 3 — anlatım anahtarı, ses ve kanal ayarları, bölge listesi ve dosyası', async ({ page, request, baseURL }) => {
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  await expect(page.getByTestId('narr-long')).toBeVisible();
  await expect(page.getByTestId('channel-search')).toHaveAttribute('href', /@AyricalikliRotalar\/search\?query=/);
  await page.goto('./#/settings');
  await expect(page.getByTestId('voice-settings')).toBeVisible();
  await expect(page.getByTestId('channel-row').first()).toContainText('@AyricalikliRotalar');
  await page.goto('./#/whatsnew');
  await expect(page.getByTestId('whatsnew')).toContainText('Tam çevrimdışı harita');
  // Viyana bölge dosyası yalnız yayın iş akışında üretilir
  if (!process.env.TUR_LIVE_URL) return;
  const m = await request.get(new URL('haritalar/bolgeler.json', baseURL).toString());
  expect(m.status()).toBe(200);
  const list = (await m.json()) as { bolgeler: { id: string; dosya: string; bayt: number; surum: string }[] };
  const v = list.bolgeler.find((b) => b.id === 'viyana')!;
  expect(v.bayt).toBeGreaterThan(1_000_000);
  // aralıklı istek (parça parça indirme) destekleniyor
  const r = await request.get(new URL(`haritalar/${v.dosya}?v=${v.surum}`, baseURL).toString(), { headers: { Range: 'bytes=0-6' } });
  expect(r.status()).toBe(206);
  expect(await r.text()).toBe('PMTiles');
  const font = await request.get(new URL('haritalar/fonts/Noto%20Sans%20Regular/0-255.pbf', baseURL).toString());
  expect(font.status()).toBe(200);
});

test('yayın: manifest ve service worker dosyaları', async ({ request, baseURL }) => {
  const m = await request.get(new URL('manifest.webmanifest', baseURL).toString());
  expect(m.status()).toBe(200);
  expect((await m.json()).name).toBe('Tur Rehberi');
  const sw = await request.get(new URL('sw.js', baseURL).toString());
  expect(sw.status()).toBe(200);
});
