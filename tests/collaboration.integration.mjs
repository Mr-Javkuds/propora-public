import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('.data',{recursive:true});
const base = process.env.PROPORA_TEST_URL || 'http://localhost:3108';
const run = randomUUID();
const createdListings = [];
const createdDocuments = [];
const pdf = '%PDF-1.4\n% Propora synthetic test document\n%%EOF\n';
function client() {
  const cookies = new Map();
  return async (path, method='GET', body, origin=base) => {
    const multipart = body instanceof FormData;
    const response = await fetch(base+path,{method,redirect:'manual',headers:{Origin:origin,Cookie:[...cookies].map(([key,value])=>`${key}=${value}`).join('; '),'X-Forwarded-For':run,...(multipart ? {} : {'Content-Type':'application/json'})},...(body===undefined ? {} : {body:multipart ? body : JSON.stringify(body)})});
    for (const value of response.headers.getSetCookie()) {const pair=value.split(';')[0];const at=pair.indexOf('=');cookies.set(pair.slice(0,at),pair.slice(at+1));}
    const type=response.headers.get('content-type') || '';
    return {status:response.status,body:type.includes('application/json') ? await response.json() : await response.text(),headers:response.headers};
  };
}
async function ok(request,status=200) {const result=await request;assert.equal(result.status,status,JSON.stringify(result.body));return result.body;}
async function upload(call,listingId,kind='ktp',content=pdf,mime='application/pdf') {
  const body=new FormData();body.set('listingId',String(listingId));body.set('kind',kind);body.set('file',new File([content],`${kind}.pdf`,{type:mime}));
  return call('/api/documents','POST',body);
}
test('Private documents, owner initiated chat and complete rental flow',async t=>{
  const owner=client(),otherOwner=client(),seeker=client(),otherSeeker=client(),guest=client();
  const users=[];
  for (const [call,email,role] of [[owner,'pemilik@propora.demo','pemilik'],[otherOwner,'pemilik2@propora.demo','pemilik'],[seeker,'pencari@propora.demo','pencari'],[otherSeeker,'pencari2@propora.demo','pencari']]) users.push((await ok(call('/api/auth/login','POST',{email,password:'ProporaDemo123!',role}))).user);
  const payload={name:`QA Collaboration ${run}`,address:'Semarang Tengah',price:50000000,latitude:-6.9827,longitude:110.4091,area:120,image:'/figma/results/ruko-1.jpeg',facilities:['Parkir'],description:'Synthetic QA fixture',status:'available'};
  const listing=(await ok(owner('/api/owner/listings','POST',payload),201)).listing;
  createdListings.push(listing.id);
  let ktp,npwp,application;
  await t.test('Validates document bytes, sizes and authenticated uploader',async()=>{
    assert.equal((await upload(guest,listing.id)).status,401);
    assert.equal((await upload(owner,listing.id)).status,403);
    assert.equal((await upload(seeker,listing.id,'ktp','fake PDF')).status,400);
    assert.equal((await upload(seeker,listing.id,'ktp','x'.repeat(5*1024*1024+1))).status,400);
    ktp=(await ok(upload(seeker,listing.id),201)).document;
    npwp=(await ok(upload(seeker,listing.id,'npwp'),201)).document;
    createdDocuments.push(ktp.id,npwp.id);
    assert.equal((await owner(`/api/documents/${ktp.id}`)).status,404);
    assert.equal((await otherSeeker(`/api/documents/${ktp.id}`)).status,404);
    const own=await seeker(`/api/documents/${ktp.id}`);
    assert.equal(own.status,307);
    assert.equal(await (await fetch(own.headers.get('location'))).text(),pdf);
  });
  const tomorrow=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+86400000));
  const proposal={listingId:listing.id,tenant:{fullName:'Synthetic Applicant',phone:'081234567890',businessName:'Test Cafe',businessType:'Cafe'},startDate:tomorrow,duration:1,offer:48000000,proposal:'Synthetic proposal',acceptedTerms:true,documents:[ktp.id,npwp.id]};
  await t.test('Attaches uploaded documents atomically and prevents document theft',async()=>{
    assert.equal((await otherSeeker('/api/pencari/applications','POST',proposal)).status,409);
    assert.ok(!(await ok(otherSeeker('/api/pencari/applications'))).applications.some(item=>item.listingId===listing.id));
    application=(await ok(seeker('/api/pencari/applications','POST',proposal),201)).application;
    assert.equal((await ok(owner(`/api/documents?applicationId=${application.id}`))).documents.length,2);
    assert.deepEqual((await ok(otherOwner(`/api/documents?applicationId=${application.id}`))).documents,[]);
    assert.equal((await otherOwner(`/api/documents/${ktp.id}`)).status,404);
    assert.equal((await seeker(`/api/documents/${ktp.id}`,'DELETE')).status,404);
    const downloaded=await owner(`/api/documents/${ktp.id}`);
    assert.equal(downloaded.status,307);
    assert.equal(await (await fetch(downloaded.headers.get('location'))).text(),pdf);
  });
  await t.test('Owner starts chat from application and messages reach both inboxes',async()=>{
    const thread={listingId:listing.id,seekerId:users[2].id,text:'Owner starts an application conversation'};
    const first=(await ok(owner('/api/owner/messages','POST',thread),201)).messages;
    assert.equal(first[0].senderRole,'pemilik');
    const inbox=(await ok(seeker('/api/pencari/messages'))).conversations.find(item=>item.listingId===listing.id);
    assert.equal(inbox.lastMessage,thread.text);
    const reply=(await ok(seeker('/api/pencari/messages','POST',{listingId:listing.id,text:'Seeker replies'}),201)).messages;
    assert.equal(reply.length,2);
    const persisted=(await ok(owner(`/api/owner/messages?listingId=${listing.id}&seekerId=${users[2].id}`))).messages;
    assert.deepEqual(persisted,reply);
    assert.deepEqual(persisted.map(item=>item.senderRole),['pemilik','pencari']);
    assert.equal((await ok(owner('/api/owner/messages'))).conversations.find(item=>item.listingId===listing.id).lastMessage,'Seeker replies');
    const redirect=await owner(`/pencari/chat?listingId=${listing.id}`);
    assert.equal(redirect.status,307);
    assert.equal(new URL(redirect.headers.get('location'),base).href,`${base}/owner?view=messages&listingId=${listing.id}`);
    assert.equal((await seeker('/api/owner/messages')).status,403);
    assert.equal((await owner('/api/pencari/messages')).status,403);
    assert.equal((await otherOwner('/api/owner/messages','POST',thread)).status,404);
    assert.deepEqual((await ok(otherSeeker(`/api/pencari/messages?listingId=${listing.id}`))).messages,[]);
    await ok(otherSeeker('/api/pencari/messages','POST',{listingId:listing.id,text:'Client starts a new conversation'}),201);
    const incoming=(await ok(owner('/api/owner/messages'))).conversations.find(item=>item.listingId===listing.id && item.seekerId===users[3].id);
    assert.equal(incoming.lastMessage,'Client starts a new conversation');
    const answered=(await ok(owner('/api/owner/messages','POST',{listingId:listing.id,seekerId:users[3].id,text:'Owner replies to client'}),201)).messages;
    assert.deepEqual(answered.map(item=>item.senderRole),['pencari','pemilik']);
    assert.deepEqual((await ok(otherSeeker(`/api/pencari/messages?listingId=${listing.id}`))).messages,answered);
  });
  await t.test('Owner can approve, mark rented and end rental with valid transitions only',async()=>{
    assert.equal((await owner(`/api/owner/listings/${listing.id}`,'PATCH',{rentalStatus:'rented'})).status,409);
    await ok(owner(`/api/owner/applications/${application.id}`,'PATCH',{status:'approved'}));
    assert.equal((await otherOwner(`/api/owner/listings/${listing.id}`,'PATCH',{rentalStatus:'rented'})).status,404);
    await ok(owner(`/api/owner/listings/${listing.id}`,'PATCH',{rentalStatus:'rented'}));
    let current=(await ok(seeker('/api/pencari/applications'))).applications.find(item=>item.id===application.id);
    assert.equal(current.listingStatus,'rented');
    assert.equal((await owner(`/api/owner/listings/${listing.id}`,'PATCH',{rentalStatus:'rented'})).status,409);
    await ok(owner(`/api/owner/listings/${listing.id}`,'PATCH',{rentalStatus:'available'}));
    current=(await ok(seeker('/api/pencari/applications'))).applications.find(item=>item.id===application.id);
    assert.equal(current.status,'withdrawn');assert.equal(current.listingStatus,'available');
    assert.equal((await owner(`/api/documents/${ktp.id}`)).status,307);
  });
  await t.test('Unsubmitted upload can be removed safely',async()=>{
    const extra=(await ok(upload(otherSeeker,listing.id),201)).document;
    await ok(otherSeeker(`/api/documents/${extra.id}`,'DELETE'));
    assert.equal((await otherSeeker(`/api/documents/${extra.id}`)).status,404);
  });
  for (const call of [owner,otherOwner,seeker,otherSeeker]) await ok(call('/api/auth/logout','POST'));
});
process.on('exit',()=>writeFileSync('.data/collaboration-test-created.json',JSON.stringify({run,createdListings,createdDocuments})));
