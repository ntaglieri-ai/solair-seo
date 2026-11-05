import test from 'node:test';
import assert from 'node:assert/strict';
import {canReserve,accountedCost,stopThreshold,budgetPeriod} from '../lib/geo/budget.ts';
const state=(over={})=>({periodAccounted:0,periodLimit:3_000_000,scanAccounted:0,scanLimit:1_500_000,...over});
test('reservation must fit under 80% of both the period and the scan budget',()=>{
  assert.equal(stopThreshold(3_000_000),2_400_000);
  assert.deepEqual(canReserve(state(),250_000),{ok:true});
  assert.deepEqual(canReserve(state({periodAccounted:2_200_000}),250_000),{ok:false,reason:'period_budget'});
  assert.deepEqual(canReserve(state({scanAccounted:1_000_000}),250_000),{ok:false,reason:'scan_budget'});
});
test('invalid or unsafe numbers never allow a reservation',()=>{
  for(const bad of [state({periodAccounted:-1}),state({periodLimit:NaN}),state({scanLimit:1.5})])assert.deepEqual(canReserve(bad,250_000),{ok:false,reason:'invalid'});
  assert.deepEqual(canReserve(state(),0),{ok:false,reason:'invalid'});
});
test('a zero budget blocks every request',()=>{
  assert.equal(canReserve(state({periodLimit:0}),250_000).ok,false);
});
test('unknown cost keeps the whole reservation; known cost rounds up to the microdollar',()=>{
  assert.equal(accountedCost(null,250_000),250_000);
  assert.equal(accountedCost(Number.NaN,250_000),250_000);
  assert.equal(accountedCost(.0123456,250_000),12_346);
});
test('budget period is the UTC calendar month',()=>{
  assert.deepEqual(budgetPeriod('solairgroup.it',new Date('2026-11-05T20:00:00Z')),{id:'solairgroup.it:2026-11',start:'2026-11-01',end:'2026-11-30'});
  assert.deepEqual(budgetPeriod('x.it',new Date('2026-02-28T23:59:00Z')).end,'2026-02-28');
});
