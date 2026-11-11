import { expect, test } from '@playwright/test';
import { blockBasemap, speechMock, spoken } from './helpers';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
});

test('Gezilerim → gezi → gün → durak yolu', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Gezilerim' })).toBeVisible();
  const card = page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Gezi' });
  await expect(card).toContainText('ÖRNEK');
  await card.click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('ÖRNEK Gezi');
  await expect(page.getByTestId('no-warnings')).toBeVisible();
  await page.getByTestId('day-link').first().click();

  // Gün: harita, numaralı işaretler, rota, akış, SABİT rozeti
  await expect(page.getByRole('heading', { name: 'Meydan ve kule' })).toBeVisible();
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  await expect(map).toHaveAttribute('data-legs', '4');
  await expect(map.locator('.mk-stop')).toHaveCount(5);
  await expect(map.locator('.mk[data-label="K1"]')).toHaveCount(1);
  await expect(map.locator('.mk[data-label="A3"]')).toHaveCount(1);
  await expect(page.getByTestId('timeline').locator('.badge-fixed')).toHaveCount(1);
  await expect(page.getByText('yaklaşık').first()).toBeVisible();

  // Durak: numara, anlatım, oynatıcı, Haritalarda aç
  await page.getByTestId('stop-link').nth(1).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ÖRNEK Saat Kulesi');
  await expect(page.getByText('2. durak')).toBeVisible();
  await expect(page.getByTestId('narration')).toContainText('Saat kulesi');
  await expect(page.getByTestId('apple-maps')).toHaveAttribute('href', /maps\.apple\.com\/\?daddr=/);
  await page.getByTestId('play').click();
  await expect.poll(() => spoken(page)).toContainEqual(expect.stringContaining('Saat kulesi'));
  await page.getByTestId('next-stop').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ÖRNEK Kent Müzesi');
});

test('yemek, ifadeler, pratik bilgiler ve ayarlar ekranları', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/0/food');
  await expect(page.getByRole('heading', { name: 'Yemek seçenekleri' })).toBeVisible();
  await expect(page.getByTestId('venue')).toHaveCount(3 + 2 + 3 + 1);
  for (const code of ['K1', 'K2', 'K3', 'O1', 'O2', 'A1', 'A2', 'A3']) await expect(page.locator(`#v-${code}`)).toBeVisible();
  await expect(page.locator('#v-O2')).toContainText('Yedek');

  await page.goto('./#/trip/__ornek__/phrases');
  await expect(page.getByRole('heading', { name: 'İtalyanca' })).toBeVisible();
  await expect(page.getByTestId('phrase')).toHaveCount(17);
  await page.getByTestId('phrase').filter({ hasText: 'Il conto' }).click();
  await expect.poll(() => spoken(page)).toContain('Il conto, per favore');

  await page.goto('./#/trip/__ornek__/practical');
  await expect(page.getByRole('heading', { name: 'Acil numaralar' })).toBeVisible();
  await expect(page.getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112');

  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { name: 'Geliştirici ayarları' })).toBeVisible();
  await expect(page.getByTestId('voice-status')).toContainText('Türkçe ses: Test Türkçe');
  await expect(page.getByTestId('log-empty').or(page.getByTestId('log'))).toBeVisible();
});

test('koordinatı olmayan durak haritada yok, adresiyle listelenir', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/day/1');
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  await expect(map.locator('.mk-stop')).toHaveCount(4);
  await expect(page.getByTestId('no-coord-list')).toContainText('ÖRNEK Gizli Avlu');
  await expect(page.getByTestId('no-coord-list')).toContainText('Adres:');
});
