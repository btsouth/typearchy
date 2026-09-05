// Disposable, uncredentialed local fixtures for filtering and pagination.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const origin = process.env.TYPEARCHY_TEST_ORIGIN || 'http://localhost:5177';
assert.match(origin, /^http:\/\/(?:localhost|127\.0\.0\.1):[0-9]+$/);
const directory = mkdtempSync(join(tmpdir(), 'typearchy-library-'));
const id = randomUUID(); const handle = 'library_' + Date.now().toString(36);
const prefix = Date.now().toString(36).slice(-8);
function sql(command) {
  const file = join(directory, 'fixture.sql'); writeFileSync(file, command);
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'DB', '--local', '--config', 'wrangler.local.json', '--file', file], { cwd: new URL('../', import.meta.url), stdio: 'pipe' });
}
const links = html => [...html.matchAll(/<a [^>]*href="\/c\/([a-z0-9]{12})"/g)].map(match => match[1]);
async function page(path) { const response = await fetch(origin + path); assert.equal(response.status, 200); return response.text(); }
try {
  sql(`INSERT INTO profiles (id,handle,recovery_hash,visibility,created_at,updated_at) VALUES ('${id}','${handle}','disabled','public',1,1);` + Array.from({length:47}, (_,i)=>`INSERT INTO challenges (id,slug,creator_id,title,passage,language,rules_json,content_hash,moderation,visibility,created_at) VALUES ('${id}-${i}','${prefix}${String(i).padStart(4,'0')}','${id}','Library fixture ${i}','Clear feedback makes deliberate practice useful.','${i === 46 ? 'ruby' : 'prose'}','{}','fixture','${i === 45 ? 'pending' : 'approved'}','public',1);`).join('\n'));
  const first = await page(`/challenges?q=${handle}&language=prose`);
  assert.equal(links(first).length, 40);
  const next = /href="(\/challenges\?[^"<>]*after=[^"<>]*)"/.exec(first)?.[1].replaceAll('&amp;', '&');
  assert.ok(next, 'Older challenges need a next-page link');
  const second = await page(next);
  assert.equal(links(second).length, 5);
  assert.equal(new Set([...links(first), ...links(second)]).size, 45, 'Tied timestamps must not skip or duplicate challenges');
  assert.equal(links(await page(`/challenges?q=${handle}&language=ruby`)).length, 1);
  assert.equal(links(await page(`/challenges?q=${handle}%25`)).length, 0, 'Search wildcard characters are literal');
  console.log('Local challenge library passed: title/player filters, languages, review isolation, and pagination without duplicates.');
} finally { sql(`DELETE FROM profiles WHERE id = '${id}'`); rmSync(directory,{recursive:true,force:true}); }
