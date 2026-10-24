const test = require('node:test');
const assert = require('node:assert/strict');

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { this.ended = true; return this; },
  };
}

async function request(body, options = {}) {
  const handler = require('../api/chat');
  const res = response();
  await handler({
    method: options.method || 'POST',
    headers: { origin: options.origin || 'https://mindrise-trx.vercel.app', 'content-type': 'application/json' },
    body,
  }, res);
  return res;
}

test('crisis text bypasses the model and returns both approved languages', async () => {
  const oldFetch = global.fetch;
  global.fetch = () => { throw new Error('Gateway must not be called'); };
  try {
    const res = await request({ message: 'Gusto ko nang magpakamatay', history: [] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.kind, 'crisis');
    assert.match(res.body.reply, /NCMH Crisis Hotline/);
    assert.match(res.body.reply, /Pasensya na/);
    const english = await request({ message: "I don't want to live", history: [] });
    assert.equal(english.body.kind, 'crisis');
  } finally { global.fetch = oldFetch; }
});

test('approved route sends bounded history and enforces no training', async () => {
  const oldKey = process.env.AI_GATEWAY_API_KEY;
  const oldFetch = global.fetch;
  process.env.AI_GATEWAY_API_KEY = 'test-key';
  let sent;
  global.fetch = async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Use the Tasks screen to add a task.' } }] }) };
  };
  try {
    const history = Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `Turn ${i}` }));
    const res = await request({ message: 'How do I add a task?', history });
    assert.equal(res.statusCode, 200);
    assert.equal(sent.body.model, 'openai/gpt-4.1-nano');
    assert.equal(sent.body.providerOptions.gateway.disallowPromptTraining, true);
    assert.equal(sent.body.messages.length, 2);
    assert.equal(sent.body.messages.at(-1).content, 'How do I add, edit, complete, and review tasks in MindRise?');
    assert.equal(sent.body.providerOptions.gateway.only[0], 'azure');
    assert.equal(res.body.reply, 'Use the Tasks screen to add a task.');
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldKey;
  }
});

test('other origins and personal details never reach the gateway', async () => {
  const oldFetch = global.fetch;
  global.fetch = () => { throw new Error('Gateway must not be called'); };
  try {
    assert.equal((await request({ message: 'How do tasks work?' }, { origin: 'https://example.org' })).statusCode, 403);
    const privateMessage = await request({ message: 'My school is FEU, how do tasks work?' });
    assert.equal(privateMessage.body.kind, 'private');
  } finally { global.fetch = oldFetch; }
});

test('overlong messages are rejected', async () => {
  const res = await request({ message: 'x'.repeat(401) });
  assert.equal(res.statusCode, 400);
});

test('arbitrary free-text names and history are never forwarded', async () => {
  const oldKey = process.env.AI_GATEWAY_API_KEY;
  const oldFetch = global.fetch;
  process.env.AI_GATEWAY_API_KEY = 'test-key';
  let sent;
  global.fetch = async (_, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Open Tasks.' } }] }) };
  };
  try {
    await request({ message: 'Alice says: how do tasks work?', history: [{ role: 'user', content: 'Bob asked about sleep' }, { role: 'assistant', content: 'Hello Charlie' }] });
    const upstream = JSON.stringify(sent);
    for (const name of ['Alice', 'Bob', 'Charlie']) assert.equal(upstream.includes(name), false);
    assert.equal(sent.messages.length, 3);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldKey;
  }
});

test('a prior private message does not block the next feature question', async () => {
  const oldKey = process.env.AI_GATEWAY_API_KEY;
  const oldFetch = global.fetch;
  process.env.AI_GATEWAY_API_KEY = 'test-key';
  let sent;
  global.fetch = async (_, options) => {
    sent = JSON.parse(options.body);
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Open Tasks.' } }] }) };
  };
  try {
    const res = await request({ message: 'How do tasks work?', history: [{ role: 'user', content: 'My school is FEU' }] });
    assert.equal(res.body.kind, 'answer');
    assert.equal(JSON.stringify(sent).includes('FEU'), false);
    assert.equal(sent.messages.length, 2);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldKey;
  }
});

test('unavailable paths log safe failure categories without prompt text', async () => {
  const oldKey = process.env.AI_GATEWAY_API_KEY;
  const oldFetch = global.fetch;
  const oldWarn = console.warn;
  const warnings = [];
  console.warn = (...parts) => warnings.push(parts.join(' '));
  try {
    delete process.env.AI_GATEWAY_API_KEY;
    const missing = await request({ message: 'How do I add a task?' });
    assert.equal(missing.statusCode, 503);
    assert.match(warnings.at(-1), /missing-gateway-key/);

    process.env.AI_GATEWAY_API_KEY = 'test-key';
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { type: 'access_denied', message: 'private detail that must not be logged' } }) });
    const rejected = await request({ message: 'How do I add a task?' });
    assert.equal(rejected.statusCode, 503);
    assert.match(warnings.at(-1), /gateway-http-401 type=access_denied/);
    assert.equal(warnings.some(line => line.includes('How do I add a task?') || line.includes('test-key') || line.includes('private detail')), false);
  } finally {
    console.warn = oldWarn;
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AI_GATEWAY_API_KEY;
    else process.env.AI_GATEWAY_API_KEY = oldKey;
  }
});
