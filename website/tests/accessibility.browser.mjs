// Structural accessibility over the public surfaces, against the local worker like the other suites.
// It holds a floor rather than describing a mood: every visible control has a name, headings do not
// skip a level, no duplicate ids, and small text clears 4.5:1 against what it actually sits on.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { auditPage } from './helpers/pageAudit.mjs';

const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5178';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/, 'this suite runs against the local worker');
const routes = ['/', '/play', '/challenges', '/history', '/account', '/recover', '/sources'];

const browser = await chromium.launch({ ...(process.env.TYPEARCHY_CHROMIUM ? { executablePath: process.env.TYPEARCHY_CHROMIUM } : {}) });
const context = await browser.newContext({ extraHTTPHeaders: { Origin: origin } });
const page = await context.newPage();
const failures = [];
let checked = 0;

try {
  for (const route of routes) {
    await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(900);
    const findings = await auditPage(page);
    checked += findings.length;
    for (const finding of [...new Set(findings)]) failures.push(`${route}: ${finding}`);
  }
  console.log(`Accessibility checked ${routes.length} public routes, ${checked} findings.`);
  assert.deepEqual(failures, [], `accessibility findings:\n${failures.join('\n')}`);
  console.log('Accessibility passed: names on every visible control, no heading jumps, no duplicate ids, and every text run clears its contrast requirement.');
} finally {
  await browser.close();
}
