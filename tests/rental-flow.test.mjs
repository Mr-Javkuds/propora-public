import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.PROPORA_TEST_URL || 'http://localhost:3000';

test('Reopening and retrying administrative submissions does not create duplicates',async t=>{
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:process.env.PROPORA_TEST_EMAIL || 'pencari@propora.demo',password:process.env.PROPORA_TEST_PASSWORD || 'ProporaDemo123!',role:'pencari'})});
  assert.equal(login.status,200,'Confirmed demo seeker required');
  const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const read=async()=>{
    const response=await fetch(base+'/api/pencari/applications',{headers:{Cookie:cookie}});
    assert.equal(response.status,200);
    return (await response.json()).applications;
  };
  const before=await read();
  const statuses=[...new Set(before.filter(item=>['pending','approved'].includes(item.status)).map(item=>item.status))];
  assert.ok(statuses.length,'An active persisted application is required');
  for(const status of statuses) await t.test(status+' retries return the persisted application',async()=>{
    const existing=before.find(item=>item.status===status);
    assert.ok(existing,'Seeded '+status+' request required');
    // Only a listing id is sent: a missing fixture cannot create a new request.
    const responses=await Promise.all([1,2].map(()=>fetch(base+'/api/pencari/applications',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({listingId:existing.listingId})})));
    for(const response of responses){
      assert.equal(response.status,201);
      const {application}=await response.json();
      assert.equal(application.id,existing.id);
      assert.ok(['pending','approved'].includes(application.status),'An owner may approve while the retry is in flight');
    }
    const reopened=await read();
    assert.equal(reopened.filter(item=>item.listingId===existing.listingId).length,before.filter(item=>item.listingId===existing.listingId).length);
  });
  await t.test('guest cannot submit a request',async()=>{
    const response=await fetch(base+'/api/pencari/applications',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({listingId:3})});
    assert.equal(response.status,401);
  });
});
