(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else api.install(root);
})(typeof self === 'object' ? self : globalThis, function () {
  'use strict';

  const CACHE_PREFIX = 'mindrise-shell-';
  // Run the PWA test suite before every deployment. It fails when a cached
  // file changes until this content-derived revision is updated.
  const SHELL_REVISION = 'b426d00f33a5';
  const CACHE_NAME = `${CACHE_PREFIX}${SHELL_REVISION}`;
  const SHELL = Object.freeze([
    '/',
    '/index.html',
    '/support-chat.css',
    '/support-chat.js',
    '/cloud-account.css',
    '/pwa.css',
    '/cloud-store.js',
    '/cloud-account.js',
    '/pwa.js',
    '/manifest.webmanifest',
    '/assets/google-g-logo.png',
    '/assets/homepage-background.webp',
    '/assets/mindrise-emblem.webp',
    '/assets/mindrise-logo.webp',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    '/assets/icons/maskable-512.png',
    '/assets/icons/apple-touch-icon.png'
  ]);
  const shellPaths = new Set(SHELL);

  function routeForRequest(request, origin) {
    if (!request || request.method !== 'GET') return 'network';
    const url = new URL(request.url);
    if (url.origin !== origin || url.pathname.startsWith('/api/')) return 'network';
    if (request.mode === 'navigate') return 'navigation';
    return shellPaths.has(url.pathname) ? 'shell' : 'network';
  }

  function install(worker) {
    const origin = worker.location.origin;
    worker.addEventListener('install', event => {
      event.waitUntil(worker.caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)));
    });
    worker.addEventListener('activate', event => {
      event.waitUntil(Promise.all([
        worker.caches.keys().then(names => Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => worker.caches.delete(name)))),
        worker.clients.claim()
      ]));
    });
    worker.addEventListener('message', event => {
      if (event.data?.type === 'SKIP_WAITING') worker.skipWaiting();
    });
    worker.addEventListener('fetch', event => {
      const route = routeForRequest(event.request, origin);
      if (route === 'network') return;
      if (route === 'shell') {
        event.respondWith(worker.caches.open(CACHE_NAME).then(cache => cache.match(new URL(event.request.url).pathname)).then(response => response || worker.fetch(event.request)));
        return;
      }
      event.respondWith(worker.fetch(event.request).catch(async () => {
        const cache = await worker.caches.open(CACHE_NAME);
        return (await cache.match('/index.html')) || cache.match('/');
      }));
    });
  }

  return { CACHE_NAME, SHELL_REVISION, SHELL, routeForRequest, install };
});
