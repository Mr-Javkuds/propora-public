import assert from 'node:assert/strict';
import { test } from 'node:test';
const base = process.env.PROPORA_TEST_URL || 'http://localhost:3000';

function client() {
  const cookies = new Map();
  return async (path, options = {}) => {
    const response = await fetch(base + path, {
      ...options,
      headers: { Origin: base, Cookie: [...cookies].map(([key,value]) => `${key}=${value}`).join('; '), 'Content-Type': 'application/json', ...options.headers },
      redirect: 'manual',
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';'); const index = pair.indexOf('=');
      cookies.set(pair.slice(0,index),pair.slice(index+1));
    }
    return response;
  };
}

test('owner and seeker keep separate sessions', async () => {
  const owner = client();
  const seeker = client();
  for (const [call, email, role] of [
    [owner, 'pemilik@propora.demo', 'pemilik'],
    [seeker, 'pencari@propora.demo', 'pencari'],
  ]) {
    const response = await call('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'ProporaDemo123!', role }),
    });
    assert.equal(response.status, 200, await response.text());
  }
  assert.equal((await (await owner('/api/auth/session')).json()).user.role, 'pemilik');
  assert.equal((await (await seeker('/api/auth/session')).json()).user.role, 'pencari');
  assert.equal((await owner('/owner')).status, 200);
  assert.equal((await seeker('/pencari/settings')).status, 200);
  assert.equal((await owner('/pencari')).status, 307);
  assert.equal((await seeker('/owner')).status, 307);
});
