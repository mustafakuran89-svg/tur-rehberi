import { defineConfig, devices } from '@playwright/test';

// Uçtan uca testler: iPhone ekran boyutunda Chromium ve WebKit.
// Üretim derlemesi `vite preview` ile sunulur (service worker yalnız üretim derlemesinde çalışır).
const iphone = devices['iPhone 13'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/tur-rehberi/',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-chromium', use: { ...iphone, browserName: 'chromium', defaultBrowserType: 'chromium' } },
    { name: 'iphone-webkit', use: { ...iphone, browserName: 'webkit', defaultBrowserType: 'webkit' } },
  ],
  webServer: {
    command: 'npm run build && node scripts/e2e-region.mjs && npm run preview',
    url: 'http://localhost:4173/tur-rehberi/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
