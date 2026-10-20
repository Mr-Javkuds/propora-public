import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {paymentRecords} from '../app/lib/rental-ledger.ts';
const base=process.env.PROPORA_TEST_URL || 'http://localhost:3000';
const run=randomUUID(); const createdListings=[];
function client(){const cookies=new Map();return async(path,method='GET',body)=>{
  const r=await fetch(base+path,{method,headers:{Origin:base,Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),'Content-Type':'application/json','X-Forwarded-For':run},...(body===undefined?{}:{body:JSON.stringify(body)})});
  for(const v of r.headers.getSetCookie()){const pair=v.split(';')[0],at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
  return {status:r.status,body:await r.json()};
};}
async function ok(p){const r=await p;assert.equal(r.status,200,JSON.stringify(r.body));return r.body;}
test('Simulated payment is authorized, idempotent and synchronizes the persisted rental',async()=>{
  const owner=client(),seeker=client(),otherSeeker=client(),secondSession=client();
  for(const [call,email,role] of [[owner,'pemilik@propora.demo','pemilik'],[seeker,'pencari@propora.demo','pencari'],[otherSeeker,'pencari2@propora.demo','pencari'],[secondSession,'pemilik@propora.demo','pemilik']])await ok(call('/api/auth/login','POST',{email,password:'ProporaDemo123!',role}));
  await ok(secondSession('/api/auth/logout','POST'));
  assert.ok((await ok(owner('/api/owner/account'))).user,'Logging out another device must preserve this session');
  const saved=await owner('/api/owner/listings','POST',{name:`QA Payment ${run}`,address:'Semarang',price:50000000,latitude:-6.9827,longitude:110.4091,area:120,image:'/figma/results/ruko-1.jpeg',facilities:[],description:'Synthetic QA payment fixture',status:'available'});
  assert.equal(saved.status,201,JSON.stringify(saved.body));const listing=saved.body.listing;createdListings.push(listing.id);
  const tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000));
  const surveyInput={listingId:listing.id,date:tomorrow,time:'10:00',visitors:2,note:'Synthetic QA visit'};
  assert.equal((await seeker('/api/pencari/surveys','POST',{...surveyInput,date:'2020-01-01'})).status,400);
  const survey=await seeker('/api/pencari/surveys','POST',surveyInput);
  assert.equal(survey.status,201,JSON.stringify(survey.body));
  assert.equal((await seeker('/api/pencari/surveys','POST',surveyInput)).status,409);
  await ok(owner(`/api/owner/surveys/${survey.body.survey.id}`,'PATCH',{status:'confirmed',ownerNote:'Synthetic visit confirmed'}));
  const visibleSurvey=(await ok(seeker('/api/pencari/surveys'))).surveys.find(row=>row.id===survey.body.survey.id);
  assert.equal(visibleSurvey.status,'confirmed'); assert.equal(visibleSurvey.ownerNote,'Synthetic visit confirmed');
  const competing=await otherSeeker('/api/pencari/surveys','POST',surveyInput);
  assert.equal(competing.status,201);
  assert.equal((await owner(`/api/owner/surveys/${competing.body.survey.id}`,'PATCH',{status:'confirmed'})).status,409);
  await ok(owner(`/api/owner/surveys/${competing.body.survey.id}`,'PATCH',{status:'rejected'}));
  const favorites=(await ok(seeker('/api/pencari/favorites'))).ids;
  assert.ok((await ok(seeker('/api/pencari/favorites','POST',{id:listing.id,saved:true}))).ids.includes(listing.id));
  assert.ok(!(await ok(otherSeeker('/api/pencari/favorites'))).ids.includes(listing.id));
  assert.deepEqual((await ok(seeker('/api/pencari/favorites','POST',{id:listing.id,saved:false}))).ids,favorites);
  const submitted=await seeker('/api/pencari/applications','POST',{listingId:listing.id,tenant:{fullName:'Synthetic Payment Test',phone:'081234567890',businessName:'QA Cafe',businessType:'Cafe'},startDate:tomorrow,duration:2,offer:48000000,proposal:'Synthetic fixture',acceptedTerms:true});
  assert.equal(submitted.status,201,JSON.stringify(submitted.body));const a=submitted.body.application;
  const payment={applicationId:a.id,method:'qris'};
  assert.equal((await seeker('/api/pencari/payments','POST',payment)).status,409);
  await ok(owner(`/api/owner/applications/${a.id}`,'PATCH',{status:'approved'}));
  assert.equal((await otherSeeker('/api/pencari/payments','POST',payment)).status,409);
  const {payment:receipt}=await ok(seeker('/api/pencari/payments','POST',payment));
  assert.equal(receipt.amount,96000000); assert.equal(receipt.method,'qris'); assert.match(receipt.id,/^SIM-/);
  const retry=await ok(seeker('/api/pencari/payments','POST',{...payment,method:'va',amount:1}));
  assert.deepEqual(retry.payment,receipt);
  for(const [call,path] of [[owner,'owner'],[seeker,'pencari']]){
    const current=(await ok(call(`/api/${path}/applications`))).applications.find(row=>row.id===a.id);
    assert.equal(current.listingStatus,'rented');assert.deepEqual(current.payment,receipt);
  }
  assert.ok(!(await ok(seeker('/api/listings'))).listings.some(row=>row.id===listing.id));
  await ok(owner(`/api/owner/listings/${listing.id}`,'PATCH',{rentalStatus:'available'}));
  for(const [call,path] of [[owner,'owner'],[seeker,'pencari']]){
    const rows=(await ok(call(`/api/${path}/applications`))).applications;
    const historical=paymentRecords(rows).find(row=>row.id===a.id);
    assert.ok(historical,'Both roles must retain the payment history after closure');
    assert.equal(historical.status,'withdrawn');assert.deepEqual(historical.payment,receipt);
  }
  assert.equal((await seeker('/api/pencari/payments','POST',payment)).status,409);
  for(const call of [owner,seeker,otherSeeker])await ok(call('/api/auth/logout','POST'));
});
process.on('exit',()=>writeFileSync('.data/payment-test-created.json',JSON.stringify({run,createdListings})));
