import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'pwa-update.spec.mjs',
  timeout: 45_000,
  expect: { timeout: 7_500 },
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4176' },
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: true,
    timeout: 30_000
  },
  projects: [
    { name: 'chromium-saved-app', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-iphone', use: { ...devices['iPhone 14 Pro Max'] } }
  ]
});
