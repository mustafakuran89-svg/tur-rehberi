import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { blockBasemap, speechMock } from './helpers';

const samplePath = new URL('../src/sample/ornek-plan.json', import.meta.url);

function realLikePlan(): string {
  const p = JSON.parse(readFileSync(samplePath, 'utf8'));
  p.id = 'deneme-gezisi-2027';
  p.title = 'ÖRNEK Deneme Gezisi';
  return JSON.stringify(p);
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
});

test('dosyadan içe aktarılan gezi listede görünür ve yenileyince durur', async ({ page }) => {
  await page.goto('./#/import');
  await page.getByTestId('file-input').setInputFiles({ name: 'plan.json', mimeType: 'application/json', buffer: Buffer.from(realLikePlan()) });
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await expect(page.getByTestId('import-ok')).toContainText('4 etabın süresi');
  await expect(page).toHaveURL(/#\/trip\/deneme-gezisi-2027$/);
  await page.goto('./');
  await expect(page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Deneme Gezisi' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Deneme Gezisi' })).toBeVisible();

  // Aynı kimlikle ikinci kez: önce sorar, onaylanınca yerini alır
  await page.goto('./#/import');
  await page.getByTestId('paste').fill(realLikePlan().replace('ÖRNEK Deneme Gezisi', 'ÖRNEK Deneme Gezisi 2'));
  await page.getByTestId('paste-import').click();
  await expect(page.getByRole('dialog')).toContainText('Bu gezi zaten var');
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('import-ok')).toContainText('ÖRNEK Deneme Gezisi 2');
  await page.goto('./');
  await expect(page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Deneme Gezisi' })).toHaveCount(1);
});

test('şemaya uymayan plan Türkçe hatayla reddedilir', async ({ page }) => {
  await page.goto('./#/import');
  const bad = JSON.parse(realLikePlan());
  delete bad.days[0].stops[0].narration;
  bad.startDate = '14.05.2027';
  await page.getByTestId('paste').fill(JSON.stringify(bad));
  await page.getByTestId('paste-import').click();
  await expect(page.getByTestId('import-error')).toContainText('Plan şemaya uymuyor');
  await expect(page.getByTestId('problems')).toContainText('gün 1 › durak 1: “narration” alanı eksik.');
  await expect(page.getByTestId('problems')).toContainText('YYYY-AA-GG');
  await page.getByTestId('paste').fill('{ bozuk');
  await page.getByTestId('paste-import').click();
  await expect(page.getByTestId('import-error')).toContainText('geçerli bir JSON değil');
});

test('ağ kapalıyken harita işaretleri ve rota görünür', async ({ page, context }) => {
  await page.goto('./#/trip/__ornek__/day/0');
  await expect(page.getByTestId('map')).not.toHaveAttribute('data-renderer', 'loading');
  await context.setOffline(true);
  await page.goto('./#/trip/__ornek__/day/1');
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  await expect(map).toHaveAttribute('data-basemap', 'none');
  await expect(map).toHaveAttribute('data-legs', '2');
  await expect(map.locator('.mk-stop')).toHaveCount(4);
  await expect(page.getByText('Harita altlığı yüklenemedi')).toBeVisible();
  await context.setOffline(false);
});

test('ağ kapalıyken uygulama açılır, gezi ve anlatım çalışır', async ({ page, context, browserName }) => {
  await page.goto('./');
  const ok = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    await navigator.serviceWorker.ready;
    return true;
  });
  test.skip(!ok, `${browserName}: service worker bu test tarayıcısında yok`);
  // service worker sayfayı denetlesin diye bir kez yenile
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Gezilerim' })).toBeVisible();
  await page.getByTestId('trip-card').first().click();
  await page.getByTestId('day-link').first().click();
  await page.getByTestId('stop-link').first().click();
  await page.getByTestId('play').click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length))
    .toBeGreaterThan(0);
  await context.setOffline(false);
});
