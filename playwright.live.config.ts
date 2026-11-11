import { defineConfig, devices } from '@playwright/test';

// Yayımlanmış adrese karşı kısa duman testi. Adres TUR_LIVE_URL ile verilir.
const url = process.env.TUR_LIVE_URL;
if (!url) throw new Error('TUR_LIVE_URL tanımlı değil');

export default defineConfig({
  testDir: 'e2e',
  testMatch: /smoke\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: { baseURL: url, locale: 'tr-TR' },
  projects: [
    { name: 'live-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' } },
    { name: 'live-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit', defaultBrowserType: 'webkit' } },
  ],
});
