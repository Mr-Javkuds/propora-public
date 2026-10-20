import test from 'node:test';
import assert from 'node:assert/strict';
import {roleDestination,safeReturnTo} from '../app/lib/auth-policy.ts';

test('Owner chat links preserve the listing through middleware and login',()=>{
  assert.equal(roleDestination('/pencari/chat','?listingId=42','pemilik'),'/owner?view=messages&listingId=42');
  assert.equal(safeReturnTo('/pencari/chat?listingId=42','pemilik'),'/owner?view=messages&listingId=42');
  assert.equal(safeReturnTo('/pencari/chat?listingId=42','pencari'),'/pencari/chat?listingId=42');
  assert.equal(roleDestination('/pencari/booking','?listingId=42','pemilik'),'/owner?view=messages&listingId=42');
});

test('Role redirects reject unsafe destinations and invalid listing IDs',()=>{
  for (const value of ['https://example.com','//example.com','/\\example.com']) assert.equal(safeReturnTo(value,'pemilik'),'/owner');
  for (const id of ['-1','abc','9007199254740992']) assert.equal(safeReturnTo(`/pencari/chat?listingId=${id}`,'pemilik'),'/owner?view=messages');
  assert.equal(safeReturnTo('/owner?view=messages','pencari'),'/pencari');
});
