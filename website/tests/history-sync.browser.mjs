// Keeping practice history on the account, through the real History page: a local run, an explicit
// sync, the account copy read back, and a second press that changes nothing.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/);
const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin, 'CF-Connecting-IP': `sync-${Date.now()}` } });
const page = await context.newPage();
const suffix = Date.now().toString(36);
try {
  // A run on this device, saved locally and with no account in sight.
  await page.goto(origin + '/play');
  const mode = page.getByLabel('Practice mode', { exact: true });
  await expect(mode).toBeEnabled({ timeout: 20000 });
  await mode.selectOption('custom');
  await page.getByLabel('CUSTOM PASSAGE', { exact: true }).fill('red blue');
  await page.getByRole('button', { name: 'APPLY PASSAGE' }).click();
  await page.locator('.demo-input').pressSequentially('red blue');
  await expect(page.locator('.demo-result-card')).toBeVisible({ timeout: 15000 });

  // Signing in is separate from playing: the History page offers the copy, it does not take it.
  const registered = await context.request.post(origin + '/api/session', { data: { handle: `sync_${suffix}` } });
  assert.equal(registered.status(), 201, await registered.text());

  await page.goto(origin + '/history');
  const keep = page.getByRole('button', { name: 'Keep this device’s history' });
  await expect(keep).toBeEnabled({ timeout: 15000 });
  await expect(page.getByText('Your account is not keeping any practice history yet.')).toBeVisible();

  await keep.click();
  await expect(page.getByRole('status').filter({ hasText: /Kept 1 run on your account/ })).toBeVisible({ timeout: 15000 });
  const rows = page.locator('.account-history-list li');
  await expect(rows).toHaveCount(1, { timeout: 15000 });
  await expect(rows.first()).toContainText('WPM');

  // Pressing it again is safe, which is what the client id on each row buys.
  await page.getByRole('button', { name: 'Keep this device’s history' }).click();
  await expect(page.getByRole('status').filter({ hasText: /Nothing new/ })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.account-history-list li')).toHaveCount(1);

  // The stored copy carries scores, not typing: no prompt text reaches the account copy.
  const listed = await (await context.request.get(origin + '/api/account/history')).json();
  assert.equal(listed.runs.length, 1);
  assert.equal(listed.runs[0].mode, 'custom');
  assert.equal(typeof listed.runs[0].wpm, 'number');
  assert.equal(JSON.stringify(listed.runs[0]).includes('prompt'), false, 'the row carries no prompt field');
  assert.equal(JSON.stringify(listed.runs[0]).includes('keystroke'), false, 'the row carries no keystroke field');
  assert.equal(JSON.stringify(listed.runs[0]).includes('red blue'), false, 'the typed passage never reaches the account copy');
  assert.equal(await page.locator('.account-history-list li').count(), 1);

  // One page with three labelled sources, and the deep link private results use still lands right.
  await expect(page.getByRole('button', { name: 'Everything' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'On this device' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your challenge results' })).toBeVisible();
  await page.getByRole('button', { name: 'Your account' }).click();
  await expect(page.getByRole('heading', { name: 'On this device' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Kept on your account' })).toBeVisible();
  await page.goto(origin + '/history?view=challenges');
  await expect(page.getByRole('button', { name: 'Challenge results' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Kept on your account' })).toHaveCount(0);

  assert.equal((await context.request.delete(origin + '/api/profile')).status(), 200);
  console.log('Account history page passed: a local run, an explicit sync, the account copy read back, a second press adding nothing, and no prompt or keystroke fields in the stored row.');
} finally {
  await browser.close();
}
