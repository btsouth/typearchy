// Every internal link the site produces, fetched for real. A link to a route that does not exist is a
// dead end for a visitor, and the routes list in the other suites has drifted before.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Every route the app actually has (app/**/page.tsx). Kept here so the link sweep covers all of them.
const routes = ['/', '/play', '/challenges', '/challenges/new', '/history', '/account', '/connect', '/recover', '/sources', '/moderation'];
const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'this suite runs against the local worker');

const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin } });
const page = await context.newPage();

try {
  const targets = new Map();
  for (const route of routes) {
    const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    assert.ok(response && response.status() < 400, `${route} returned ${response ? response.status() : 'no response'}, but it is one of the app's own routes`);
    await page.waitForTimeout(700);
    const found = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((anchor) => anchor.getAttribute('href')));
    for (const href of found) {
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || /^https?:/.test(href)) continue;
      if (!targets.has(href)) targets.set(href, new Set());
      targets.get(href).add(route);
    }
  }

  const broken = [];
  for (const [href, seenOn] of targets) {
    const response = await context.request.get(origin + href);
    if (response.status() >= 400) broken.push(`${href} (${response.status()}) linked from ${[...seenOn].join(', ')}`);
  }
  assert.deepEqual(broken, [], `links that lead nowhere:\n${broken.join('\n')}`);
  console.log(`Links passed: ${targets.size} internal targets across ${routes.length} routes all resolve, and every route in the app answers.`);
} finally {
  await browser.close();
}
