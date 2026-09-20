// The offline promise: the app shell loads with no network, practice still runs, a finished run is
// saved locally, and API calls are never answered from a cache.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/);
const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin, 'CF-Connecting-IP': `pwa-${Date.now()}` } });
const page = await context.newPage();
try {
  await page.goto(origin + '/play');
  // The service worker installs, and claims this page, without a second load.
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 20000 });

  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  assert.equal(manifest.start_url, '/play');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'), 'the manifest offers a 192px icon');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'), 'the manifest offers a 512px icon');
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'), 'the manifest offers a maskable icon');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Hydration offline means the cached shell brought its own scripts.
  const mode = page.getByLabel('Practice mode', { exact: true });
  await expect(mode).toBeEnabled({ timeout: 20000 });
  await expect(page.locator('.live-prompt')).toBeVisible();

  // Practice works with no network, and a finished run is saved on this device.
  await mode.selectOption('custom');
  await page.getByLabel('CUSTOM PASSAGE', { exact: true }).fill('red blue');
  await page.getByRole('button', { name: 'APPLY PASSAGE' }).click();
  const prompt = await page.locator('.live-prompt').getAttribute('aria-label');
  assert.equal(prompt, 'red blue');
  await page.locator('.demo-input').pressSequentially('red blue');
  await expect(page.locator('.demo-result-card')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /History/ })).toContainText('1', { timeout: 15000 });

  // The api is never served from a cache, offline or not.
  const apiAnswered = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      return response.ok;
    } catch {
      return false;
    }
  });
  assert.equal(apiAnswered, false, 'offline api calls must fail rather than come from a cache');

  console.log('Offline shell passed: the app loads with no network, practice runs and is saved locally, the manifest is installable, and api calls are never cached.');
} finally {
  await context.setOffline(false);
  await browser.close();
}
