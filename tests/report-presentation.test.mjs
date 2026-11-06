import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPage,reportReading,reportText} from '../lib/report-presentation.ts';
const totals={clicks:10,impressions:100,ctr:.1,position:4};
test('executive report distinguishes growth, decline and unchanged clicks without assigning a cause',()=>{
  assert.match(reportReading({...totals,clicks:12,impressions:90},totals).title,/Più clic.*meno impressioni/);
  assert.match(reportReading({...totals,clicks:12,impressions:110},totals).title,/più clic/);
  assert.match(reportReading({...totals,clicks:8},totals).title,/diminuiti/);
  assert.match(reportReading(totals,totals).title,/stabili/);
  assert.match(reportReading({...totals,clicks:0},{...totals,clicks:0}).title,/Nessun clic/);
  assert.match(reportReading({...totals,clicks:8},totals).text,/non ne identifica la causa/);
});
test('a change within five percent is stable, not a decline or a growth',()=>{
  const a={clicks:255,impressions:2307,ctr:.111,position:7},b={clicks:257,impressions:2391,ctr:.107,position:7.2};
  assert.match(reportReading(a,b).title,/stabili/);assert.match(reportReading(b,a).title,/stabili/);
  assert.match(reportReading({...totals,clicks:11},totals).title,/più clic/);
  assert.match(reportReading({...totals,clicks:9},totals).title,/diminuiti/);
  assert.match(reportReading({...totals,clicks:10,impressions:300},totals).title,/stabili/);
});
test('archive pagination accepts only bounded positive integer pages',()=>{
  assert.equal(reportPage('2'),2);
  for(const value of [undefined,'0','-1','2.5','x','1000000',['2']])assert.equal(reportPage(value),1);
});
test('older archived recommendations without expected outcomes remain readable',()=>{
  assert.equal(reportText(undefined),'Non specificato in questa rilevazione.');
  assert.equal(reportText(null),'Non specificato in questa rilevazione.');
  assert.equal(reportText("puo' essere piu' chiaro"),'può essere più chiaro');
});
