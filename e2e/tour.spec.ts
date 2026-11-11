import { expect, test } from '@playwright/test';
import { S1, blockBasemap, northOf, setVisibility, speechMock, spoken } from './helpers';

const NARR_1 = 'uydurma bir kentin uydurma kalbidir';
const NARR_3 = 'Bu küçük müze';
const count = (xs: string[], needle: string) => xs.filter((x) => x.includes(needle)).length;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(speechMock);
  await blockBasemap(context);
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation(northOf(S1, 90)); // 1. duraktan 90 m uzakta
});

test('yarıçap dışında başlamaz, içine girince bir kez başlar, ikinci kez başlamaz', async ({ page, context }) => {
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await expect(page.getByTestId('next-name')).toHaveText('ÖRNEK Pazar Meydanı');
  await expect(page.getByTestId('distance')).toContainText('90 m');
  await expect(page.getByTestId('distance')).toContainText('güney');
  await page.waitForTimeout(600);
  expect(count(await spoken(page), NARR_1)).toBe(0);
  // "Tur başladı" kilidi açmak için dokunuşta okundu
  expect(await spoken(page)).toContain('Tur başladı.');

  await context.setGeolocation(northOf(S1, 15));
  await expect.poll(async () => count(await spoken(page), NARR_1)).toBe(1);
  await expect(page.getByTestId('tour-stop').first()).toHaveAttribute('data-state', 'triggered');
  await expect(page.getByTestId('next-name')).toHaveText('ÖRNEK Saat Kulesi');

  // aynı durakta dolaşmaya devam: yeniden başlamaz
  await context.setGeolocation(northOf(S1, 5));
  await page.waitForTimeout(800);
  await context.setGeolocation(northOf(S1, 25));
  await page.waitForTimeout(800);
  expect(count(await spoken(page), NARR_1)).toBe(1);

  // sayfa yenilense de tetiklenen durak hatırlanır
  await page.reload();
  await page.getByTestId('start-tour').click();
  await page.waitForTimeout(800);
  expect(count(await spoken(page), NARR_1)).toBe(0);
  await expect(page.getByTestId('tour-stop').first()).toHaveAttribute('data-state', 'triggered');
});

test('sayfa gizlenip dönünce tur sürer, konum yeniden değerlendirilir, geçilen durak bildirilir', async ({ page, context }) => {
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await expect(page.getByTestId('distance')).toBeVisible();

  await setVisibility(page, 'hidden');
  await expect(page.getByText('Tur duraklatıldı')).toBeVisible();
  // arka plandayken kullanıcı 3. durağa yürüdü (1 ve 2 geride kaldı... 1 hiç tetiklenmedi)
  const s3 = { latitude: 44.4938 + 560 / 111320, longitude: 11.3426 + -120 / (111320 * Math.cos((44.4938 * Math.PI) / 180)) };
  await context.setGeolocation(s3);
  await setVisibility(page, 'visible');

  await expect(page.getByTestId('banner')).toContainText('Tur sürüyor');
  await expect(page.getByTestId('banner')).toContainText('Geçilen durak: 1. durak, 2. durak');
  await expect.poll(async () => count(await spoken(page), NARR_3)).toBe(1);
  await expect(page.getByTestId('next-name')).toHaveText('ÖRNEK Çeşme Sokağı');
  await expect(page.getByTestId('end-tour')).toBeVisible();
});

test('otomatik anlatım başlamazsa büyük "Dinle" düğmesi çıkar', async ({ page, context }) => {
  // Bu testte okuma hiç başlamıyor (iOS ses kilidi taklidi)
  await page.addInitScript(() => {
    const s = window.speechSynthesis as unknown as { speak: (u: { text: string; onstart?: () => void }) => void };
    const w = window as unknown as { __spoken: string[]; __block?: boolean };
    w.__block = true;
    const orig = s.speak.bind(s);
    s.speak = (u) => {
      if (w.__block && !u.text.startsWith('Tur başladı')) {
        w.__spoken.push('ENGELLENDİ: ' + u.text);
        return;
      }
      orig(u);
    };
  });
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await context.setGeolocation(northOf(S1, 10));
  const listen = page.getByTestId('listen');
  await expect(listen).toBeVisible({ timeout: 8000 });
  await expect(listen).toContainText('Dinle');
  await page.evaluate(() => ((window as unknown as { __block: boolean }).__block = false));
  await listen.click();
  await expect.poll(async () => count(await spoken(page), NARR_1)).toBeGreaterThanOrEqual(2);
  await expect(listen).toBeHidden();
});
