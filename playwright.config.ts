import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/** WebKit runs when the browser and libxslt are installed. CI uses `playwright install --with-deps webkit`. */
function webkitInstalled(): boolean {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache', 'ms-playwright');
  let present = false;
  try {
    present = readdirSync(root).some((name) => name.startsWith('webkit-'));
  } catch {
    return false;
  }
  if (!present) return false;
  return (
    existsSync('/usr/lib/x86_64-linux-gnu/libxslt.so.1') || existsSync('/lib/x86_64-linux-gnu/libxslt.so.1')
  );
}

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  globalTimeout: process.env.GITHUB_ACTIONS ? 25 * 60 * 1000 : 0,
  expect: { timeout: 15_000 },
  reporter: process.env.GITHUB_ACTIONS ? [['line'], ['github']] : [['line']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.CI
      ? 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort'
      : 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    },
    {
      name: 'iphone',
      use: {
        browserName: 'chromium',
        userAgent: devices['iPhone 13'].userAgent,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'landscape',
      use: {
        browserName: 'chromium',
        userAgent: devices['iPhone 15 landscape'].userAgent,
        viewport: { width: 844, height: 390 },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      },
    },
    ...(webkitInstalled()
      ? [
          {
            name: 'landscape-webkit',
            use: {
              ...devices['iPhone 15 landscape'],
              browserName: 'webkit' as const,
              deviceScaleFactor: 1,
            },
          },
        ]
      : []),
  ],
});
