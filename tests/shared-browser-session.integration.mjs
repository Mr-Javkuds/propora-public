import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.PROPORA_TEST_URL || 'http://localhost:3000';
test('One browser keeps seeker and owner sessions independent across tabs and logout', async () => {
  // A single cookie jar reproduces two tabs in the same browser profile.
  const jar = new Map();
  const run = randomUUID();
  async function call(path, page, body, extra = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'manual',
      headers: { Origin: base, Referer: base + page, 'Content-Type': 'application/json',
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), 'X-Forwarded-For': run, ...extra },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0]; const at = pair.indexOf('=');
      if (/max-age=0(?:;|$)/i.test(cookie)) jar.delete(pair.slice(0, at));
      else jar.set(pair.slice(0, at), pair.slice(at + 1));
    }
    const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
    return { status: response.status, data, location: response.headers.get('location') };
  }
  const login = role => call('/api/auth/login', '/login', { email: role === 'pemilik' ? 'pemilik@propora.demo' : 'pencari@propora.demo', password: 'ProporaDemo123!', role });
  assert.equal((await login('pencari')).status, 200);
  const seeker = await call('/api/auth/session', '/pencari/chat');
  assert.equal(seeker.data.user.role, 'pencari');
  assert.equal((await login('pemilik')).status, 200);
  assert.equal((await call('/api/auth/session', '/owner?view=messages')).data.user.role, 'pemilik');
  assert.equal((await call('/api/auth/session', '/pencari/chat')).data.user.id, seeker.data.user.id);
  assert.equal((await call('/pencari/chat', '/owner')).status, 200, 'Route takes priority over referrer');
  assert.equal((await call('/owner?view=messages', '/pencari/chat')).status, 200);
  assert.equal((await call('/api/pencari/messages', '/pencari/chat')).status, 200);
  assert.equal((await call('/api/owner/messages', '/owner')).status, 200);
  assert.equal((await call('/api/auth/session', '/pencari/chat', undefined, { 'x-propora-session-role': 'pemilik' })).data.user.role, 'pencari', 'Cannot spoof internal scope header');
  assert.equal((await call('/api/auth/logout', '/owner', {})).status, 200);
  assert.equal((await call('/api/auth/session', '/owner')).data.user, null);
  assert.equal((await call('/api/auth/session', '/pencari/chat')).data.user.id, seeker.data.user.id);
  assert.equal((await call('/api/pencari/messages', '/pencari/chat')).status, 200);
  assert.equal((await login('pemilik')).status, 200);
  assert.equal((await call('/api/auth/logout', '/pencari/chat', {})).status, 200);
  assert.equal((await call('/api/auth/session', '/pencari/chat')).data.user, null);
  assert.equal((await call('/api/auth/session', '/owner')).data.user.role, 'pemilik');
  assert.equal((await call('/api/owner/messages', '/owner')).status, 200);
  assert.equal((await call('/api/pencari/messages', '/pencari/chat')).status, 401, 'No fallback into other role session');
  assert.equal((await call('/api/auth/logout', '/owner', {})).status, 200);
});
