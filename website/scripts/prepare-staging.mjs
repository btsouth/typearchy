// Generate a separate deployment from the validated build. Production bindings
// and routes are never inherited. Authentication covers assets as well as pages.
import { readFileSync, writeFileSync } from 'node:fs';
const databaseId = process.argv[2];
if (!/^[a-f0-9-]{36}$/.test(databaseId || '') || databaseId === '01d89dca-3a71-458d-9485-4dbc4282bfb7') throw new Error('A separate staging database ID is required');
const directory = new URL('../dist/server/', import.meta.url);
const built = JSON.parse(readFileSync(new URL('wrangler.json', directory), 'utf8'));
const config = {
  name: 'typearchy-staging', main: 'staging-entry.js',
  compatibility_date: built.compatibility_date, compatibility_flags: built.compatibility_flags,
  no_bundle: true, rules: built.rules, workers_dev: true, preview_urls: false,
  assets: { ...built.assets, binding: 'ASSETS', run_worker_first: true },
  d1_databases: [{ binding: 'DB', database_name: 'typearchy-staging', database_id: databaseId, migrations_dir: '../../migrations' }],
  observability: { enabled: false },
};
writeFileSync(new URL('wrangler.staging.json', directory), JSON.stringify(config, null, 2));
writeFileSync(new URL('staging-entry.js', directory), `import app from './index.js';
export default { async fetch(request, env, ctx) {
  const supplied = request.headers.get('X-Typearchy-Staging-Key') || '';
  if (!env.TYPEARCHY_STAGING_KEY || supplied !== env.TYPEARCHY_STAGING_KEY) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  const headers = new Headers(request.headers); headers.delete('X-Typearchy-Staging-Key');
  const upstream = await app.fetch(new Request(request, { headers }), env, ctx);
  const response = new Response(upstream.body, upstream);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
} };
`);
console.log('Prepared isolated, access-key protected staging config.');
