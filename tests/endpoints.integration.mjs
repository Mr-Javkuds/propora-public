import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';

const base=process.env.PROPORA_TEST_URL || 'http://localhost:3000';
const run=randomUUID();const results=[];const createdListings=[];
mkdirSync('.data',{recursive:true});
function persist(){writeFileSync('.data/endpoints-test-results.json',JSON.stringify({run,base,createdListings,results},null,2));}
function client(label){
  const cookies=new Map();let counter=0;
  return async(path,method='GET',body,options={})=>{
    const response=await fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(30000),headers:{Origin:base,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),'Content-Type':'application/json','X-Forwarded-For':`${run}-${label}-${counter++}`,...options.headers},...(body===undefined?{}:{body:options.raw?body:JSON.stringify(body)})});
    for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
    const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=null;}
    return {status:response.status,data,headers:response.headers,path,method};
  };
}
async function check(promise,expected,label){
  const r=await promise;const passed=r.status===expected;
  results.push({method:r.method,path:r.path,case:label || '',expected,actual:r.status,passed});persist();
  assert.equal(r.status,expected,`${r.method} ${r.path}: ${JSON.stringify(r.data)}`);
  if(expected>=400 && expected!==405)assert.equal(typeof r.data?.error,'string',`${r.path}: structured JSON error required`);
  return r.data;
}
const guest=client('guest'),owner=client('owner'),otherOwner=client('other-owner'),seeker=client('seeker'),otherSeeker=client('other-seeker');
const uuid='00000000-0000-0000-0000-000000000000';
let listing;

test('All endpoint contracts',async t=>{
  for(const [call,email,role] of [[owner,'pemilik@propora.demo','pemilik'],[otherOwner,'pemilik2@propora.demo','pemilik'],[seeker,'pencari@propora.demo','pencari'],[otherSeeker,'pencari2@propora.demo','pencari']])await check(call('/api/auth/login','POST',{email,password:'ProporaDemo123!',role}),200,'confirmed demo login');

  await t.test('Public read and ML endpoints: success, invalid input and HTTP methods',async()=>{
    const publicPaths=['/api/listings','/api/ml/recommendations','/api/ml/compare','/api/ml/properties/13','/api/demo/location-analysis'];
    for(const path of publicPaths){const data=await check(guest(path),200,'public read');assert.ok(data && typeof data==='object');}
    const {listings}=await check(guest('/api/listings'),200);
    assert.ok(listings.length>=2);
    const ids=listings.slice(0,2).map(p=>p.id);
    await check(guest('/api/ml/compare','POST',{ids}),200,'explicit comparison');
    await check(guest('/api/ml/recommendations','POST',{budgetMin:0,budgetMax:1000}),200,'filter query');
    await check(guest('/api/demo/location-analysis','POST',{lat:-6.9827,lng:110.4091,radiusMeters:2000}),200,'location query');
    await Promise.all([
      check(guest('/api/ml/recommendations','POST','{',{raw:true}),400,'malformed JSON'),
      check(guest('/api/ml/recommendations','POST',[]),400,'array instead of object'),
      check(guest('/api/ml/recommendations','POST',{budgetMin:100,budgetMax:10}),400,'inverted budget'),
      check(guest('/api/ml/recommendations','POST',{center:{lat:91,lng:0}}),400,'invalid latitude'),
      check(guest('/api/ml/recommendations','POST',{radiusMeters:-1}),400,'negative radius'),
      check(guest('/api/ml/recommendations','POST',{locationFilters:['x'.repeat(101)]}),400,'invalid facilities'),
      check(guest('/api/ml/compare','POST',{ids:[13,13]}),400,'duplicate IDs'),
      check(guest('/api/ml/compare','POST',{ids:[13,999999999]}),409,'missing comparison listing'),
      check(guest('/api/ml/properties/invalid'),400,'invalid ID'),
      check(guest('/api/ml/properties/999999999'),404,'missing listing'),
      check(guest('/api/demo/location-analysis','POST',{lat:'invalid',lng:0}),400,'invalid location'),
      check(guest('/api/listings','POST',{}),405,'unsupported method'),
      check(guest('/api/ml/compare','DELETE'),405,'unsupported method'),
      check(guest('/api/ml/properties/13','POST',{}),405,'unsupported method'),
    ]);
  });

  await t.test('Auth endpoints: session, registration validation, recovery/password protection and unknown actions',async()=>{
    assert.equal((await check(guest('/api/auth/session'),200)).user,null);
    assert.equal((await check(owner('/api/auth/session'),200)).user.role,'pemilik');
    for(const action of ['login','register','recovery','password']){
      await check(guest('/api/auth/'+action,'POST',{}),400,'invalid payload');
      await check(guest('/api/auth/'+action,'POST','{',{raw:true}),400,'malformed JSON');
      await check(guest('/api/auth/'+action,'POST',{}, {headers:{Origin:'https://untrusted.invalid'}}),403,'cross origin');
    }
    await check(guest('/api/auth/password','POST',{password:'SyntheticNeverApplied123!'}),401,'no recovery/auth session; password is not changed');
    await check(guest('/api/auth/unknown'),404,'unknown GET action');
    await check(guest('/api/auth/unknown','POST',{}),404,'unknown POST action');
    await check(guest('/api/auth/login','PUT',{}),405,'unsupported method');
    const wrongRole=client('wrong-role');
    await check(wrongRole('/api/auth/login','POST',{email:'pemilik@propora.demo',password:'ProporaDemo123!',role:'pencari'}),403,'wrong login role');
    assert.equal((await check(wrongRole('/api/auth/session'),200)).user,null);
    const redirect=await guest('/auth/callback?next=https://untrusted.invalid');
    assert.equal(redirect.status,307);assert.equal(new URL(redirect.headers.get('location')).pathname,'/login');
  });

  await t.test('Every private resource rejects guests, wrong roles and cross-origin writes',async()=>{
    const endpoints=[['owner','account','GET'],['owner','listings','GET'],['owner','listings','POST'],['owner','listings/13','PATCH'],['owner','surveys','GET'],['owner',`surveys/${uuid}`,'PATCH'],['owner','applications','GET'],['owner',`applications/${uuid}`,'PATCH'],['owner','messages','GET'],['owner','messages','POST'],['pencari','account','GET'],['pencari','surveys','GET'],['pencari','surveys','POST'],['pencari','applications','GET'],['pencari','applications','POST'],['pencari','messages','GET'],['pencari','messages','POST'],['pencari','wizard','GET'],['pencari','wizard','PUT'],['pencari','favorites','GET'],['pencari','favorites','POST'],['pencari','payments','POST']];
    for(const [role,resource,method]of endpoints){const path=`/api/${role}/${resource}`;await check(guest(path,method,method==='GET'?undefined:{}),401,'guest');await check((role==='owner'?seeker:owner)(path,method,method==='GET'?undefined:{}),403,'wrong role');if(method!=='GET')await check((role==='owner'?owner:seeker)(path,method,{}, {headers:{Origin:'https://untrusted.invalid'}}),403,'cross origin');}
    for(const [call,role]of [[owner,'owner'],[seeker,'pencari']]){
      for(const resource of ['account','surveys','applications','messages'])await check(call(`/api/${role}/${resource}`),200,'authorized read');
      await check(call(`/api/${role}/unknown`),404,'unknown resource');
    }
  });

  await t.test('Listing creation/edit/draft isolation and invalid IDs',async()=>{
    const payload={name:`QA Endpoints ${run}`,address:'Synthetic API test, Semarang',price:50000000,latitude:-6.9827,longitude:110.4091,area:120,image:'/figma/results/ruko-1.jpeg',facilities:['Parkir'],description:'Synthetic endpoint fixture',status:'available'};
    listing=(await check(owner('/api/owner/listings','POST',payload),201,'new fixture')).listing;createdListings.push(listing.id);persist();
    const changed=(await check(owner(`/api/owner/listings/${listing.id}`,'PATCH',{...payload,name:payload.name+' edited'}),200,'edit own listing')).listing;assert.ok(changed.name.endsWith(' edited'));
    await check(otherOwner(`/api/owner/listings/${listing.id}`,'PATCH',payload),404,'ownership');
    await check(owner(`/api/owner/listings/${listing.id}`,'PATCH',{...payload,status:'draft'}),200,'save draft');
    await check(guest(`/api/ml/properties/${listing.id}`),404,'private draft');
    await check(owner(`/api/ml/properties/${listing.id}`),200,'owner reads draft');
    await check(owner(`/api/owner/listings/${listing.id}`,'PATCH',payload),200,'publish again');
    await Promise.all([
      check(owner('/api/owner/listings','POST',{...payload,price:-1}),400,'negative price'),
      check(owner('/api/owner/listings','POST',{...payload,latitude:0,longitude:0}),422,'outside model coverage'),
      check(owner('/api/owner/listings/invalid','PATCH',payload),400,'invalid listing ID'),
      check(owner('/api/owner/listings/999999999999999999999999','PATCH',payload),400,'unsafe integer ID'),
      check(seeker('/api/pencari/favorites','POST',{id:1e100,saved:true}),400,'unsafe favorite ID'),
    ]);
  });

  await t.test('Wizard/favorites roundtrip; survey, application, messages and payment validation',async()=>{
    const original=(await check(seeker('/api/pencari/wizard'),200)).draft;
    assert.ok(original,'Existing demo draft required to preserve exact contents');
    assert.deepEqual((await check(seeker('/api/pencari/wizard','PUT',original),200,'roundtrip existing draft')).draft,original);
    const before=(await check(seeker('/api/pencari/favorites'),200)).ids;
    assert.ok((await check(seeker('/api/pencari/favorites','POST',{id:listing.id,saved:true}),200)).ids.includes(listing.id));
    assert.ok(!(await check(otherSeeker('/api/pencari/favorites'),200)).ids.includes(listing.id));
    assert.deepEqual((await check(seeker('/api/pencari/favorites','POST',{id:listing.id,saved:false}),200)).ids,before);
    await Promise.all([
      check(seeker('/api/pencari/surveys','POST',{listingId:listing.id,date:'2020-01-01',time:'10:00',visitors:2,note:''}),400,'past survey'),
      check(seeker('/api/pencari/applications','POST',{listingId:listing.id}),400,'missing tenant'),
      check(owner(`/api/owner/surveys/${uuid}`,'PATCH',{status:'confirmed'}),404,'missing survey'),
      check(owner(`/api/owner/applications/${uuid}`,'PATCH',{status:'approved'}),404,'missing application'),
      check(owner('/api/owner/applications/invalid','PATCH',{status:'approved'}),400,'invalid request UUID'),
      check(seeker('/api/pencari/messages?listingId=invalid'),400,'invalid message listing'),
      check(seeker('/api/pencari/messages?listingId=999999999999999999999999'),400,'unsafe message listing'),
      check(owner(`/api/owner/messages?listingId=${listing.id}&seekerId=invalid`),400,'invalid participant UUID'),
      check(seeker('/api/pencari/messages','POST',{listingId:listing.id,text:''}),400,'empty message'),
      check(owner('/api/owner/messages','POST',{listingId:listing.id,seekerId:'invalid',text:'Synthetic, must not send'}),400,'invalid participant; no message sent'),
      check(seeker('/api/pencari/payments','POST',{applicationId:uuid,method:'invalid'}),400,'invalid method'),
      check(seeker('/api/pencari/payments','POST',{applicationId:uuid,method:'qris'}),409,'missing payment application'),
      check(seeker('/api/pencari/wizard','PUT',[]),400,'invalid wizard body'),
      check(seeker('/api/pencari/wizard','PUT',{padding:'x'.repeat(40001)}),413,'oversize body'),
    ]);
  });

  await t.test('Documents endpoints: private reads, ID validation, role/origin and method restrictions',async()=>{
    for(const [path,method]of [['/api/documents','GET'],['/api/documents','POST'],[`/api/documents/${uuid}`,'GET'],[`/api/documents/${uuid}`,'DELETE']])await check(guest(path,method,method==='POST'?{}:undefined),401,'private document endpoint');
    await Promise.all([
      check(seeker('/api/documents?applicationId=invalid'),400,'invalid application ID'),
      check(seeker(`/api/documents?applicationId=${uuid}`),200,'nonexistent application list is empty'),
      check(seeker('/api/documents/invalid'),400,'invalid document UUID'),
      check(seeker(`/api/documents/${uuid}`),404,'missing document'),
      check(seeker(`/api/documents/${uuid}`,'DELETE'),404,'missing upload'),
      check(owner('/api/documents','POST',{}),403,'owner cannot upload'),
      check(seeker('/api/documents','POST',{}),400,'invalid multipart upload'),
      check(seeker('/api/documents','POST',{}, {headers:{Origin:'https://untrusted.invalid'}}),403,'cross origin upload'),
      check(owner(`/api/documents/${uuid}`,'DELETE'),403,'owner cannot delete seeker document'),
      check(seeker('/api/documents','PATCH',{}),405,'unsupported method'),
      check(seeker('/api/pencari/account','POST',{}),405,'unsupported account method'),
    ]);
  });
  for(const call of [owner,otherOwner,seeker,otherSeeker])await check(call('/api/auth/logout','POST'),200,'logout');
  await check(owner('/api/owner/account'),401,'session revoked');
});
process.on('exit',persist);
