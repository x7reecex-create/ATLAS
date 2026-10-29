/* ATLAS public offline shell. Private requests never enter Cache Storage. */
const CACHE = 'atlas-private-ios-v22-public-shell';
const SCOPE = new URL(self.registration.scope);
const SHELL = new URL('index.html', SCOPE).href;
const ASSETS = new Map([
  ['index.html', ['text/html']],
  ['manifest.webmanifest', ['application/manifest+json', 'application/json']],
  ['icon.svg', ['image/svg+xml']],
  ['icon-192.png', ['image/png']],
  ['icon-512.png', ['image/png']],
  ['apple-touch-icon.png', ['image/png']],
].map(([path, types]) => [new URL(path, SCOPE).href, types]));

function privateRequest(request) {
  if (request.cache === 'no-store') return true;
  const headers = request.headers;
  if (['authorization', 'proxy-authorization', 'cookie', 'apikey', 'x-api-key', 'x-auth-token', 'x-access-token'].some(name => headers.has(name))) return true;
  return /(?:^|,)\s*(?:private|no-store)\b/i.test(headers.get('cache-control') || '');
}

// Fetch a known static URL independently of the originating navigation. In
// particular, never forward cookies, bearer headers, query strings or redirects.
function publicFetch(url) {
  return fetch(new Request(url, {
    method: 'GET', credentials: 'omit', mode: 'same-origin', redirect: 'error',
    cache: 'reload', referrerPolicy: 'no-referrer',
  }));
}

function publicResponse(response, url) {
  if (response.status !== 200 || response.redirected || response.url !== url) return false;
  if (['opaque', 'opaqueredirect', 'error'].includes(response.type)) return false;
  if (/(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get('cache-control') || '')) return false;
  if (response.headers.has('set-cookie')) return false;
  const varies = (response.headers.get('vary') || '').toLowerCase().split(',').map(value => value.trim());
  if (varies.some(name => ['*', 'authorization', 'cookie', 'apikey', 'x-api-key', 'x-auth-token', 'x-access-token'].includes(name))) return false;
  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  return ASSETS.get(url)?.includes(contentType) === true;
}

async function cachedPublic(url) {
  try { return await (await caches.open(CACHE)).match(url); }
  catch { return undefined; }
}

function storePublic(event, url, response) {
  if (!publicResponse(response, url)) return;
  const copy = response.clone();
  event.waitUntil(caches.open(CACHE).then(cache => cache.put(url, copy)).catch(() => {}));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Validate the complete static set before writing any response. A private
    // response or a redirect fails installation and leaves the old worker active.
    const entries = await Promise.all([...ASSETS.keys()].map(async url => {
      const response = await publicFetch(url);
      if (!publicResponse(response, url)) throw new Error('Public offline asset is not cacheable.');
      return [url, response];
    }));
    const cache = await caches.open(CACHE);
    await Promise.all(entries.map(([url, response]) => cache.put(url, response)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('atlas-private-ios-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search || url.hash || url.username || url.password || privateRequest(request)) return;

  if (request.mode === 'navigate') {
    // Unknown/auth/API paths must retain their own network behaviour, even
    // offline. Only these two exact app entry URLs may receive the shell.
    if (url.href !== SCOPE.href && url.href !== SHELL) return;
    event.respondWith((async () => {
      try {
        const response = await publicFetch(SHELL);
        storePublic(event, SHELL, response);
        return response;
      } catch {
        return (await cachedPublic(SHELL)) || Response.error();
      }
    })());
    return;
  }

  if (!ASSETS.has(url.href)) return;
  event.respondWith((async () => {
    const cached = await cachedPublic(url.href);
    if (cached) return cached;
    const response = await publicFetch(url.href);
    storePublic(event, url.href, response);
    return response;
  })());
});
