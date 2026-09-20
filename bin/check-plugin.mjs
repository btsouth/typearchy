// Portable part of `omarchy plugin validate`, which only runs on an Omarchy machine and so was never in CI.
// Checks the rules a runner can check: no tracked symlinks (the plugin loader refuses them, which is the
// failure that stops an install), a manifest whose entry points exist, and the version numbers that this
// repo has drifted apart before.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

// 1. The plugin loader reads the folder, not the index, but a committed symlink breaks every install.
const symlinks = git('ls-files', '-s').split('\n').filter((line) => line.startsWith('120000')).map((line) => line.split('\t')[1]);
assert.deepEqual(symlinks, [], `this repo ships symlinks, which the plugin loader refuses: ${symlinks.join(', ')}`);

// 2. The manifest has to be readable and point at files that are really there.
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1, 'unexpected manifest schemaVersion');
for (const key of ['id', 'name', 'version', 'author', 'description', 'kinds', 'entryPoints']) {
  assert.ok(manifest[key], `manifest.json is missing ${key}`);
}
for (const [kind, entry] of Object.entries(manifest.entryPoints)) {
  assert.ok(existsSync(join(root, entry)), `manifest entryPoints.${kind} points at ${entry}, which does not exist`);
}

// 3. The version that the shell shows, the package the website builds, and the newest tag.
const websitePackage = JSON.parse(readFileSync(join(root, 'website', 'package.json'), 'utf8'));
assert.equal(manifest.version, websitePackage.version, `manifest.json says ${manifest.version} and website/package.json says ${websitePackage.version}`);
const tags = git('tag', '--list', 'v*').split('\n').map((value) => value.trim()).filter(Boolean);
if (tags.length) {
  // Compare as numbers, not as strings: "1.10.0" sorts before "1.9.0" as text, which would have flagged a
  // correct future version as unreleased.
  const parts = (value) => value.replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const atLeast = (one, two) => {
    const a = parts(one), b = parts(two);
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      const left = a[index] || 0, right = b[index] || 0;
      if (left !== right) return left > right;
    }
    return true;
  };
  const newest = tags.reduce((highest, tag) => (atLeast(tag, highest) ? tag : highest), 'v0.0.0');
  assert.ok(atLeast(manifest.version, newest),
    `manifest.json is at ${manifest.version} but the newest release tag is ${newest}: the shell would show a version that was never released`);
}

// 4. QML lint, when this machine has it (CI runners generally do not).
let linted = 0;
if (execFileSync('sh', ['-c', 'command -v qmllint || true'], { encoding: 'utf8' }).trim()) {
  for (const file of git('ls-files', '*.qml').split('\n').filter(Boolean)) {
    const output = execFileSync('qmllint', [join(root, file)], { encoding: 'utf8' });
    assert.equal(output.trim(), '', `${file}: ${output.trim()}`);
    linted++;
  }
}

console.log(`Plugin checks passed: no tracked symlinks, ${Object.keys(manifest.entryPoints).length} entry points resolve, version ${manifest.version} matches the website package and the newest tag${linted ? `, and ${linted} QML files lint clean` : ' (qmllint not on this machine)'}.`);
