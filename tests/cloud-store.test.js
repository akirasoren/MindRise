const test = require('node:test');
const assert = require('node:assert/strict');
const { SaveController, validState } = require('../cloud-store');
const sample = () => ({ version: 1, name: 'Student', school: '', email: '', theme: 'sage', notifications: true, calm: false, tasks: [], sleep: [], moods: [], activity: [] });
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };

test('rejects malformed progress before it can enter the renderer', () => {
  assert.equal(validState(sample()), true);
  for (const value of [null, {}, {...sample(), name: null}, {...sample(), tasks: [{id:'x'}]}, {...sample(), moods:[{date:'2026-11-11',mood:99,energy:3,note:''}]}, {...sample(), garden:{}}]) assert.equal(validState(value), false);
});
test('save advances revision only after acknowledgement and does not mutate snapshot', async () => {
  const pending = deferred(); let sent;
  const store = new SaveController(async input => {sent=input;return pending.promise;});
  store.open('user-a', 4);
  const state = sample(); const saving = store.save(state); state.name='Edited later';
  assert.equal(store.status, 'saving'); assert.equal(store.revision,4);
  assert.equal(sent.payload.name,'Student'); assert.equal(sent.expectedRevision,4);
  pending.resolve({revision:5}); await saving;
  assert.equal(store.status,'saved'); assert.equal(store.revision,5);
});
test('failed save retains snapshot and retries the same mutation identity', async () => {
  const requests=[];
  const store = new SaveController(async request => {requests.push(request);if(requests.length===1)throw Error('offline');return {revision:1};});
  store.open('user-a',0); await store.save(sample());
  assert.equal(store.status,'error'); assert.equal(store.pending.payload.name,'Student');
  await store.retry();
  assert.equal(requests[0].mutationId,requests[1].mutationId);
  assert.equal(store.status,'saved');
});
test('conflict cannot be retried into an unconditional overwrite', async () => {
  let calls=0;
  const store = new SaveController(async () => {calls++;throw Object.assign(Error('conflict'),{code:'40001'});});
  store.open('user-a',2); await store.save(sample()); await store.retry();
  assert.equal(store.status,'conflict'); assert.equal(calls,1); assert.equal(store.pending.payload.name,'Student');
  assert.equal(await store.save(sample()),false);
});
test('busy controller refuses another mutation rather than losing intermediate progress', async () => {
  const pending=deferred(); let calls=0;
  const store = new SaveController(async () => {calls++;return pending.promise;});
  store.open('user-a',0); const first=store.save(sample());
  assert.equal(await store.save({...sample(),name:'Second'}),false); assert.equal(calls,1);
  pending.resolve({revision:1}); await first;
});
test('late response after sign-out cannot revive previous account', async () => {
  const pending=deferred();
  const store = new SaveController(() => pending.promise);
  store.open('user-a',0); const saving=store.save(sample());store.close();store.open('user-b',7);
  pending.resolve({revision:1});await saving;
  assert.equal(store.userId,'user-b');assert.equal(store.revision,7);assert.equal(store.status,'saved');assert.equal(store.pending,null);
});
