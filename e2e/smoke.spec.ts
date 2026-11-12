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
  // tarayıcıdan aralıklı istek (parça parça indirme): ham bayt gelir
  const head = await page.evaluate(async (u) => {
    const r = await fetch(u, { headers: { Range: 'bytes=0-6' }, cache: 'no-store' });
    return { status: r.status, enc: r.headers.get('content-encoding'), range: r.headers.get('content-range'), text: new TextDecoder().decode(await r.arrayBuffer()) };
  }, new URL(`haritalar/${v.dosya}?v=${v.surum}`, baseURL).toString());
  console.log('aralık yanıtı', JSON.stringify(head));
  expect(head.status === 206 ? head.text : 'PMTiles').toBe('PMTiles');
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

// Gerçek Viyana bölge dosyasıyla (24 MB) uçtan uca deneme: yalnız TUR_LIVE_VIENNA=1 ile çalışır.
test('yayın: Viyana bölgesi indirilir, ağ kapalıyken harita yakın düzeyde yazılarıyla çizilir', async ({ page, context, browserName }) => {
  test.skip(!process.env.TUR_LIVE_VIENNA, 'TUR_LIVE_VIENNA=1 ile çalışır');
  test.setTimeout(240_000);
  const { readFileSync } = await import('node:fs');
  const plan = JSON.parse(readFileSync('src/sample/ornek-plan.json', 'utf8'));
  // Örnek geziyi Viyana merkezine taşı (bütün koordinatlar aynı farkla)
  const dLat = 48.2082 - 44.4938;
  const dLng = 16.3738 - 11.3426;
  const move = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(move);
    if (x && typeof x === 'object') {
      const o = Object.fromEntries(Object.entries(x).map(([k, v]) => [k, move(v)])) as Record<string, unknown>;
      for (const [a, b] of [['lat', 'lng'], ['hubLat', 'hubLng']]) if (typeof o[a] === 'number' && typeof o[b] === 'number') {
        o[a] = (o[a] as number) + dLat;
        o[b] = (o[b] as number) + dLng;
      }
      return o;
    }
    return x;
  };
  await page.goto('./');
  await page.evaluate(async () => navigator.serviceWorker && (await navigator.serviceWorker.ready));
  await page.reload();
  await page.getByTestId('import-link').click();
  await page.getByTestId('paste').fill(JSON.stringify({ ...(move(plan) as object), id: 'viyana-deneme', title: 'ÖRNEK Viyana denemesi' }));
  await page.getByTestId('paste-import').click();
  await expect(page.getByTestId('import-ok')).toContainText('kaydedildi');
  await page.goto('./#/trip/viyana-deneme/prepare');
  await expect(page.getByTestId('prep-region')).toContainText('Viyana bölgesi, yaklaşık 24,1 MB');
  await page.getByTestId('prepare-start').click();
  await page.getByTestId('confirm-ok').click();
  await expect(page.getByTestId('prepare-done')).toBeVisible({ timeout: 200_000 });
  await expect(page.getByTestId('check-map')).toContainText(/Harita hazır, \d+ karo, 24,1 MB/);
  console.log(browserName, await page.getByTestId('offline-check').innerText());
  await context.setOffline(true);
  await page.goto('./#/trip/viyana-deneme/day/0');
  await expect(page.getByTestId('map')).toHaveAttribute('data-basemap', 'region', { timeout: 20_000 });
  const r = await page.evaluate(
    () =>
      new Promise<{ features: number; labels: number }>((ok) => {
        const m = (window as unknown as { __tripMap: { jumpTo: (o: unknown) => void; loaded: () => boolean; areTilesLoaded: () => boolean; queryRenderedFeatures: () => { layer: { type: string } }[] } }).__tripMap;
        m.jumpTo({ center: [16.3738, 48.2082], zoom: 16 });
        const t0 = Date.now();
        const wait = () => {
          if ((m.loaded() && m.areTilesLoaded()) || Date.now() - t0 > 15000) {
            const f = m.queryRenderedFeatures();
            ok({ features: f.length, labels: f.filter((x) => x.layer.type === 'symbol').length });
          } else setTimeout(wait, 200);
        };
        setTimeout(wait, 300);
      }),
  );
  console.log(browserName, 'Viyana merkezi 16. düzey', JSON.stringify(r));
  expect(r.features).toBeGreaterThan(50);
  expect(r.labels).toBeGreaterThan(5); // sokak adları ve yazılar
  await context.setOffline(false);
});
