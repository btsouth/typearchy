// Disposable local fixtures only. Exercise actual browser keyboard events.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/);
const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin } });
const page = await context.newPage();
const snippet = JSON.parse(readFileSync(new URL('../app/rubySnippets.json', import.meta.url))).find(x => x.id === 'rails-request-limiter-2024');
const playable = snippet.passage.replace(/\n +/g, '\n');
let registered = false;
try {
  const account = await context.request.post(origin + '/api/session', { data: { handle: 'keyboard_' + Date.now().toString(36) } });
  assert.equal(account.status(), 201); registered = true;
  const created = await context.request.post(origin + '/api/challenges', { data: {
    title: snippet.title, passage: snippet.passage, language: 'ruby', autoIndent: true,
    attribution: `${snippet.author}. Rails (MIT). ${snippet.sourceUrl}`, visibility: 'public',
  } });
  assert.equal(created.status(), 201);
  const { slug } = await created.json();
  await page.goto(origin + '/challenges');
  await expect(page.getByRole('button', {name:'Find challenges'})).toHaveCount(0);
  const search = page.getByRole('searchbox', {name:'Find a passage or player'});
  const language = page.getByRole('combobox', {name:'Language'});
  const searchBox = await search.boundingBox(); const languageBox = await language.boundingBox();
  assert.equal(searchBox.height, languageBox.height);
  assert.equal(searchBox.y, languageBox.y);
  await search.fill('no-matching-challenge-' + Date.now());
  await expect(page.getByRole('heading', {name:'No matching challenges.'})).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill('Rails');
  await expect(page.locator(`a[href="/c/${slug}"]`)).toBeVisible();
  await expect(search).toBeFocused();
  await language.selectOption('ruby');
  await expect(page).toHaveURL(/language=ruby/);
  await expect(search).toHaveValue('Rails');
  await page.getByRole('link', {name:'Clear filters', exact:true}).click();
  await expect(search).toHaveValue(''); await expect(language).toHaveValue('');
  await page.goto(origin + '/c/' + slug);
  await page.getByRole('button', {name:'Start challenge', exact:true}).click();
  const input = page.getByRole('textbox', {name:'Type the challenge passage'});
  await expect(input).toBeFocused();
  await page.keyboard.press('Tab'); await expect(input).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(input).toBeFocused();
  await page.keyboard.press('Escape'); await expect(input).not.toBeFocused();
  await page.locator('.competition-prompt').click(); await expect(input).toBeFocused();
  // A wrong space at the beginning must not look like a finished race at the end.
  await page.keyboard.type(playable.slice(0, 3), {delay: 7});
  await page.keyboard.press('Tab'); await expect(input).toBeFocused();
  await page.keyboard.type('_' + playable.slice(4), {delay: 7});
  await expect(page.locator('.competition-scoreboard')).toContainText('99');
  await expect(page.getByText('PASSAGE COMPLETE', {exact:true})).toHaveCount(0);
  await expect(page.locator('.competition-prompt .incorrect')).toContainText('·');
  await expect(page.getByRole('button', {name:'Erase back to first mistake'})).toBeInViewport();
  await page.getByRole('button', {name:'Erase back to first mistake'}).click();
  await expect(input).toBeFocused();
  await page.keyboard.type(playable.slice(3, -1), {delay: 7});
  await expect(page.getByText('PASSAGE COMPLETE', {exact:true})).toHaveCount(0);
  await page.keyboard.type(playable.slice(-1));
  await expect(page.getByText('PASSAGE COMPLETE', {exact:true})).toBeVisible();
  await expect(page.getByRole('button', {name:'Publish my result'})).toBeVisible();
  const timer = page.locator('.competition-scoreboard strong').first();
  const finished = await timer.textContent();
  await page.waitForTimeout(250);
  assert.equal(await timer.textContent(), finished, 'Clock must freeze at the final input');
  await expect(page.locator('.competition-result-details')).toContainText('1 mistake corrected');
  console.log('Browser Ruby race passed: blank lines, auto-indent, Tab/Shift+Tab, Escape/refocus, hidden mistake recovery, final-key finish, frozen timer and server validation.');
} finally {
  if (registered) assert.equal((await context.request.delete(origin + '/api/profile')).status(), 200);
  await browser.close();
}
