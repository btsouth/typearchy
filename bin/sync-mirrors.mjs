// Regenerates every browser copy of the shared engines, or checks them with --check.
//
// The desktop clients read the QML sources in the repository root; the website reads the generated
// copies under website/app. Run this after changing an engine, and let CI run it with --check so a
// stale copy cannot ship.

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const generators = [
  'sync-competition-engine.mjs',
  'sync-learning-engine.mjs',
  'sync-practice-passages.mjs',
  'sync-content-engine.mjs',
  'sync-content-pack.mjs',
  'sync-practice-model.mjs',
];
const check = process.argv.includes('--check');
const failed = [];

for (const generator of generators) {
  const script = fileURLToPath(new URL(generator, import.meta.url));
  const result = spawnSync(process.execPath, check ? [script, '--check'] : [script], { stdio: 'inherit' });
  if (result.status !== 0) failed.push(generator);
}

if (failed.length) {
  console.error(`${failed.length} mirror${failed.length === 1 ? '' : 's'} out of date: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(check ? 'all engine mirrors are current' : 'all engine mirrors regenerated');
