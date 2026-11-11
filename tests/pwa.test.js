const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pngSize = file => {
  const data = fs.readFileSync(path.join(root, file));
  assert.equal(data.subarray(1, 4).toString(), 'PNG');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

test('manifest identifies an installable standalone MindRise app', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  assert.equal(manifest.id, '/');
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.name, 'MindRise');
  assert.match(manifest.description, /wellness|habits/i);
  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});

test('manifest supplies standard and maskable icons that exist', () => {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const icons = manifest.icons || [];
  for (const [sizes, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    const icon = icons.find(item => item.sizes === sizes && item.purpose.split(/\s+/).includes(purpose));
    assert.ok(icon, `missing ${sizes} ${purpose} icon`);
    assert.equal(icon.type, 'image/png');
    const file = icon.src.replace(/^\//, '');
    assert.ok(fs.existsSync(path.join(root, file)), `${icon.src} does not exist`);
    assert.deepEqual(pngSize(file), sizes.split('x').map(Number));
  }
  assert.ok(fs.existsSync(path.join(root, 'assets/icons/apple-touch-icon.png')));
  assert.deepEqual(pngSize('assets/icons/apple-touch-icon.png'), [180, 180]);
});

test('document links the manifest, Apple icon, and PWA controller', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/assets\/icons\/apple-touch-icon\.png">/);
  assert.match(html, /<script src="pwa\.js"><\/script>/);
});

test('service worker caches only the public same-origin app shell', () => {
  const { CACHE_NAME, SHELL_REVISION, SHELL, routeForRequest } = require('../sw');
  assert.equal(CACHE_NAME, `mindrise-shell-${SHELL_REVISION}`);
  assert.match(SHELL_REVISION, /^[0-9a-f]{12}$/);
  for (const required of ['/', '/index.html', '/pwa.js', '/support-chat.js', '/cloud-account.js', '/manifest.webmanifest']) {
    assert.ok(SHELL.includes(required), `shell is missing ${required}`);
  }
  assert.equal(SHELL.includes('/cloud-config.js'), false);
  assert.equal(SHELL.some(url => url.startsWith('/api/')), false);

  const request = (url, options = {}) => ({ method: 'GET', mode: 'cors', ...options, url });
  assert.equal(routeForRequest(request('https://mindrise.test/', { mode: 'navigate' }), 'https://mindrise.test'), 'navigation');
  assert.equal(routeForRequest(request('https://mindrise.test/support-chat.js'), 'https://mindrise.test'), 'shell');
  assert.equal(routeForRequest(request('https://mindrise.test/cloud-config.js'), 'https://mindrise.test'), 'network');
  assert.equal(routeForRequest(request('https://mindrise.test/api/chat'), 'https://mindrise.test'), 'network');
  assert.equal(routeForRequest(request('https://uxwbhayrrwmuvyoierfz.supabase.co/rest/v1/mindrise_progress'), 'https://mindrise.test'), 'network');
  assert.equal(routeForRequest(request('https://cdn.jsdelivr.net/npm/@supabase/supabase-js'), 'https://mindrise.test'), 'network');
  assert.equal(routeForRequest(request('https://mindrise.test/', { method: 'POST' }), 'https://mindrise.test'), 'network');
});

test('service-worker release changes whenever a cached shell file changes', () => {
  const { SHELL_REVISION, SHELL } = require('../sw');
  const files = [...new Set(SHELL.map(url => url === '/' ? '/index.html' : url))].sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) hash.update(file).update('\0').update(fs.readFileSync(path.join(root, file.slice(1))));
  assert.equal(SHELL_REVISION, hash.digest('hex').slice(0, 12));
});

test('service worker waits for explicit update acceptance', () => {
  const source = read('sw.js');
  assert.match(source, /message/);
  assert.match(source, /SKIP_WAITING/);
  assert.doesNotMatch(source, /addEventListener\(['"]install['"][\s\S]{0,500}skipWaiting\(/);
});

test('PWA controller registers only on secure origins or localhost', () => {
  const { canRegister } = require('../pwa');
  assert.equal(canRegister({ protocol: 'https:', hostname: 'mindrise.test' }, { serviceWorker: {} }), true);
  assert.equal(canRegister({ protocol: 'http:', hostname: 'localhost' }, { serviceWorker: {} }), true);
  assert.equal(canRegister({ protocol: 'http:', hostname: '127.0.0.1' }, { serviceWorker: {} }), true);
  assert.equal(canRegister({ protocol: 'http:', hostname: 'mindrise.test' }, { serviceWorker: {} }), false);
  assert.equal(canRegister({ protocol: 'https:', hostname: 'mindrise.test' }, {}), false);
});

test('install mode respects standalone, browser prompt, direct install, and iOS', () => {
  const { installMode } = require('../pwa');
  assert.equal(installMode({ standalone: true }), 'hidden');
  assert.equal(installMode({ direct: true }), 'direct');
  assert.equal(installMode({ prompt: true }), 'prompt');
  assert.equal(installMode({ ios: true }), 'ios');
  assert.equal(installMode({}), 'hidden');
});

test('homepage and profile expose install controls as progressive enhancement', () => {
  const html = read('index.html');
  assert.match(html, /data-pwa-install/);
  assert.match(html, /data-pwa-install-detail/);
  assert.match(html, /<link rel="stylesheet" href="pwa\.css">/);
});

test('PWA controller supports browser prompting, iOS help, and accepted updates', () => {
  const source = read('pwa.js');
  assert.match(source, /beforeinstallprompt/);
  assert.match(source, /appinstalled/);
  assert.match(source, /display-mode: standalone/);
  assert.match(source, /SKIP_WAITING/);
  assert.match(source, /controllerchange/);
  assert.match(source, /detail\.textContent !== message/);
});

test('Vercel revalidates the worker and serves the manifest with its media type', () => {
  const config = JSON.parse(read('vercel.json'));
  const headers = config.headers || [];
  const worker = headers.find(rule => rule.source === '/sw.js');
  const manifest = headers.find(rule => rule.source === '/manifest.webmanifest');
  assert.ok(worker, 'missing service-worker headers');
  assert.match(worker.headers.find(item => item.key.toLowerCase() === 'cache-control')?.value || '', /max-age=0/);
  assert.match(worker.headers.find(item => item.key.toLowerCase() === 'cache-control')?.value || '', /must-revalidate/);
  assert.equal(manifest?.headers.find(item => item.key.toLowerCase() === 'content-type')?.value, 'application/manifest+json; charset=utf-8');
});

test('support chat explains when an answer cannot load because the device is offline', () => {
  const source = read('support-chat.js');
  assert.match(source, /navigator\.onLine/);
  assert.match(source, /You are offline/);
});
