// Optional real-Chrome verification: node tests/pwa-browser.cjs
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const root = path.resolve(__dirname, '..');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const chatBodies = [];

function createServer() {
  return http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    if (pathname === '/api/chat' && request.method === 'POST') {
      let body = ''; for await (const chunk of request) body += chunk;
      chatBodies.push(JSON.parse(body));
      response.setHeader('Content-Type', 'application/json');
      if (chatBodies.length === 1) { response.writeHead(503); return response.end(JSON.stringify({ error:'Unavailable' })); }
      return response.end(JSON.stringify({ reply:'Second answer', kind:'answer' }));
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
    try {
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch (_) { response.writeHead(404); response.end(); }
  });
}

async function waitForFile(file, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (fs.existsSync(file)) return;
    await delay(50);
  }
  throw Error(`Timed out waiting for ${file}`);
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once:true }); socket.addEventListener('error', reject, { once:true }); });
  let id = 0;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener('message', message => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id); pending.delete(data.id);
      if (data.error) reject(Error(data.error.message)); else resolve(data.result);
    } else if (data.method && events.has(data.method)) {
      const listeners = events.get(data.method); events.delete(data.method); listeners.forEach(resolve => resolve(data.params));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id; pending.set(current, { resolve, reject }); socket.send(JSON.stringify({ id:current, method, params }));
  });
  const event = (method, timeout = 10000) => new Promise((resolve, reject) => {
    const listeners = events.get(method) || []; listeners.push(resolve); events.set(method, listeners);
    setTimeout(() => reject(Error(`Timed out waiting for ${method}`)), timeout);
  });
  return { socket, send, event };
}

(async () => {
  assert.ok(fs.existsSync(chrome), `Chrome not found at ${chrome}`);
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const appUrl = `http://127.0.0.1:${server.address().port}/`;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'mindrise-pwa-'));
  const browser = childProcess.spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio:'ignore' });
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    await waitForFile(portFile);
    const port = Number(fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]);
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    const page = targets.find(target => target.type === 'page');
    const cdp = await connect(page.webSocketDebuggerUrl);
    await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable'), cdp.send('Network.enable')]);
    const evaluate = async expression => {
      const output = await cdp.send('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true });
      if (output.exceptionDetails) throw Error(output.exceptionDetails.text);
      return output.result.value;
    };
    const navigate = async url => { const loaded = cdp.event('Page.loadEventFired'); await cdp.send('Page.navigate', { url }); await loaded; };
    const waitUntil = async (expression, timeout = 5000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await delay(50); }
      throw Error(`Timed out waiting for ${expression}`);
    };

    await navigate(appUrl);
    const cached = await evaluate(`(async()=>{const registration=await navigator.serviceWorker.ready;await new Promise(resolve=>setTimeout(resolve,100));const keys=await caches.keys();const cache=await caches.open(keys.find(key=>key.startsWith('mindrise-shell-')));const urls=(await cache.keys()).map(request=>new URL(request.url).pathname);return {active:!!registration.active,controlled:!!navigator.serviceWorker.controller,keys,urls}})()`);
    assert.equal(cached.active, true);
    assert.ok(cached.keys.some(key => key.startsWith('mindrise-shell-')));
    assert.ok(cached.urls.includes('/index.html'));
    assert.ok(cached.urls.includes('/pwa.css'));
    assert.equal(cached.urls.includes('/cloud-config.js'), false);
    assert.equal(cached.urls.some(url => url.startsWith('/api/')), false);
    console.log('PASS public shell cached without cloud or API traffic');

    await evaluate(`(()=>{window.MindRiseSupport.show();const input=document.getElementById('support-input');input.value='Failed question';document.getElementById('support-form').requestSubmit();return true})()`);
    await waitUntil(`document.getElementById('support-status').textContent==='Helper unavailable'`);
    await evaluate(`(()=>{const input=document.getElementById('support-input');input.value='Successful question';document.getElementById('support-form').requestSubmit();return true})()`);
    await waitUntil(`document.getElementById('support-status').textContent===''&&[...document.querySelectorAll('.support-message')].some(item=>item.textContent==='Second answer')`);
    assert.equal(chatBodies.length, 2);
    assert.equal(chatBodies[1].history.some(item => item.content === 'Failed question'), false);
    console.log('PASS failed support questions are not replayed in later history');

    await cdp.send('Network.emulateNetworkConditions', { offline:true, latency:0, downloadThroughput:0, uploadThroughput:0 });
    await navigate(appUrl);
    const offline = await evaluate(`({title:document.title,hasStart:[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Explore the demo')})`);
    assert.match(offline.title, /MindRise/);
    assert.equal(offline.hasStart, true);
    console.log('PASS cached MindRise shell relaunches offline');

    await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:0, downloadThroughput:-1, uploadThroughput:-1 });
    await cdp.send('Emulation.setDeviceMetricsOverride', { width:390, height:844, deviceScaleFactor:1, mobile:false });
    await cdp.send('Network.setUserAgentOverride', { userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', platform:'iPhone' });
    await navigate(appUrl);
    await waitUntil(`document.querySelector('[data-pwa-install]')?.getAttribute('aria-label')==='How to install MindRise'`);
    const ios = await evaluate(`(async()=>{const button=document.querySelector('[data-pwa-install]');const visible=button&&!button.hidden;button?.click();await new Promise(resolve=>requestAnimationFrame(()=>resolve()));return {visible,dialog:document.getElementById('pwa-install-help')?.open===true,text:document.getElementById('pwa-install-help')?.textContent||''}})()`);
    assert.equal(ios.visible, true);
    assert.equal(ios.dialog, true);
    assert.match(ios.text, /Add to Home Screen/);
    if (process.env.PWA_SCREENSHOT_PATH) {
      const capture = await cdp.send('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
      fs.writeFileSync(process.env.PWA_SCREENSHOT_PATH, Buffer.from(capture.data, 'base64'));
    }
    console.log('PASS iOS users receive Add to Home Screen guidance');
    cdp.socket.close();
  } finally {
    browser.kill();
    server.close();
    if (browser.exitCode === null) await Promise.race([once(browser, 'exit'), delay(3000)]);
    fs.rmSync(profile, { recursive:true, force:true, maxRetries:5, retryDelay:100 });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
