import { expect, test } from '@playwright/test';
import { blockBasemap, speechMock, spoken } from './helpers';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
});

test('simülasyon: haritada durağa dokununca anlatım başlar', async ({ page }) => {
  await page.goto('./#/settings');
  await page.getByTestId('simulate').check();
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await expect(page.getByTestId('sim-note')).toBeVisible();
  await page.getByTestId('start-tour').click();
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  const m1 = map.locator('.mk[data-label="1"]');
  await m1.click();
  await expect.poll(async () => (await spoken(page)).filter((t) => t.includes('uydurma bir kentin')).length).toBe(1);
  await expect(page.getByTestId('tour-stop').first()).toHaveAttribute('data-state', 'triggered');
  await expect(map.locator('[data-testid="user-dot"]')).toHaveCount(1);
});

test('örnek gezi bulunulan yere taşınır', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 41.0082, longitude: 28.9784 });
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /Örnek geziyi bulunduğum yere taşı/ }).click();
  await expect(page.getByRole('status')).toContainText('taşındı');
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await expect(page.getByTestId('distance')).toContainText('120 m');
  await expect(page.getByTestId('distance')).toContainText('kuzey');
  // ilk haline döndür
  await page.goto('./#/settings');
  await page.getByRole('button', { name: 'Örnek geziyi ilk haline döndür' }).click();
  await expect(page.getByRole('status')).toContainText('ilk haline');
});

test('koordinatı olmayan yerin iğnesi elle konur', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/1/pin/stop/3');
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  const box = (await map.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6);
  await expect(page.getByTestId('pin-pending')).toContainText('Seçilen nokta');
  await page.getByTestId('pin-save').click();
  // "pin/stop/3" de stop/3 ile biter: kaydedince durak sayfasına dönüldüğünü tam yolla bekle
  await expect(page).toHaveURL(/day\/1\/stop\/3$/);
  await page.goto('./#/trip/__ornek__/day/1');
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-renderer', 'loading');
  await expect(page.getByTestId('map').locator('.mk-stop')).toHaveCount(5);
  await expect(page.getByTestId('no-coord-list')).toHaveCount(0);
});
