import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequest } from '../functions/astro-admin.js';

const env = { ADMIN_PASS: 'website-password', ASTRO_API_URL: 'https://astro.example.test', ASTRO_ADMIN_TOKEN: 'server-secret' };
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function request(path = 'users', method = 'GET', pass = env.ADMIN_PASS, body) {
  return new Request('https://website.example.test/astro-admin?path=' + encodeURIComponent(path), {
    method, headers: { 'X-Admin-Pass': pass, Cookie: 'private=website', 'X-Astro-Admin': 'attacker', Authorization: 'Bearer website' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}
function noFetch() { globalThis.fetch = () => { assert.fail('fetch must not be called'); }; }

test('wrong admin password gives 403 before any upstream access', async () => {
  noFetch();
  const response = await onRequest({ request: request('users', 'GET', 'wrong'), env });
  assert.equal(response.status, 403);
});

test('whitelist rejects unknown routes, methods, traversal and URL injection', async () => {
  noFetch();
  for (const [path, method] of [
    ['audit', 'GET'], ['users', 'DELETE'], ['users', 'PUT'], ['users/jana', 'GET'],
    ['users/jana/logout', 'GET'], ['users/jana/devices', 'POST'], ['users/jana/role', 'POST'],
    ['users/../users', 'GET'], ['users/%2e%2e/license', 'POST'], ['users/jana/license/extra', 'POST'],
    ['//evil.test', 'GET'], ['users?x=1', 'GET'], ['users/', 'GET']
  ]) {
    assert.equal((await onRequest({ request: request(path, method), env })).status, 404, method + ' ' + path);
  }
});

test('all allowed route/method pairs forward only the server token and JSON body', async () => {
  for (const [path, method] of [
    ['users', 'GET'], ['users', 'POST'], ['users/jana', 'DELETE'], ['users/jana/devices', 'GET'],
    ...['password', 'license', 'remove-device', 'logout', 'addons'].map(action => ['users/jana/' + action, 'POST'])
  ]) {
    const body = method === 'POST' ? { until: '2027-01-31', test: 'čć' } : undefined;
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(String(url), env.ASTRO_API_URL + '/api/admin/' + path);
      assert.equal(options.method, method);
      const headers = new Headers(options.headers);
      assert.equal(headers.get('X-Astro-Admin'), env.ASTRO_ADMIN_TOKEN);
      for (const name of ['X-Admin-Pass', 'Cookie', 'Authorization']) assert.equal(headers.has(name), false);
      assert.equal(headers.get('Content-Type'), method === 'POST' ? 'application/json' : null);
      assert.equal(options.body, body === undefined ? undefined : JSON.stringify(body));
      assert.equal(options.redirect, 'manual');
      assert.ok(options.signal instanceof AbortSignal);
      return new Response('{"ok":true}', { status: 201, headers: { 'Set-Cookie': 'secret=1', 'X-Astro-Admin': 'secret' } });
    };
    const response = await onRequest({ request: request(path, method, env.ADMIN_PASS, body), env });
    assert.equal(calls, 1);
    assert.equal(response.status, 201);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.equal(response.headers.has('Set-Cookie'), false);
    assert.equal(response.headers.has('X-Astro-Admin'), false);
    assert.deepEqual(await response.json(), { ok: true });
  }
});

test('missing or invalid configuration fails closed', async () => {
  noFetch();
  for (const config of [
    { ASTRO_API_URL: undefined }, { ASTRO_ADMIN_TOKEN: '' }, { ASTRO_API_URL: 'file:///etc/passwd' },
    { ASTRO_API_URL: 'https://astro.example.test/path' }, { ASTRO_API_URL: 'https://user:pass@astro.example.test' }
  ]) assert.equal((await onRequest({ request: request(), env: { ...env, ...config } })).status, 503);
});

test('upstream errors and Retry-After survive without caching', async () => {
  globalThis.fetch = async () => new Response('{"error":"locked"}', { status: 429, headers: { 'Retry-After': '900' } });
  const response = await onRequest({ request: request(), env });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '900');
  assert.deepEqual(await response.json(), { error: 'locked' });
});

test('redirects and network failures give a safe 502', async () => {
  for (const fake of [
    async () => Response.redirect('https://other.example.test', 302),
    async () => { throw new Error('sensitive internal detail'); }
  ]) {
    globalThis.fetch = fake;
    const response = await onRequest({ request: request(), env });
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /server-secret|sensitive internal detail/);
  }
});

test('existing guard lockout is respected before proxying', async () => {
  noFetch();
  const headers = new Headers(request().headers); headers.set('cf-connecting-ip', '192.0.2.1');
  const lockedEnv = { ...env, NATAL_LOG: { get: async () => ({ until: Date.now() + 60000 }) } };
  const response = await onRequest({ request: new Request(request(), { headers }), env: lockedEnv });
  assert.equal(response.status, 429);
  assert.ok(response.headers.has('Retry-After'));
});
