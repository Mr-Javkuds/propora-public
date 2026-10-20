import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentRecords,estimatedLeaseBoundary,rentalDate,rentalYears} from '../app/lib/rental-ledger.ts';

test('History only includes persisted receipts and keeps payments after closure',()=>{
  const receipts=[
    {id:'unpaid',status:'approved',payment:null},
    {id:'old',status:'withdrawn',payment:{id:'SIM-1',time:'2026-10-15T10:00:00Z',amount:48000000,method:'qris'}},
    {id:'new',status:'approved',payment:{id:'SIM-2',time:'2026-10-16T01:00:00Z',amount:96000000,method:'va'}},
  ];
  const records=paymentRecords(receipts);
  assert.deepEqual(records.map(item=>item.id),['new','old']);
  assert.equal(records.reduce((total,item)=>total+item.payment.amount,0),144000000);
  assert.deepEqual(receipts.map(item=>item.id),['unpaid','old','new']);
});
test('Lease boundary is an anniversary estimate and clamps leap-day dates',()=>{
  assert.equal(estimatedLeaseBoundary('2026-12-01',2),'2028-12-01');
  assert.equal(estimatedLeaseBoundary('2024-02-29',1),'2025-02-28');
  assert.equal(estimatedLeaseBoundary('2024-02-29',4),'2028-02-29');
  assert.equal(estimatedLeaseBoundary('invalid',1),null);
  assert.equal(estimatedLeaseBoundary('2026-12-01',0),null);
});
test('Receipt timestamps use Jakarta time and missing dates are not fabricated',()=>{
  assert.match(rentalDate('2026-10-15T18:30:00Z'),/16 Oktober 2026/);
  assert.match(rentalDate('2026-10-15T18:30:00Z'),/WIB$/);
  assert.equal(rentalDate('invalid'),'Belum tersedia');
});
test('Receipt dates and rental durations follow the selected language',()=>{
  assert.match(rentalDate('2026-10-15T18:30:00Z','en'),/October 16, 2026/);
  assert.match(rentalDate('2026-10-15T18:30:00Z','zh'),/2026年10月16日/);
  assert.equal(rentalYears(1,'en'),'1 year');
  assert.equal(rentalYears(2,'en'),'2 years');
  assert.equal(rentalYears(2,'zh'),'2 年');
});
