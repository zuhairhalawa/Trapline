import { defineConfig } from '@playwright/test';

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}/Trapline/`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: BASE, trace: 'off' },
  // Real production build served by vite preview; started and stopped by this command.
  webServer: {
    command: 'npm run build && npm run preview',
    url: BASE,
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 }, browserName: 'chromium' } },
    {
      name: 'mobile',
      // Chromium device emulation (touch + mobile viewport); NOT a real device.
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, browserName: 'chromium' },
    },
  ],
});
