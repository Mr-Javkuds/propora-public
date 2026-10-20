import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerClient} from '@supabase/ssr';
try{process.loadEnvFile('.env.local');}catch{}
const base=process.env.PROPORA_TEST_URL || 'http://localhost:3000';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
async function call(path,body,cookies=''){
 const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookies},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 return {status:response.status,data:await response.json()};
}
async function login(email){
 const jar=new Map();const client=createServerClient(url,key,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(({name,value})=>jar.set(name,value))}});
 const result=await client.auth.signInWithPassword({email,password:'ProporaDemo123!'});
 assert.ifError(result.error);
 return {client,user:result.data.user,cookies:[...jar].map(([name,value])=>name+'='+value).join('; ')};
}
async function rows(client,table,query='*') {const {data,error}=await client.from(table).select(query);assert.ifError(error);return data;}
function sameListing(property,row){
 assert.equal(property.id,row.id);assert.equal(property.name,row.name);assert.equal(property.address,row.address);assert.equal(property.price,row.price/1000000);assert.equal(property.building_area_m2,row.area);assert.equal(property.status,row.status);assert.equal(property.latitude,row.latitude);assert.equal(property.longitude,row.longitude);assert.deepEqual(property.facilities,JSON.parse(row.facilities));assert.equal(property.image,row.image);assert.equal(property.competitorCount,null);assert.equal(property.nearestCampusDistance,null);assert.equal(property.photos,null);
}
test('Data displayed by APIs matches Supabase; unknown facts stay unknown',async t=>{
 const guest=createServerClient(url,key,{cookies:{getAll:()=>[],setAll:()=>{}}});
 const all=await rows(guest,'listings');const available=all.filter(row=>row.status==='available');
 const listed=await call('/api/listings');assert.equal(listed.status,200);assert.deepEqual(listed.data.listings.map(p=>p.id).sort(),available.map(p=>p.id).sort());for(const p of listed.data.listings)sameListing(p,all.find(row=>row.id===p.id));
 await t.test('Recommendations, details and persisted model signals agree',async()=>{
  const rec=await call('/api/ml/recommendations',{});assert.equal(rec.status,200);assert.equal(rec.data.center,null);assert.equal(rec.data.radiusMeters,null);
  for(const property of rec.data.recommendations){sameListing(property,all.find(row=>row.id===property.id));const detail=await call('/api/ml/properties/'+property.id);assert.equal(detail.status,200);assert.equal(detail.data.property.propora_score,property.propora_score);assert.equal(detail.data.property.modelVersion,property.modelVersion);const analyses=await rows(guest,'listing_analyses');const analysis=JSON.parse(analyses.find(row=>row.listing_id===property.id).result_json);const variant=analysis.variants.find(v=>v.businessType===property.businessType&&v.trendKeyword===property.trendKeyword);assert.equal(property.propora_score,variant.propora_score);for(const [key,value] of Object.entries(variant.signals))assert.equal(property[key],value);}
 });
 await t.test('Empty results never synthesize data or location metrics',async()=>{
  const empty=await call('/api/demo/location-analysis',{budgetMax:0});assert.equal(empty.status,200);assert.deepEqual(empty.data.recommendations,[]);for(const key of ['score','marketPotential','accessibility','estimatedFootfall','competitorCount','nearestCampusDistance','rentBenchmark'])assert.equal(empty.data[key],null,key);assert.deepEqual(empty.data.nearbyPlaces,[]);
  const unsupported=await call('/api/ml/recommendations',{businessType:'unsupported'});assert.equal(unsupported.status,200);for(const p of unsupported.data.recommendations){assert.equal(p.mlStatus,'pending');assert.equal(p.propora_score,null);assert.equal(p.demand_score,null);assert.equal(p.potential_label,null);}
 });
 await t.test('Input validation and filters do not invent or substitute listings',async()=>{
  for(const body of [{budgetMin:80,budgetMax:20},{radiusMeters:-1},{center:{lat:999,lng:0}},{locationFilters:'Parkir'}])assert.equal((await call('/api/ml/recommendations',body)).status,400);
  assert.equal((await call('/api/ml/properties/not-an-id')).status,400);assert.equal((await call('/api/ml/properties/99999999')).status,404);
  const noFacility=await call('/api/ml/recommendations',{locationFilters:['unrecorded-facility']});assert.deepEqual(noFacility.data.recommendations,[]);
  assert.equal((await call('/api/ml/compare',{ids:[99999998,99999999]})).status,409);assert.equal((await call('/api/ml/compare',{ids:[1,1]})).status,400);
  if(available.length>=2){const compare=await call('/api/ml/compare',{ids:available.slice(0,2).map(p=>p.id)});assert.equal(compare.status,200);for(const p of compare.data.properties)sameListing(p,all.find(row=>row.id===p.id));}
 });
 for(const [email,role] of [['pencari@propora.demo','pencari'],['pemilik@propora.demo','owner'],['pemilik2@propora.demo','owner']])await t.test(role+' private endpoints return only database-owned records',async()=>{
  const session=await login(email);const apps=await rows(session.client,'applications');const surveys=await rows(session.client,'surveys');
  for(const [resource,expected] of [['applications',apps],['surveys',surveys]]){const result=await call('/api/'+role+'/'+resource,undefined,session.cookies);assert.equal(result.status,200);assert.deepEqual(result.data[resource].map(p=>p.id).sort(),expected.map(p=>p.id).sort());if(resource==='applications')for(const app of result.data.applications){const row=apps.find(p=>p.id===app.id);assert.equal(app.status,row.status);assert.equal(app.offer,row.offer);assert.equal(app.duration,row.duration);assert.deepEqual(app.payment,row.payment);const listing=(await rows(session.client,'listings')).find(p=>p.id===row.listing_id);assert.equal(app.listingStatus,listing.status);assert.equal(app.listingName,listing.name);}}
  const dbMessages=await rows(session.client,'messages');
  const conversations=await call('/api/'+role+'/messages',undefined,session.cookies);assert.equal(conversations.status,200);
  const threadKeys=[...new Set(dbMessages.map(m=>m.listing_id+':'+m.seeker_id))].sort();
  assert.deepEqual(conversations.data.conversations.map(m=>m.listingId+':'+m.seekerId).sort(),threadKeys);
  for(const thread of conversations.data.conversations){
    const expected=dbMessages.filter(m=>m.listing_id===thread.listingId && m.seeker_id===thread.seekerId).sort((a,b)=>a.id-b.id);
    assert.equal(thread.lastMessage,expected.at(-1).text);
    const chat=await call('/api/'+role+'/messages?listingId='+thread.listingId+(role==='owner'?'&seekerId='+thread.seekerId:''),undefined,session.cookies);assert.equal(chat.status,200);
    assert.deepEqual(chat.data.messages.map(m=>({id:m.id,text:m.text,senderId:m.senderId})),expected.map(m=>({id:m.id,text:m.text,senderId:m.sender_id})));
  }
  if(apps.length){const documents=await rows(session.client,'application_documents','id,application_id');const result=await call('/api/documents?applicationId='+apps[0].id,undefined,session.cookies);assert.equal(result.status,200);assert.deepEqual(result.data.documents.map(d=>d.id).sort(),documents.filter(d=>d.application_id===apps[0].id).map(d=>d.id).sort());}
  if(role==='pencari'){
    const favorites=await rows(session.client,'favorites');const saved=await call('/api/pencari/favorites',undefined,session.cookies);assert.equal(saved.status,200);assert.deepEqual(saved.data.ids.sort(),favorites.map(f=>f.listing_id).sort());
    const draft=await rows(session.client,'wizard_drafts');const pencari=await call('/api/pencari/wizard',undefined,session.cookies);assert.equal(pencari.status,200);assert.deepEqual(pencari.data.draft,draft.length?JSON.parse(draft[0].data):null);
  }
  const identity=await call('/api/'+role+'/account',undefined,session.cookies);assert.equal(identity.data.user.id,session.user.id);
  if(role==='owner'){const dbListings=(await rows(session.client,'listings')).filter(p=>p.owner_id===session.user.id);const result=await call('/api/owner/listings',undefined,session.cookies);assert.deepEqual(result.data.listings.map(p=>p.id).sort(),dbListings.map(p=>p.id).sort());for(const p of result.data.listings){const row=dbListings.find(r=>r.id===p.id);assert.equal(p.price,row.price);assert.equal(p.status,row.status);}}
 });
 await t.test('Guests cannot read private records',async()=>{for(const path of ['/api/pencari/applications','/api/owner/listings','/api/pencari/account','/api/owner/messages'])assert.equal((await call(path)).status,401);});
});
