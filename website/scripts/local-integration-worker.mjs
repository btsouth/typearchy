// Serve the built Worker directly in Miniflare. Wrangler's additional development
// proxy intermittently loses connections after early request rejection in CI.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { unstable_getMiniflareWorkerOptions } from 'wrangler';

const { workerOptions, main, externalWorkers } = unstable_getMiniflareWorkerOptions('dist/server/wrangler.json');
assert.equal(externalWorkers.length, 0, 'Integration tests must not connect external workers');
const modulesRoot = resolve('dist/server');
const modules = readdirSync(modulesRoot, { recursive: true }).filter(path => /\.(js|wasm)$/.test(path))
  .sort((a, b) => a === 'index.js' ? -1 : b === 'index.js' ? 1 : a.localeCompare(b))
  .map(path => ({ type: path.endsWith('.wasm') ? 'CompiledWasm' : 'ESModule', path: resolve(modulesRoot, path) }));
assert.equal(modules[0].path, main);
const bindingsOptions = { ...workerOptions };
delete bindingsOptions.modulesRules; // Modules are enumerated explicitly above.
const options = convertV4MiniflareOptions({
  host: '127.0.0.1',
  port: Number(process.env.TYPEARCHY_TEST_PORT || 5178),
  workers: [{
    ...bindingsOptions,
    name: 'typearchy',
    modulesRoot,
    modules,
    bindings: { ...workerOptions.bindings, TYPEARCHY_MODERATOR_PROFILE_IDS: 'local-moderation-test' },
  }],
});
const runtime = new Miniflare({ ...options, resourcePersistencePath: resolve('.wrangler/state/v3') });
console.log(`Local integration Worker ready: ${await runtime.ready}`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await runtime.dispose();
  process.exit(0);
});
