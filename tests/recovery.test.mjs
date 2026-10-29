import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('async function bridgeRecoveryFromHash(){');
const end = html.indexOf('function linkScreen(){', start);
assert.ok(start > 0 && end > start);
const handler = html.slice(start, end);
async function check(search, hash, valid = false) {
  const location = { pathname: '/', search, hash };
  let network = 0, session = null;
  const state = {
    URLSearchParams, location,
    history: { replaceState(_a, _b, url) { const u = new URL(url, 'https://atlas-personal-ios.vercel.app'); location.search = u.search; location.hash = u.hash; } },
    BRIDGE_API: 'https://stub.invalid', BRIDGE_KEY: 'synthetic', bridgeGeneration: 1,
    bridgeAssertCurrent(generation) { assert.equal(generation, 1); }, render() {},
    fetch: async () => { network++; return { ok: valid, json: async () => ({ id: 'synthetic-user', email: 'nobody@invalid.example' }) }; },
    page: 'home', bridgeRecoveryMode: 'login', bridgeNotice: '', bridgeError: false,
    bridgeSetSession(value) { session = value; }
  };
  vm.createContext(state);
  vm.runInContext(handler, state);
  await vm.runInContext('bridgeRecoveryFromHash()', state);
  return { state, network, location, session };
}
test('query recovery is stripped from URL before mocked verification', async () => {
  const { state, network, location, session } = await check('?type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh', '', true);
  assert.equal(state.bridgeRecoveryMode, 'password');
  assert.equal(network, 1);
  assert.equal(session.user.id, 'synthetic-user');
  assert.equal(location.search, '');
  assert.equal(location.hash, '');
});
test('expired recovery tokens are not verified', async () => {
  const { state, network, location } = await check('?type=recovery&error=access_denied&error_code=otp_expired&access_token=synthetic', '');
  assert.match(state.bridgeNotice, /expired/i);
  assert.equal(network, 0);
  assert.equal(location.search, '');
});
test('unrecognised credential callbacks are discarded without verification', async () => {
  const { state, network, location } = await check('?access_token=synthetic&refresh_token=synthetic2', '');
  assert.match(state.bridgeNotice, /not a complete/i);
  assert.equal(network, 0);
  assert.equal(location.search, '');
});
test('ordinary links are not modified', async () => {
  const { state, network, location } = await check('?foo=bar', '#normal');
  assert.equal(state.page, 'home');
  assert.equal(network, 0);
  assert.equal(location.search, '?foo=bar');
  assert.equal(location.hash, '#normal');
});
