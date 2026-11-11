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
  await expect(page.getByTestId('play-short')).toBeVisible();
  await expect(page.getByTestId('video-card')).toBeVisible();
  await page.goto('./#/trip/__ornek__/arrival');
  await expect(page.getByTestId('step')).toHaveCount(3);
  await page.goto('./#/whatsnew');
  await expect(page.getByTestId('whatsnew')).toContainText('Bugün ekranı');
});

test('yayın: manifest ve service worker dosyaları', async ({ request, baseURL }) => {
  const m = await request.get(new URL('manifest.webmanifest', baseURL).toString());
  expect(m.status()).toBe(200);
  expect((await m.json()).name).toBe('Tur Rehberi');
  const sw = await request.get(new URL('sw.js', baseURL).toString());
  expect(sw.status()).toBe(200);
});
