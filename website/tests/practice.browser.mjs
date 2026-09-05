// Broad user journeys against disposable local state, never production accounts.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { chromium, expect } from '@playwright/test';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/);
const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin, 'CF-Connecting-IP': `practice-${Date.now()}` } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.clock.install();
  await page.goto(origin + '/play');
  await page.getByRole('link', { name: 'Typearchy home', exact: true }).click();
  await expect(page).toHaveURL(origin + '/');
  // The embedded homepage game must fit its labels as well as accept clicks.
  for (const width of [390, 800, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const seconds of [15, 30, 60]) {
      const button = page.getByRole('button', { name: `${seconds}s`, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.metrics > span').last()).toContainText(String(seconds));
      assert.ok(await button.evaluate(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        const text = range.getBoundingClientRect(), box = element.getBoundingClientRect();
        return box.width >= 44 && text.left >= box.left + 6 && text.right <= box.right - 6;
      }), `Duration label fits its button at ${width}px`);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Homepage fits at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: 'PLAY', exact: true }).click();
  await expect(page).toHaveURL(origin + '/play');
  const input = page.locator('.demo-input');
  const prompt = page.locator('.live-prompt');
  for (const mode of ['SPRINT', 'DAILY', 'QUOTE', 'SHELL', 'CODE', 'DRILL', 'CUSTOM']) {
    await page.getByLabel('Practice mode', { exact: true }).selectOption(mode.toLowerCase());
    if (mode === 'CUSTOM') {
      await page.getByLabel('CUSTOM PASSAGE', { exact: true }).fill('red blue');
      await page.getByRole('button', { name: 'APPLY PASSAGE' }).click();
    }
    const text = await prompt.getAttribute('aria-label');
    assert.ok(text.length, `${mode} has a passage`);
    await input.pressSequentially(text.slice(0, 3));
    await expect(page.locator('.demo-callout')).toHaveText('KEEP THE PACE');
    await page.getByRole('button', { name: 'Restart practice', exact: true }).click();
    await expect(page.locator('.demo-callout')).toHaveText('CLICK HERE, THEN START TYPING');
    if (['DAILY', 'QUOTE', 'DRILL', 'CUSTOM'].includes(mode)) {
      const passage = text.replace(/\n/g, '');
      await input.pressSequentially(passage.slice(0, 1));
      await page.clock.runFor(30000);
      await input.pressSequentially(passage.slice(1));
      await expect(page.locator('.web-game-result')).toBeVisible();
      await expect(page.locator('.practice-feedback')).not.toHaveAttribute('open');
      await page.getByText('Practice tips & mistype drills', { exact: true }).click();
      await expect(page.locator('.practice-feedback')).toHaveAttribute('open');
      await page.getByRole('button', { name: 'NEW TEST', exact: true }).click();
    }
    if (mode === 'SHELL') {
      await page.getByRole('button', { name: '15s', exact: true }).click();
      await input.pressSequentially((await prompt.getAttribute('aria-label')).slice(0, 3));
      await page.clock.runFor(15500);
      await expect(page.locator('.web-game-result')).toBeVisible();
      await page.getByRole('button', { name: 'NEW TEST', exact: true }).click();
    }
    console.log(`${mode}: selection, keyboard input, restart passed`);
  }
  await page.getByLabel('Practice mode', { exact: true }).selectOption('code');
  for (const language of ['BASH', 'PYTHON', 'JS', 'RUST', 'RUBY']) {
    await page.getByRole('button', { name: language, exact: true }).click();
    assert.ok((await prompt.getAttribute('aria-label')).includes('\n'), `${language} contains code`);
    await input.pressSequentially((await prompt.getAttribute('aria-label')).slice(0, 3));
    await page.clock.runFor(30500);
    await expect(page.locator('.web-game-result')).toBeVisible();
    await page.getByRole('button', { name: 'NEW TEST', exact: true }).click();
  }
  await page.getByLabel('Practice mode', { exact: true }).selectOption('sprint');
  for (const style of ['Words', 'Passages']) {
    await page.getByRole('button', { name: style, exact: true }).click();
    for (const seconds of [15, 30, 60]) {
      await page.getByRole('button', { name: `${seconds}s`, exact: true }).click();
      await input.pressSequentially((await prompt.getAttribute('aria-label')).slice(0, 3));
      await page.clock.runFor(seconds * 1000 + 500);
      await expect(page.locator('.web-game-result')).toBeVisible();
      await expect(page.getByRole('button', { name: 'SHARE RESULT', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'NEW TEST', exact: true }).click();
    }
  }
  // Pausing freezes time, preserves input, and never produces a shareable best.
  await page.getByRole('button', { name: '15s', exact: true }).click();
  await input.pressSequentially((await prompt.getAttribute('aria-label')).slice(0, 3));
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading', { name: 'Practice paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume practice' }).click();
  await input.press('Escape');
  await expect(page.getByRole('heading', { name: 'Practice paused' })).toBeVisible();
  await page.clock.runFor(60000);
  await expect(page.locator('.web-game-result')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume practice' }).click();
  await page.clock.runFor(15500);
  await expect(page.locator('.web-game-result')).toContainText('PAUSED PRACTICE');
  await expect(page.getByRole('button', { name: 'SHARE RESULT', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^History/ }).click();
  await page.locator('.web-game-history-list button').first().click();
  await expect(page.locator('.web-game-result')).toContainText('PAUSED PRACTICE');

  // A saved result survives a failed share and inline profile creation.
  await page.getByRole('button', { name: /^History/ }).click();
  await page.locator('.web-game-history-list button').nth(1).click();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'SHARE RESULT', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Your result is saved');
  await expect(page.locator('.web-game-result')).toBeVisible();
  await context.setOffline(false);
  await page.getByRole('button', { name: 'SHARE RESULT', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your profile.' })).toBeVisible();
  if (process.env.TYPEARCHY_REVIEW_DIR) {
    mkdirSync(process.env.TYPEARCHY_REVIEW_DIR, { recursive: true });
    await page.locator('.competition-account').screenshot({ path: process.env.TYPEARCHY_REVIEW_DIR + '/inline-profile.png' });
    for (const size of [{width:390,height:700},{width:800,height:600}]) {
      await page.setViewportSize(size);
      const form = page.locator('.competition-account');
      await expect(form).toBeVisible();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Page must fit the viewport');
      await form.screenshot({path:process.env.TYPEARCHY_REVIEW_DIR + `/profile-${size.width}.png`});
    }
    await page.setViewportSize({width:1280,height:720});
  }
  await expect(page.getByRole('button', { name: 'SHARE RESULT', exact: true })).toBeDisabled();
  // A stale signed-out response must not undo registration or hide its recovery code.
  let releaseRefresh;
  let refreshStarted;
  const blockedRefresh = new Promise(resolve => { releaseRefresh = resolve; });
  const refreshPending = new Promise(resolve => { refreshStarted = resolve; });
  await page.route('**/api/session', async route => {
    if (route.request().method() !== 'GET') { await route.continue(); return; }
    const response = await route.fetch();
    refreshStarted();
    await blockedRefresh;
    await route.fulfill({ response });
  });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await refreshPending;
  const handle = 'practice_' + Date.now().toString(36);
  await page.getByLabel('Public handle', { exact: true }).fill(handle);
  await page.getByRole('button', { name: 'Create profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: '@' + handle })).toBeVisible();
  const staleResponse = page.waitForResponse(response => response.url().endsWith('/api/session') && response.request().method() === 'GET');
  releaseRefresh();
  await staleResponse;
  await page.waitForTimeout(100);
  await expect(page.getByRole('heading', { name: '@' + handle })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Save your recovery code.' })).toBeVisible();
  await page.unroute('**/api/session');
  await page.getByLabel('I saved my recovery code').check();
  await page.getByRole('button', { name: 'Back to my result' }).click();
  await page.getByRole('button', { name: 'SHARE RESULT', exact: true }).click();
  await expect(page.getByRole('link', { name: 'VIEW RESULT' })).toBeVisible();
  assert.equal((await context.request.delete(origin + '/api/profile')).status(), 200);

  // Creating a challenge keeps the passage beside profile setup, too.
  await page.goto(origin + '/challenges/new');
  const originalPassage = await page.getByLabel('Passage', {exact:true}).inputValue();
  await page.getByRole('button', {name:'Save and get the link',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Create your profile.'})).toBeVisible();
  await page.getByLabel('Public handle', {exact:true}).fill('author_' + Date.now().toString(36));
  await page.getByRole('button', {name:'Create profile',exact:true}).click();
  await page.getByLabel('I saved my recovery code').check();
  await page.getByRole('button', {name:'Back to my challenge'}).click();
  assert.equal(await page.getByLabel('Passage', {exact:true}).inputValue(), originalPassage);
  await page.getByRole('button', {name:'Save and get the link',exact:true}).click();
  await expect(page).toHaveURL(/\/c\/[a-z0-9]{12}$/);
  assert.equal((await context.request.delete(origin + '/api/profile')).status(), 200);

  // App-first setup connects this browser and the original device together.
  const token = 'tpy_' + randomBytes(32).toString('hex');
  const start = await context.request.post(origin + '/api/connect/start', { data: { token, label: 'Local app test' } });
  assert.equal(start.status(), 201);
  const { code } = await start.json();
  await page.goto(origin + '/connect?code=' + code);
  await page.getByLabel('PUBLIC HANDLE').fill('app_' + Date.now().toString(36));
  await page.getByRole('button', { name: 'CREATE PROFILE', exact: true }).click();
  await expect(page.getByText(/Your app and this browser are connected/)).toBeVisible();
  const session = await (await context.request.get(origin + '/api/session')).json();
  assert.ok(session.handle);
  const device = await (await context.request.get(origin + '/api/device', { headers: { Authorization: 'Bearer ' + token } })).json();
  assert.equal(device.handle, session.handle);
  await page.goto(origin + '/account');
  await page.getByText('Connect another browser', { exact: true }).click();
  await page.getByRole('button', { name: 'Get connection code' }).click();
  const codeDisplay = page.locator('.competition-recovery code');
  await expect(codeDisplay).toBeVisible();
  const another = await browser.newContext({ extraHTTPHeaders: { Origin: origin } });
  try {
    const other = await another.newPage();
    await other.goto(origin + '/account');
    await other.getByText('Use an existing profile', { exact: true }).click();
    await other.getByLabel('Connection code', { exact: true }).fill(await codeDisplay.textContent());
    await other.getByRole('button', { name: 'Connect this browser', exact: true }).click();
    await expect(other.getByRole('heading', { name: '@' + session.handle })).toBeVisible();
    assert.equal((await (await context.request.get(origin + '/api/device', { headers: { Authorization: 'Bearer ' + token } })).json()).handle, session.handle);
  } finally { await another.close(); }
  assert.equal((await context.request.delete(origin + '/api/profile')).status(), 200);
  assert.deepEqual(errors, []);
  console.log('All modes, all code languages, sprint durations, paused history, inline sharing, and app/browser connection passed.');
} finally {
  await context.request.delete(origin + '/api/profile');
  await browser.close();
}
