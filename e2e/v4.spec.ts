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

// ---------------------------------------------------------------- Aşama B: plan kutusu
type Tool = { seal: (t: string, r: Uint8Array[], when?: string) => Promise<Record<string, unknown>>; decodePublicKey: (t: string) => Uint8Array; fingerprint: (r: Uint8Array) => Promise<string>; entryId: (id: string) => Promise<string> };

test('B: kutuya konan gezi "Yeni gezi" olarak gelir; güncellemede işaretler korunur; bozuk dosya reddedilir; özel anahtar yedekte yok', async ({ page, context }) => {
  const tool = (await import('../araclar/kutuya-koy.mjs')) as unknown as Tool;
  await page.goto('./#/settings');
  const keyText = await page.getByTestId('box-key').inputValue();
  expect(keyText).toMatch(/^tur-rehberi-anahtar:v1:[A-Za-z0-9+/=]+$/);
  await expect(page.getByTestId('box-fp')).toContainText(/Parmak izi: [0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}/);
  await page.getByTestId('box-copy').click();
  await expect(page.getByText('Anahtar panoya kopyalandı')).toBeVisible();

  const me = tool.decodePublicKey(keyText);
  const files: Record<string, string> = {};
  let index: Record<string, unknown> = { bicim: 'tur-rehberi-kutu-dizin', v: 1, guncelleme: null, kayitlar: [] };
  const put = async (plan: Record<string, unknown>, when: string, opts: { tamper?: boolean; recipients?: Uint8Array[] } = {}) => {
    const env = await tool.seal(JSON.stringify(plan), opts.recipients ?? [me], when);
    let body = JSON.stringify(env);
    if (opts.tamper) body = body.replace(/"sifreli":"(.)/, (_m, c) => `"sifreli":"${c === 'A' ? 'B' : 'A'}`);
    const kid = await tool.entryId(String(plan.id));
    const dosya = `k-${kid.slice(0, 16)}${opts.tamper ? 'b' : ''}.json`;
    files[dosya] = body;
    const kayitlar = (index.kayitlar as Record<string, unknown>[]).filter((x) => x.kimlik !== kid);
    kayitlar.push({ kimlik: kid, dosya, guncelleme: when, bayt: body.length, alicilar: await Promise.all((opts.recipients ?? [me]).map((r) => tool.fingerprint(r))) });
    index = { ...index, guncelleme: when, kayitlar };
  };
  await context.route('**/kutu/index.json', (r) => r.fulfill({ json: index, headers: { 'cache-control': 'no-store' } }));
  await context.route('**/kutu/k-*.json', (r) => {
    const name = r.request().url().split('/').pop()!;
    return files[name] ? r.fulfill({ body: files[name], contentType: 'application/json' }) : r.fulfill({ status: 404 });
  });

  const plan = { ...sample(), id: 'kutu-gezi', title: 'ÖRNEK Kutu Gezisi' };
  await put(plan, '2026-11-13T10:00:00.000Z');
  // başka bir cihaza giden kayıt sessizce atlanır
  const other = { ...sample(), id: 'baska-cihaz', title: 'ÖRNEK Başka' };
  const otherKey = (await page.evaluate(async () => {
    const k = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    return [...new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey))];
  })) as number[];
  await put(other, '2026-11-13T10:00:00.000Z', { recipients: [new Uint8Array(otherKey)] });

  await page.goto('./');
  const card = page.getByTestId('box-card');
  await expect(card).toHaveAttribute('data-kind', 'new');
  await expect(card).toContainText('ÖRNEK Kutu Gezisi');
  await expect(page.getByTestId('box-error')).toHaveCount(0);
  await expect(page.getByTestId('trip-card').filter({ hasText: 'ÖRNEK Başka' })).toHaveCount(0);
  await card.getByTestId('box-open').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ÖRNEK Kutu Gezisi');
  await markStop2(page, 'kutu-gezi', 'Kutu notu');

  // güncellenmiş sürüm kutuya konur; "Kutuyu denetle"
  const up = { ...plan, days: plan.days.map((d: Record<string, unknown>, i: number) => (i === 0 ? { ...d, title: 'Güncel başlık' } : d)) };
  await put(up, '2026-11-13T12:00:00.000Z');
  await page.goto('./#/settings');
  await page.getByTestId('box-check').click();
  await expect(page.getByTestId('box-result')).toHaveText('1 gezi alındı.');
  await expect(page.getByTestId('box-openness')).toContainText('Kutuda 3 dosya');
  await page.goto('./');
  await expect(page.getByTestId('box-card')).toHaveAttribute('data-kind', 'updated');
  await page.goto('./#/trip/kutu-gezi/day/0/stop/2');
  await expect(page.getByTestId('seen')).toBeChecked();
  await expect(page.getByTestId('note')).toHaveValue('Kutu notu');
  // aynı sürüm yeniden indirilmez
  await page.goto('./#/settings');
  await page.getByTestId('box-check').click();
  await expect(page.getByTestId('box-result')).toHaveText('Yeni gezi yok.');

  // tek baytı değiştirilmiş dosya reddedilir
  await put({ ...sample(), id: 'bozuk-gezi', title: 'ÖRNEK Bozuk' }, '2026-11-13T13:00:00.000Z', { tamper: true });
  await page.getByTestId('box-check').click();
  await expect(page.getByTestId('box-result')).toContainText('bozuk ya da değiştirilmiş');

  // özel anahtar yedekte ve günlükte yok
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Yedeği dışa aktar' }).click();
  const backup = readFileSync(await (await dl).path(), 'utf8');
  expect(backup).toContain('ÖRNEK Kutu Gezisi');
  expect(backup).not.toMatch(/priv|pubRaw|tur-rehberi-anahtar|"keys"/);
  const log = await page.evaluate(() => localStorage.getItem('tur-rehberi:log') ?? '');
  expect(log).not.toMatch(/priv|tur-rehberi-anahtar/);
  // ağ yokken denetim sessizce atlanır
  await context.setOffline(true);
  await page.getByTestId('box-check').click();
  await expect(page.getByTestId('box-result')).toHaveText('İnternet yok; kutu denetlenmedi.');
  await context.setOffline(false);
});

test('B: yeni gezi isteği metni parmak izini taşır, ağ çağrısı yapmaz', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  const requests: string[] = [];
  page.on('request', (r) => !r.url().startsWith('http://localhost') && !r.url().startsWith('data:') && requests.push(r.url()));
  await page.goto('./#/request');
  await page.getByTestId('req-place').fill('Viyana');
  await page.getByTestId('req-start').fill('2027-05-14');
  await page.getByTestId('req-end').fill('2027-05-17');
  await page.getByTestId('req-wishes').fill('Klimt görmek istiyoruz');
  const text = await page.getByTestId('req-text').inputValue();
  expect(text).toContain('Yer: Viyana');
  expect(text).toContain('Klimt');
  expect(text).toMatch(/Parmak izi: [0-9a-f-]{19}/);
  expect(text).toContain('tur-rehberi-anahtar:v1:');
  await page.getByTestId('req-share').click();
  await expect(page.getByText('Panoya kopyalandı.')).toBeVisible();
  expect(requests.filter((u) => !/i\.ytimg|wikimedia|openfreemap/.test(u))).toEqual([]);
});
