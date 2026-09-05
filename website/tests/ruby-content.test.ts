import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { parseChallenge } from '../app/lib/challengeContract.ts';

const snippets = JSON.parse(readFileSync(new URL('../../corpus/ruby.json', import.meta.url), 'utf8')) as {
  id: string; title: string; passage: string; author: string; sourceUrl: string; commit: string; note: string;
}[];

test('Rails excerpts have pinned provenance, preserved license, and compile as Ruby', () => {
  assert.deepEqual(JSON.parse(readFileSync(new URL('../app/rubySnippets.json', import.meta.url), 'utf8')), snippets);
  assert.equal(readFileSync(new URL('../../LICENSES/Rails-MIT.txt', import.meta.url), 'utf8'), readFileSync(new URL('../public/licenses/rails.txt', import.meta.url), 'utf8'));
  for (const snippet of snippets) {
    assert.match(snippet.sourceUrl, new RegExp(`/blob/${snippet.commit}/.*#L[0-9]+-L[0-9]+$`));
    assert.ok(snippet.note.length);
    const parsed = parseChallenge({ ...snippet, attribution: `${snippet.author}. Rails (MIT). ${snippet.sourceUrl}`, autoIndent: true, visibility: 'public' });
    assert.equal(parsed.passage, snippet.passage);
    const result = spawnSync('ruby', ['-c'], { input: snippet.passage, encoding: 'utf8' });
    assert.equal(result.status, 0, `${snippet.id}: ${result.stderr}`);
  }
});
