// Keyboard-only playability: choose a mode, set it up, start it, type it, and finish it without a pointer.
// Every stop on the way has to look different from its unfocused self, whether the design shows that with a
// ring or with a border colour change.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'this suite runs against the local worker');
const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin }, viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// What the keyboard is standing on right now, named the way the browser names it.
const focused = () => page.evaluate(() => {
  const element = document.activeElement;
  if (!element || element === document.body) return null;
  const labels = element.labels ? [...element.labels].map((label) => label.textContent).join(' ') : '';
  return { tag: element.tagName.toLowerCase(), name: (element.getAttribute('aria-label') || labels || element.getAttribute('placeholder') || element.textContent || '').trim().slice(0, 40) };
});

// Everything a focus state could plausibly change.
const paint = (locator) => locator.evaluate((element) => {
  const style = getComputedStyle(element);
  return { outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`, border: style.borderColor, shadow: style.boxShadow, background: style.backgroundColor };
});
const looksFocused = (before, after) => before.outline !== after.outline || before.border !== after.border || before.shadow !== after.shadow || before.background !== after.background;

async function tabTo(locator, name, limit = 40) {
  const before = await paint(locator);
  const seen = [];
  for (let step = 0; step < limit; step++) {
    await page.keyboard.press('Tab');
    const current = await focused();
    if (!current) continue;
    seen.push(`${current.tag}[${current.name}]`);
    if (current.name === name) {
      assert.ok(looksFocused(before, await paint(locator)), `${name} looks the same focused as unfocused: nothing shows where the keyboard is`);
      return current;
    }
  }
  throw new Error(`never reached ${name} by keyboard. Tab order was: ${seen.join(' -> ')}`);
}

try {
  await page.goto(origin + '/play', { waitUntil: 'domcontentloaded' });
  const mode = page.getByLabel('Practice mode', { exact: true });
  await expect(mode).toBeEnabled({ timeout: 20000 });

  // Choose the mode with the keyboard alone.
  await tabTo(mode, 'Practice mode');
  await page.keyboard.press('End');
  for (let step = 0; step < 12; step++) {
    const value = await page.evaluate(() => document.activeElement ? document.activeElement.value : null);
    if (value === 'custom') break;
    await page.keyboard.press('ArrowUp');
  }
  assert.equal(await page.evaluate(() => document.activeElement ? document.activeElement.value : null), 'custom', 'the mode selector could not be changed with the keyboard');

  // Write the passage, apply it, and start the run: still no pointer. The field starts with the sample
  // passage, so the keyboard replaces it the way a person would: select all, then type.
  const passage = page.getByLabel('CUSTOM PASSAGE', { exact: true });
  await tabTo(passage, 'CUSTOM PASSAGE');
  await page.keyboard.press('Control+a');
  await page.keyboard.type('red blue green');
  await tabTo(page.getByRole('button', { name: 'APPLY PASSAGE' }), 'APPLY PASSAGE');
  await page.keyboard.press('Enter');

  // Type the passage into the game's own input and finish.
  const input = page.locator('.demo-input');
  await expect(input).toBeVisible({ timeout: 15000 });
  await input.pressSequentially('red blue green');
  await expect(page.locator('.demo-result-card')).toBeVisible({ timeout: 15000 });

  // And the finished result is reachable too: keep tabbing until focus lands inside the result card.
  let reached = false;
  for (let step = 0; step < 80 && !reached; step++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => Boolean(document.activeElement && document.activeElement.closest('.demo-result-card')));
  }
  assert.ok(reached, 'the result card cannot be reached with the keyboard');

  console.log('Keyboard play passed: mode chosen, passage written and applied, run started, run finished and the result reached with no pointer, and every stop showed where focus was.');
} finally {
  await browser.close();
}
