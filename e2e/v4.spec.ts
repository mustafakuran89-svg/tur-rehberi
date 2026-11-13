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
  // @ts-expect-error -- düz JS aracı
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

// ---------------------------------------------------------------- Aşama C: ipuçları
test('C: bilet ipucu "Bilet al"ın altında, adımlar kalıcı; arama durak ipuçlarını kapsar; üç "when" doğru ekranda', async ({ page, context }) => {
  await page.goto('./#/trip/__ornek__/day/0/stop/2');
  const ticketBtn = page.getByRole('link', { name: /Bilet al/ });
  const ticketTip = page.getByTestId('tips-ticket').getByTestId('tip');
  await expect(ticketTip).toContainText('Bileti nasıl alırım?');
  const yb = (await ticketBtn.boundingBox())!.y;
  const yt = (await ticketTip.boundingBox())!.y;
  expect(yt).toBeGreaterThan(yb);
  const steps = ticketTip.getByTestId('tip-step');
  await expect(steps).toHaveCount(4);
  await steps.nth(0).check();
  await steps.nth(2).check();
  await page.reload();
  await expect(page.getByTestId('tips-ticket').getByTestId('tip-step').nth(0)).toBeChecked();
  await expect(page.getByTestId('tips-ticket').getByTestId('tip-step').nth(1)).not.toBeChecked();
  await expect(page.getByTestId('tips-ticket').getByTestId('tip-step').nth(2)).toBeChecked();
  await expect(page.getByTestId('tips-ticket').getByTestId('tip-url')).toHaveAttribute('href', 'https://example.com/ornek/kule-bileti');
  await page.getByTestId('tips-ticket').getByTestId('tip-listen').click();
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Bileti nasıl alırım?');

  // gezi ipuçları: türe göre gruplar; arama duraklardakileri de bulur
  await page.goto('./#/trip/__ornek__/tips');
  await expect(page.getByTestId('tip-group')).toHaveCount(6);
  await expect(page.getByTestId('tip-group').first()).toHaveAttribute('data-kind', 'transport');
  await page.getByTestId('tips-search').fill('çanta');
  await expect(page.getByTestId('tip')).toHaveCount(1);
  await expect(page.getByTestId('tip')).toContainText('Durak: ÖRNEK Saat Kulesi');
  await page.getByTestId('tips-search').fill('bahsis');
  await expect(page.getByTestId('tip')).toHaveCount(1);
  await page.getByTestId('tips-search').fill('olmayan sözcük');
  await expect(page.getByText('Bu aramayla ipucu bulunamadı.')).toBeVisible();

  // before-trip → Hazırlık listesi; on-arrival → Varış
  await page.goto('./#/trip/__ornek__/checklist');
  const before = page.getByTestId('tips-before').getByTestId('tip');
  await expect(before.filter({ hasText: 'Pazartesi neler kapalı?' })).toHaveCount(1);
  await expect(before.filter({ hasText: 'Bileti nasıl alırım?' })).toHaveCount(1);
  await expect(before.filter({ hasText: 'Bahşiş' })).toHaveCount(0);
  await page.goto('./#/trip/__ornek__/arrival');
  await expect(page.getByTestId('tips-arrival').getByTestId('tip')).toContainText('Şehir içi bileti');

  // on-site → tur modunda durağa varınca kart (kendiliğinden okunmaz)
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 44.4938 + 90 / 111320, longitude: 11.3426 });
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await context.setGeolocation({ latitude: 44.4938 + 10 / 111320, longitude: 11.3426 });
  await expect(page.getByTestId('tips-onsite')).toContainText('Çeşmenin suyu içilir mi?');
  expect((await spoken(page)).join(' ')).not.toContain('Çeşmenin suyu içilir mi?');
});

test('C: tanıtım kartları kapatılır ve Ayarlar’dan yeniden açılır', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('onboarding-card')).toHaveCount(4);
  await page.getByTestId('onboarding-card').first().getByRole('button').click();
  await expect(page.getByTestId('onboarding-card')).toHaveCount(3);
  await page.getByTestId('onboarding-close-all').click();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('onboarding')).toHaveCount(0);
  await page.goto('./#/settings');
  await page.getByTestId('onboarding-reopen').click();
  await page.goto('./');
  await expect(page.getByTestId('onboarding-card')).toHaveCount(4);
});

// ---------------------------------------------------------------- Aşama D: etkinlikler
test('D: etkinlikler sekmesi süzgeçleri; çok günlü etkinlik doğru günde; çakışma uyarısı', async ({ page }) => {
  await page.goto('./#/trip/__ornek__/events');
  await expect(page.getByTestId('events-day')).toHaveCount(2);
  await expect(page.getByTestId('events-multi').getByTestId('event')).toHaveCount(2);
  await expect(page.getByTestId('event').filter({ hasText: 'ÖRNEK Avlu Konseri' }).getByTestId('recommended')).toBeVisible();
  await expect(page.getByTestId('event').filter({ hasText: 'ÖRNEK Avlu Konseri' }).getByTestId('availability')).toContainText('tükenmek üzere');
  await page.getByTestId('f-free').check();
  await expect(page.getByTestId('event').filter({ hasText: 'ÖRNEK Avlu Konseri' })).toHaveCount(0);
  await expect(page.getByTestId('event').filter({ hasText: 'ÖRNEK Fener Yürüyüşü' })).toHaveCount(1);
  await page.getByTestId('f-free').uncheck();
  await page.getByTestId('f-rec').check();
  await expect(page.getByTestId('event').filter({ hasText: 'ÖRNEK Fener Yürüyüşü' })).toHaveCount(0);
  await page.getByTestId('f-rec').uncheck();
  await page.getByTestId('f-kind').selectOption('exhibition');
  await expect(page.getByTestId('event')).toHaveCount(1);
  await page.getByTestId('f-kind').selectOption('all');
  // 1. gün: sergi var, festival yok; 2. gün: ikisi de
  await page.getByTestId('f-day').selectOption('0');
  await expect(page.getByTestId('events-multi').getByTestId('event')).toHaveCount(1);
  await expect(page.getByTestId('events-multi')).toContainText('Eski Haritalar');
  await page.getByTestId('f-day').selectOption('1');
  await expect(page.getByTestId('events-multi').getByTestId('event')).toHaveCount(2);
  await page.getByTestId('f-day').selectOption('all');
  await page.getByTestId('f-time-day').click();
  await expect(page.getByTestId('events-day')).toHaveCount(0);
  await page.getByTestId('f-time-all').click();
  // çakışma: iki akşam etkinliği seçilince
  const konser = page.getByTestId('event').filter({ has: page.getByRole('heading', { name: 'ÖRNEK Avlu Konseri' }) });
  const fener = page.getByTestId('event').filter({ has: page.getByRole('heading', { name: 'ÖRNEK Fener Yürüyüşü' }) });
  await konser.getByTestId('going').click();
  await expect(konser.getByTestId('conflict')).toHaveCount(0);
  await fener.getByTestId('going').click();
  await expect(konser.getByTestId('conflict')).toContainText('Seçtiğiniz etkinlik: ÖRNEK Fener Yürüyüşü');
  await expect(konser.getByTestId('conflict')).toContainText('Plan notu');
});

test('D: "Bu akşam" kartı 16:00 sonrası, geri sayım; etkinlik bitince otele dön; geçmiş etkinlik soluk; harita katmanı', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2027, 4, 14, 15, 0));
  await page.goto('./#/trip/__ornek__/today');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByTestId('tonight')).toHaveCount(0);
  await page.clock.setFixedTime(new Date(2027, 4, 14, 18, 0));
  await page.reload();
  await expect(page.getByTestId('tonight')).toHaveAttribute('data-mode', 'picks');
  await expect(page.getByTestId('tonight-pick').first()).toContainText('ÖRNEK Avlu Konseri'); // rehberin seçimi başta
  await page.goto('./#/trip/__ornek__/events');
  await page.getByTestId('event').filter({ hasText: 'ÖRNEK Avlu Konseri' }).getByTestId('going').click();
  await page.goto('./#/trip/__ornek__/today');
  await expect(page.getByTestId('tonight')).toHaveAttribute('data-mode', 'chosen');
  await expect(page.getByTestId('tonight-countdown')).toHaveText('Başlamasına 3 sa 00 dk');
  await expect(page.getByTestId('tonight-directions')).toHaveAttribute('href', /maps\.apple\.com/);
  await page.clock.setFixedTime(new Date(2027, 4, 14, 22, 45));
  await page.reload();
  await expect(page.getByTestId('after-event')).toContainText('ÖRNEK Avlu Konseri bitti');
  await page.goto('./#/trip/__ornek__/day/0');
  await expect(page.getByTestId('event').filter({ hasText: 'ÖRNEK Avlu Konseri' })).toHaveAttribute('data-past', 'true');
  // harita katmanı açılıp kapanır
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  const withEvents = Number(await map.getAttribute('data-points'));
  await page.getByTestId('event-layer').uncheck();
  await expect.poll(async () => Number(await map.getAttribute('data-points'))).toBe(withEvents - 3); // E1, E2, H1
});

// ---------------------------------------------------------------- Aşama E: keşfet, kaydet, rotama ekle
test('E: keşfet yeri kaydedilir, güne eklenir; numaralar, harita ve tur modu yeni sırayı izler; plan güncellenince korunur; özgün plana dön', async ({ page, context }) => {
  const p = { ...sample(), id: 'rota-gezi', title: 'ÖRNEK Rota Gezisi' };
  await importPlan(page, p);
  await page.goto('./#/trip/rota-gezi/discover');
  await expect(page.getByTestId('place')).toHaveCount(5);
  await page.getByTestId('cat-shop').click();
  const kitapci = page.getByTestId('place');
  await expect(kitapci).toHaveCount(1);
  await kitapci.getByTestId('save').click();
  await expect(kitapci.getByTestId('save')).toHaveAttribute('aria-pressed', 'true');
  await kitapci.getByTestId('place-add').click();
  const dlg = page.getByTestId('add-route');
  await expect(dlg.getByTestId('add-day')).toHaveValue('0'); // önerilen gün
  await expect(dlg.getByTestId('add-between')).toContainText('ÖRNEK Kent Müzesi ile ÖRNEK Çeşme Sokağı arasına girer.');
  await expect(dlg.getByTestId('add-walk')).toContainText('Ek yürüyüş yaklaşık');
  await dlg.getByTestId('add-confirm').click();
  await expect(page.getByText('ÖRNEK Kitapçı Avlusu 1. güne eklendi.')).toBeVisible();

  await page.goto('./#/trip/rota-gezi/day/0');
  const map = page.getByTestId('map');
  await expect(map).not.toHaveAttribute('data-renderer', 'loading');
  await expect(map.locator('.mk-stop')).toHaveCount(6);
  await expect(map.locator('.mk-added')).toHaveCount(1);
  await expect(map.locator('.mk-added')).toHaveText('4');
  await expect(page.getByTestId('stop-link').nth(3)).toContainText('ÖRNEK Kitapçı Avlusu');
  await expect(page.getByTestId('stop-link').nth(4)).toContainText('ÖRNEK Çeşme Sokağı');
  await page.goto('./#/trip/rota-gezi/day/0/stop/4');
  await expect(page.getByTestId('added-badge')).toBeVisible();
  await expect(page.getByTestId('narration')).toContainText('üç küçük kitapçının');
  await page.goto('./#/trip/rota-gezi/day/0/tour');
  await expect(page.getByTestId('tour-stop')).toHaveCount(6);
  await expect(page.getByTestId('tour-stop').nth(3)).toContainText('ÖRNEK Kitapçı Avlusu');

  // Kaydettiklerim: liste, not, rotada rozeti
  await page.goto('./#/trip/rota-gezi/saved');
  await expect(page.getByTestId('saved-item')).toHaveCount(1);
  await expect(page.getByTestId('saved-item')).toContainText('1. günün rotasında');

  // plan güncellenir: ekleme korunur
  const up = { ...p, days: p.days.map((d: Record<string, unknown>, i: number) => (i === 0 ? { ...d, title: 'Yeni başlık' } : d)) };
  await importPlan(page, up, true);
  await page.goto('./#/trip/rota-gezi/day/0');
  await expect(page.getByTestId('stop-link')).toHaveCount(6);
  // bağlandığı durak (Kent Müzesi) plandan çıkarsa günün sonuna alınır ve bildirilir
  const cut = structuredClone(p);
  cut.days[0].stops = cut.days[0].stops.filter((s: { id: string }) => s.id !== 'ornek-kent-muzesi').map((s: Record<string, unknown>, i: number) => ({ ...s, order: i + 1 }));
  cut.days[0].timeline = cut.days[0].timeline.filter((x: { stopOrder: number | null }) => x.stopOrder !== 3).map((x: { stopOrder: number | null }) => ({ ...x, stopOrder: x.stopOrder && x.stopOrder > 3 ? x.stopOrder - 1 : x.stopOrder }));
  await importPlan(page, cut, true);
  await page.goto('./#/trip/rota-gezi/day/0');
  await expect(page.getByTestId('route-orphaned')).toContainText('ÖRNEK Kitapçı Avlusu');
  await expect(page.getByTestId('stop-link').last()).toContainText('ÖRNEK Kitapçı Avlusu');
  await importPlan(page, p, true);

  // elle sıralama ve kaldırma, özgün plana dön
  await page.goto('./#/trip/rota-gezi/day/0');
  await page.getByTestId('route-edit').click();
  await page.getByTestId('route-item').nth(3).getByTestId('route-up').click();
  await expect(page.getByTestId('stop-link').nth(2)).toContainText('ÖRNEK Kitapçı Avlusu');
  await page.getByTestId('route-reset').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('stop-link')).toHaveCount(5);
  await expect(page.getByTestId('stop-link').nth(1)).toContainText('ÖRNEK Saat Kulesi');
  void context;
});

test('E: kendi yerim bağlantıyla eklenir ve rotaya girer; tur modunda adı ve notu okunur; plancıya gönder', async ({ page, context }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }));
  await page.goto('./#/trip/__ornek__/saved');
  await page.getByTestId('own-open').click();
  // 5. durağın (Manastır Bahçesi) hemen yanı
  await page.getByTestId('own-link').fill('https://maps.apple.com/?ll=44.50324,11.34720&q=Pin');
  await expect(page.getByTestId('own-picked')).toContainText('44.50324, 11.34720');
  await page.getByTestId('own-name').fill('Benim kafem');
  await page.getByTestId('own-note').fill('Limonlu kek');
  await page.getByTestId('own-save').click();
  const dlg = page.getByTestId('add-route');
  await dlg.getByTestId('add-day').selectOption('0');
  await expect(dlg.getByTestId('add-between')).toContainText('ÖRNEK Manastır Bahçesi');
  await dlg.getByTestId('add-confirm').click();
  await page.goto('./#/trip/__ornek__/day/0');
  await expect(page.getByTestId('stop-link')).toHaveCount(6);
  await expect(page.getByTestId('stop-link').last()).toContainText('Benim kafem');
  // tur modunda yalnız ad ve not okunur
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 44.50324 + 100 / 111320, longitude: 11.3472 });
  await page.goto('./#/trip/__ornek__/day/0/tour');
  await page.getByRole('button', { name: '↺ Turu baştan al' }).click();
  await page.getByTestId('start-tour').click();
  await context.setGeolocation({ latitude: 44.50324, longitude: 11.3472 });
  await expect.poll(async () => (await spoken(page)).join(' ')).toContain('Benim kafem. Limonlu kek');
  // plancıya gönder: liste panoya
  await page.goto('./#/trip/__ornek__/saved');
  await page.getByTestId('planner-share').click();
  await expect(page.getByText('Panoya kopyalandı.')).toBeVisible();
});

test('E: Yakınımda Vikipedi maddelerini kaynağıyla gösterir, kaydedilir; ağ kapalıyken Keşfet ve Kaydettiklerim açılır, Yakınımda "internet gerekli"', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 44.4938, longitude: 11.3426 });
  await context.route('**/tr.wikipedia.org/w/api.php**', (r) => {
    const u = new URL(r.request().url());
    if (u.searchParams.get('generator') !== 'geosearch') return r.abort();
    return r.fulfill({
      json: {
        query: {
          pages: {
            1: { pageid: 1, title: 'Örnek Madde Bir', extract: 'Birinci maddenin özeti.', coordinates: [{ lat: 44.4941, lon: 11.3426 }] },
            2: { pageid: 2, title: 'Örnek Madde İki', extract: 'İkinci madde.', coordinates: [{ lat: 44.4938, lon: 11.3436 }] },
            3: { pageid: 3, title: 'Örnek Madde Üç', extract: 'Üçüncü.', coordinates: [{ lat: 44.4958, lon: 11.3426 }] },
          },
        },
      },
    });
  });
  await page.goto('./#/trip/__ornek__/nearby');
  await page.getByTestId('nearby-find').click();
  const items = page.getByTestId('wiki-item');
  await expect(items).toHaveCount(3);
  await expect(items.first()).toContainText('Örnek Madde Bir');
  await expect(items.first()).toContainText(/3[0-9] m uzakta/);
  await expect(items.first().getByTestId('wiki-source')).toHaveText('Kaynak: Vikipedi (TR), “Örnek Madde Bir”, CC BY-SA 4.0');
  await expect(page.getByText('Rehber anlatımı değildir')).toBeVisible();
  await items.first().getByTestId('save').click();
  await page.goto('./#/trip/__ornek__/saved');
  await expect(page.getByTestId('saved-item')).toContainText('CC BY-SA 4.0');

  await context.setOffline(true);
  await page.goto('./#/trip/__ornek__/discover');
  await expect(page.getByTestId('place')).toHaveCount(5);
  await page.goto('./#/trip/__ornek__/saved');
  await expect(page.getByTestId('saved-item')).toHaveCount(1);
  await page.goto('./#/trip/__ornek__/nearby');
  await expect(page.getByTestId('nearby-offline')).toContainText('İnternet gerekli');
  await context.setOffline(false);
});
