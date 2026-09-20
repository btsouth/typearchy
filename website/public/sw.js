// Typearchy service worker.
//
// Local practice never needed the network, and this makes the app itself load offline too.
//
// Rules:
// - Every navigation goes to the network first. The cache only answers when the network cannot, so a
//   deploy is never held back by a cached shell.
// - Build assets under /_next/static/ are cache-first, because their names change with every deploy.
// - Everything else, including /api/, goes to the network and is never cached.
// - The cache name is derived from the asset URLs the current page references, so a new deploy
//   produces a new cache on its own, and old caches are dropped when the new one activates.

const SHELL_URLS = ['/play', '/icon.png', '/icon-192.png', '/manifest.webmanifest'];
const CACHE_PREFIX = 'typearchy-shell-';

async function describeShell() {
  const response = await fetch('/play', { cache: 'no-store' });
  const html = await response.text();
  const assets = [...html.matchAll(/\/_next\/static\/[A-Za-z0-9._/-]+/g)].map((match) => match[0]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(assets.join('\n')));
  const hash = [...new Uint8Array(digest)].slice(0, 6).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { html, name: CACHE_PREFIX + hash, urls: [...new Set([...SHELL_URLS, ...assets])] };
}

async function shellCache() {
  const names = await caches.keys();
  const shell = names.filter((name) => name.startsWith(CACHE_PREFIX));
  if (!shell.length) return null;
  return caches.open(shell.sort().at(-1));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await describeShell();
    const cache = await caches.open(shell.name);
    // The page we just fetched is the shell, stored directly so it exists even if a later fetch fails.
    await cache.put('/play', new Response(shell.html, { headers: { 'content-type': 'text/html; charset=utf-8' } }));
    await Promise.all(shell.urls.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    let current = null;
    try {
      current = (await describeShell()).name;
    } catch {
      // Activated while offline: keep whatever shell is already cached.
    }
    const names = await caches.keys();
    await Promise.all(names.map((name) => {
      if (!name.startsWith(CACHE_PREFIX)) return undefined;
      if (current === null || name === current) return undefined;
      return caches.delete(name);
    }));
    // Take over the pages that are already open, so the offline shell works without a second load.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const shell = await caches.match('/play');
        if (shell) return shell;
        throw new Error('offline with no cached shell');
      }
    })());
    return;
  }

  const cacheable = url.pathname.startsWith('/_next/static/') || SHELL_URLS.includes(url.pathname);
  if (!cacheable) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      const cache = await shellCache();
      if (cache) await cache.put(request, response.clone());
    }
    return response;
  })());
});
