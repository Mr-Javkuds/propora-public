import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.PROPORA_TEST_URL || 'http://localhost:3000';
const seekerPages=['/pencari','/pencari/budget','/pencari/area','/pencari/results','/pencari/results/13/analysis','/pencari/area/compare','/pencari/analysis','/pencari/chat','/pencari/booking/pengajuan-sewa?listingId=13','/pencari/payment?listingId=13','/pencari/sewa','/pencari/my-rent','/pencari/payments','/pencari/settings'];
const ownerPages=['/owner','/owner?view=applications','/owner?view=surveys','/owner?view=messages','/owner?view=payments','/owner/listing-baru'];
async function request(path,cookie=''){return fetch(base+path,{redirect:'manual',headers:{Cookie:cookie}});}
test('Every application page renders for its role and rejects guests or the other role',async()=>{
  for(const path of ['/','/login','/auth/reset'])assert.equal((await request(path)).status,200,path);
  for(const path of [...seekerPages,...ownerPages])assert.equal((await request(path)).status,307,`guest ${path}`);
  for(const [role,email,pages,forbidden] of [['pencari','pencari@propora.demo',seekerPages,'/owner'],['pemilik','pemilik@propora.demo',ownerPages,'/pencari']]){
    const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Forwarded-For':'page-audit-'+Date.now()},body:JSON.stringify({email,password:'ProporaDemo123!',role})});
    assert.equal(login.status,200);const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
    for(const path of pages){const r=await request(path,cookie);assert.equal(r.status,200,`${role} ${path}`);assert.ok((await r.text()).includes('<html'),path);}
    assert.equal((await request(forbidden,cookie)).status,307);
    if(role==='pencari'){
      for(const [path,target] of [['/pencari/result','/pencari/results'],['/pencari/booking?listingId=13','/pencari/chat?listingId=13']]){
        const r=await request(path,cookie);
        if(r.status===307)assert.ok(r.headers.get('location')?.includes(target),path);
        else {assert.equal(r.status,200,path);const html=await r.text();assert.ok(html.includes('NEXT_REDIRECT') && html.includes(target),`Streaming redirect ${path}`);}
      }
      assert.equal((await request('/api/documents/invalid',cookie)).status,400);
    }
    await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:base,Cookie:cookie}});
  }
});
