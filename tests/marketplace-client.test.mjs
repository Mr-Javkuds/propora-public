import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../app/lib/marketplace-client.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
function client(response, inspect = () => {}) {
  const exports = {};
  vm.runInNewContext(source, { exports, FormData, Intl, fetch: async (...args) => { inspect(...args); return response; } });
  return exports.api;
}
test('Empty and truncated responses produce actionable errors instead of JSON parser errors', async () => {
  for (const body of ['', '{"image":']) {
    await assert.rejects(client(new Response(body))('/api/owner/photos'), /respons kosong|Respons server tidak valid/);
  }
});
test('HTML error pages never leak server content into the upload error', async () => {
  await assert.rejects(client(new Response('<html>internal server details</html>', { status: 502 }))('/api/owner/photos'), /^Error: Respons server tidak valid/);
  await assert.rejects(client(new Response('', { status: 413 }))('/api/owner/photos'), /maksimal 5 MB/);
});
test('API error messages and auth failures are preserved', async () => {
  await assert.rejects(client(Response.json({ error: 'Foto unggahan tidak ditemukan.' }, { status: 400 }))('/api/owner/photos'), /Foto unggahan tidak ditemukan/);
  await assert.rejects(client(new Response('', { status: 401 }))('/api/owner/photos'), /Silakan masuk kembali/);
});
test('Valid uploads preserve multipart boundary and return the stored photo URL', async () => {
  const form = new FormData();form.set('file', new Blob(['photo'], { type: 'image/png' }), 'photo.png');
  const api = client(Response.json({ image: '/api/listing-photos/owner/photo.png' }), (_url, options) => {
    assert.equal(options.body, form);
    assert.equal(options.headers['Content-Type'], undefined);
  });
  assert.equal((await api('/api/owner/photos', { method: 'POST', body: form })).image, '/api/listing-photos/owner/photo.png');
});
