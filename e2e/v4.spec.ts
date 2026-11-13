// Geliştirme 4 uçtan uca testleri.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { blockBasemap, speechMock, spoken } from './helpers';

const sample = () => JSON.parse(readFileSync(new URL('../src/sample/ornek-plan.json', import.meta.url), 'utf8'));
const v3 = () => JSON.parse(readFileSync(new URL('./fixtures/plan-v3.json', import.meta.url), 'utf8'));

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
});

export async function importPlan(page: Page, p: unknown, replace = false) {
  await page.goto('./#/import');
  await page.getByTestId('paste').fill(JSON.stringify(p));
  await page.getByTestId('paste-import').click();
  if (replace) await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
}

async function markStop2(page: Page, id: string, note: string) {
  await page.goto(`./#/trip/${id}/day/0/stop/2`);
  await page.getByTestId('seen').check();
  await page.getByTestId('note').fill(note);
  await page.getByTestId('note').blur();
  await expect(page.getByTestId('seen')).toBeChecked();
}

test('A: kimliksiz ve kimlikli planda işaretler plan güncellemesinden sonra yerinde; kimliksizden kimlikliye geçişte taşınır', async ({ page }) => {
  // kimliksiz (sürüm 3)
  await importPlan(page, { ...v3(), id: 'kimliksiz', title: 'ÖRNEK Kimliksiz' });
  await markStop2(page, 'kimliksiz', 'Not A');
  const up = v3();
  up.days[0].timeline[2].time = '11:00';
  await importPlan(page, { ...up, id: 'kimliksiz', title: 'ÖRNEK Kimliksiz' }, true);
  await page.goto('./#/trip/kimliksiz/day/0/stop/2');
  await expect(page.getByTestId('seen')).toBeChecked();
  await expect(page.getByTestId('note')).toHaveValue('Not A');

  // kimlikli (sürüm 4): durağın adı değişse de işaret kimlikte kalır
  await importPlan(page, { ...sample(), id: 'kimlikli', title: 'ÖRNEK Kimlikli' });
  await markStop2(page, 'kimlikli', 'Not B');
  const ren = sample();
  ren.days[0].stops[1].name = 'ÖRNEK Yeni Adlı Kule';
  await importPlan(page, { ...ren, id: 'kimlikli', title: 'ÖRNEK Kimlikli' }, true);
  await page.goto('./#/trip/kimlikli/day/0/stop/2');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ÖRNEK Yeni Adlı Kule');
  await expect(page.getByTestId('seen')).toBeChecked();
  await expect(page.getByTestId('note')).toHaveValue('Not B');

  // geçiş: önce kimliksiz, sonra aynı gezi kimlikli gelir
  await importPlan(page, { ...v3(), id: 'gecis', title: 'ÖRNEK Geçiş' });
  await markStop2(page, 'gecis', 'Not C');
  await importPlan(page, { ...sample(), id: 'gecis', title: 'ÖRNEK Geçiş' }, true);
  await page.goto('./#/trip/gecis/day/0/stop/2');
  await expect(page.getByTestId('seen')).toBeChecked();
  await expect(page.getByTestId('note')).toHaveValue('Not C');
  void spoken;
});
