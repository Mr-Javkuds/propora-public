import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const accounts = process.env.PROPORA_TEST_ACCOUNTS ? JSON.parse(readFileSync(process.env.PROPORA_TEST_ACCOUNTS,'utf8')) : null;

const base = process.env.PROPORA_TEST_URL || 'http://localhost:3001';
const run = randomUUID();
function client() {
  const cookies = new Map();
  return async (path, method = 'GET', body, origin = base) => {
    const response = await fetch(base + path, { method, headers: { Origin: origin, Cookie: [...cookies].map(([key,value]) => `${key}=${value}`).join('; '), 'Content-Type': 'application/json', 'X-Forwarded-For': `integration-${run}` }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), redirect: 'manual' });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';'); const index = pair.indexOf('=');
      cookies.set(pair.slice(0,index),pair.slice(index+1));
    }
    return { status: response.status, body: await response.json() };
  };
}
async function ok(response, status = 200) {
  const result = await response;
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}
const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));

test('Shared marketplace lifecycle and authorization', async t => {
  const owner = client(), otherOwner = client(), seeker = client(), otherSeeker = client();
  const users = [];
  for (const [call, role, prefix] of [[owner, 'pemilik', 'owner'], [otherOwner, 'pemilik', 'other-owner'], [seeker, 'pencari', 'seeker'], [otherSeeker, 'pencari', 'other-seeker']]) {
    const fixture = accounts?.find(account => account.prefix === prefix);
    users.push((await ok(call(fixture ? '/api/auth/login' : '/api/auth/register', 'POST', { email: fixture?.email ?? `test-${prefix}-${run}@example.test`, password: fixture?.password ?? 'integration-password-123', role }), fixture ? 200 : 201)).user);
  }
  await t.test('Protected routes, invalid cookies, role boundaries and logout', async () => {
    const guest = client();
    assert.equal((await guest('/api/owner/account')).status,401);
    assert.equal((await owner('/api/pencari/account')).status,403);
    assert.equal((await seeker('/api/owner/account')).status,403);
    const response = await fetch(base + '/pencari', {redirect:'manual',headers:{Cookie:'propora_session=forged'}});
    assert.equal(response.status,307);
    assert.ok(response.headers.get('location').includes('/login'));
    assert.equal((await fetch(base+'/owner',{redirect:'manual'})).status,307);
  });
  const payload = { name: `Integration Ruko ${run}`, address: 'UDINUS Semarang', price: 50000000, latitude: -6.9827, longitude: 110.4091, area: 120, image: '/figma/results/ruko-1.jpeg', facilities: ['Parkir', 'PDAM'], description: 'Integration fixture', status: 'available' };
  const listing = (await ok(owner('/api/owner/listings', 'POST', { ...payload, ownerId: users[1].id }), 201)).listing;
  await t.test('Published listing uses authenticated owner and canonical coordinates', async () => {
    assert.equal(listing.ownerId, users[0].id);
    const data = await ok(seeker('/api/ml/recommendations', 'POST', { budgetMin: 40, budgetMax: 60, center: { lat: -6.9827, lng: 110.4091 }, radiusMeters: 500 }));
    assert.equal(data.recommendations.find(item => item.id === listing.id).latitude, listing.latitude);
    const scored = data.recommendations.find(item => item.id === listing.id);
    assert.equal(scored.mlStatus, 'ready');
    assert.ok(scored.propora_score > 0);
    assert.equal(scored.propora_score, listing.analysis.score);
    assert.equal(scored.modelVersion, listing.analysis.modelVersion);
    const detail = (await ok(seeker('/api/ml/properties/' + listing.id))).property;
    assert.equal(detail.propora_score, scored.propora_score);
    assert.equal(detail.analyzedAt, scored.analyzedAt);
    assert.ok(!(await ok(seeker('/api/ml/recommendations', 'POST', { budgetMax: 10 }))).recommendations.some(item => item.id === listing.id));
    assert.equal((await otherOwner('/api/owner/listings/' + listing.id, 'PATCH', payload)).status, 404);
    assert.equal((await seeker('/api/owner/listings', 'POST', payload)).status, 403);
  });
  await t.test('Publication runs ML once, reuses reads and display edits, reruns changed property inputs', async () => {
    const original = listing.analysis;
    const rename = (await ok(owner('/api/owner/listings/' + listing.id, 'PATCH', { ...payload, name: payload.name + ' renamed', analysis: { score: 100 } }))).listing;
    assert.equal(rename.analysis.score, original.score);
    assert.equal(rename.analysis.analyzedAt, original.analyzedAt);
    const changed = (await ok(owner('/api/owner/listings/' + listing.id, 'PATCH', { ...payload, price: 90000000 }))).listing;
    assert.notEqual(changed.analysis.score, original.score);
    assert.notEqual(changed.analysis.analyzedAt, original.analyzedAt);
    await ok(owner('/api/owner/listings/' + listing.id, 'PATCH', payload));
    const before = (await ok(owner('/api/owner/listings'))).listings.length;
    assert.equal((await owner('/api/owner/listings', 'POST', { ...payload, latitude: 0, longitude: 0 })).status, 422);
    assert.equal((await ok(owner('/api/owner/listings'))).listings.length, before);
  });
  await t.test('Drafts are private; mutations require same Origin', async () => {
    const draft = (await ok(owner('/api/owner/listings', 'POST', { ...payload, status: 'draft' }), 201)).listing;
    assert.equal((await seeker('/api/ml/properties/' + draft.id)).status, 404);
    assert.equal((await owner('/api/ml/properties/' + draft.id)).status, 200);
    assert.equal(draft.mlStatus, 'pending');
    assert.equal(draft.analysis, null);
    const published = (await ok(owner('/api/owner/listings/' + draft.id, 'PATCH', payload))).listing;
    assert.equal(published.mlStatus, 'ready');
    await ok(owner('/api/owner/listings/' + draft.id, 'PATCH', { ...payload, status: 'draft' }));
    assert.equal((await owner('/api/owner/listings', 'POST', payload, 'https://other.invalid')).status, 403);
  });
  await t.test('Wizard and favorites are account scoped', async () => {
    const draft = { proporaWizardData: { businessName: 'Test Cafe' }, proporaCompareIds: [listing.id, 1] };
    await ok(seeker('/api/pencari/wizard', 'PUT', draft));
    assert.deepEqual((await ok(seeker('/api/pencari/wizard'))).draft, draft);
    assert.equal((await ok(otherSeeker('/api/pencari/wizard'))).draft, null);
    await ok(seeker('/api/pencari/favorites', 'POST', { id: listing.id, saved: true }));
    assert.deepEqual((await ok(otherSeeker('/api/pencari/favorites'))).ids, []);
  });
  await t.test('Survey validation, ownership, duplicate requests and slot conflicts', async () => {
    const payload = { listingId: listing.id, date: tomorrow, time: '10:00', visitors: 2, note: 'Test survey' };
    assert.equal((await seeker('/api/pencari/surveys', 'POST', { ...payload, date: '2020-01-01' })).status, 400);
    assert.equal((await seeker('/api/pencari/surveys', 'POST', { ...payload, visitors: 0 })).status, 400);
    const survey = (await ok(seeker('/api/pencari/surveys', 'POST', { ...payload, seekerId: users[3].id }), 201)).survey;
    assert.equal(survey.seekerId, users[2].id);
    assert.equal((await seeker('/api/pencari/surveys', 'POST', payload)).status, 409);
    assert.equal((await otherOwner('/api/owner/surveys/' + survey.id, 'PATCH', { status: 'confirmed' })).status, 404);
    await ok(owner('/api/owner/surveys/' + survey.id, 'PATCH', { status: 'confirmed', ownerNote: 'Confirmed test' }));
    assert.equal((await ok(seeker('/api/pencari/surveys'))).surveys[0].ownerNote, 'Confirmed test');
    const competing = (await ok(otherSeeker('/api/pencari/surveys', 'POST', payload), 201)).survey;
    assert.equal((await owner('/api/owner/surveys/' + competing.id, 'PATCH', { status: 'confirmed' })).status, 409);
    await ok(owner('/api/owner/surveys/' + competing.id, 'PATCH', { status: 'rejected', ownerNote: 'Slot terisi' }));
  });
  await t.test('Shared chat cannot be read by another seeker or owner', async () => {
    await ok(seeker('/api/pencari/messages', 'POST', { listingId: listing.id, seekerId: users[3].id, text: 'Test inquiry' }), 201);
    assert.equal((await ok(owner(`/api/owner/messages?listingId=${listing.id}&seekerId=${users[2].id}`))).messages[0].text, 'Test inquiry');
    await ok(owner('/api/owner/messages', 'POST', { listingId: listing.id, seekerId: users[2].id, text: 'Test response' }), 201);
    assert.equal((await ok(seeker('/api/pencari/messages?listingId=' + listing.id))).messages.length, 2);
    assert.deepEqual((await ok(otherSeeker(`/api/pencari/messages?listingId=${listing.id}&seekerId=${users[2].id}`))).messages, []);
    assert.equal((await otherOwner(`/api/owner/messages?listingId=${listing.id}&seekerId=${users[2].id}`)).status, 404);
  });
  await t.test('Concurrent rental approvals reserve once and reject remaining pending application', async () => {
    const proposal = { listingId: listing.id, tenant: { fullName: 'Test Applicant', phone: '081234567890', email: 'forged@example.test', businessName: 'Test Cafe', businessType: 'Cafe' }, startDate: tomorrow, duration: 1, offer: 48000000, acceptedTerms: true, status: 'approved' };
    const a = (await ok(seeker('/api/pencari/applications', 'POST', proposal), 201)).application;
    const b = (await ok(otherSeeker('/api/pencari/applications', 'POST', proposal), 201)).application;
    assert.equal(a.status, 'pending'); assert.equal(a.tenant.email, users[2].email);
    assert.equal((await seeker('/api/pencari/applications', 'POST', proposal)).status, 201);
    const decisions = await Promise.all([owner('/api/owner/applications/' + a.id, 'PATCH', { status: 'approved' }), owner('/api/owner/applications/' + b.id, 'PATCH', { status: 'approved' })]);
    assert.deepEqual(decisions.map(result => result.status).sort(), [200, 409]);
    const applications = (await ok(owner('/api/owner/applications'))).applications.filter(item => item.listingId === listing.id);
    assert.equal(applications.filter(item => item.status === 'approved').length, 1);
    assert.equal(applications.filter(item => item.status === 'rejected').length, 1);
    assert.equal((await ok(owner('/api/owner/listings'))).listings.find(item => item.id === listing.id).status, 'reserved');
    assert.ok(!(await ok(seeker('/api/ml/recommendations'))).recommendations.some(item => item.id === listing.id));
    assert.equal((await owner('/api/owner/listings/' + listing.id, 'PATCH', payload)).status, 409);
  });  await t.test('Direct Data API enforces RLS and immutable roles', async () => {
    if (!accounts) return;
    const sdk = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
    const fixture = accounts.find(account => account.prefix==='other-seeker');
    assert.equal((await sdk.auth.signInWithPassword(fixture)).error,null);
    const own = users[3].id;
    assert.equal((await sdk.auth.updateUser({data:{role:'pemilik'}})).error,null);
    const profile = await sdk.from('users').select('role').eq('id',own).single();
    assert.equal(profile.data.role,'pencari');
    assert.ok((await sdk.from('users').update({role:'pemilik'}).eq('id',own)).error);
    const favorites = await sdk.from('favorites').select('*').eq('user_id',users[2].id);
    assert.deepEqual(favorites.data,[]);
    assert.ok((await sdk.from('favorites').insert({user_id:users[2].id,listing_id:listing.id})).error);
    const messages = await sdk.from('messages').select('*').eq('seeker_id',users[2].id);
    assert.deepEqual(messages.data,[]);
    assert.ok((await sdk.rpc('decide_request',{p_kind:'applications',p_id:randomUUID(),p_status:'approved',p_note:''})).error);
    await sdk.auth.signOut();
  });
  await t.test('Logout removes access', async () => {
    await ok(owner('/api/auth/logout','POST'));
    assert.equal((await owner('/api/owner/account')).status,401);
  });

});
