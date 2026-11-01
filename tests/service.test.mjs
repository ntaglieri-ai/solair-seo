import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTrend,validateAudit} from '../lib/audit-trend.ts';
import {newWorkItem,transitionWork,workStatus,comparisonWindow,tasksFor} from '../lib/interventions.ts';
import {operatorKey,validOperatorKey,operatorToken,validOperatorToken} from '../lib/operator.ts';
import {reportQuality} from '../lib/configurator.ts';
const proposal={id:'ctr:/faq:solair',kind:'ctr',page:'/faq',query:'solair',evidence:{clicks:0},action:'Rivedere il risultato',expectedOutcome:'Verificare il CTR'};
const now='2026-11-01T12:00:00Z';
test('service launch hides May and only compares audits of the same method',()=>{
  const may={id:'may',date:'2026-05-01',score:76,methodology:'pdf',service:false,startsService:false};
  const first={id:'first',date:'2026-11-02',score:71,methodology:'full-v1',service:true,startsService:true};
  const second={...first,id:'second',date:'2026-12-02',score:80,startsService:false};
  assert.equal(auditTrend([may]).latest.id,'may');
  const trend=auditTrend([second,may,first]);
  assert.deepEqual(trend.points.map(p=>p.id),['first','second']);assert.equal(trend.difference,9);
  assert.equal(auditTrend([may,first,{...second,methodology:'changed'}]).difference,null);
  assert.deepEqual(auditTrend([may,first]).points,[first]);
});
test('audit publication requires real metadata and cannot accept invalid or future dates',()=>{
  const audit={date:'2026-11-01',score:70,methodology:'full-v1',source:'Audit completo validato',startsService:true};
  assert.equal(validateAudit(audit,'2026-11-01').score,70);
  for(const patch of [{score:101},{score:NaN},{score:70.5},{date:'2026-02-30'},{date:'2027-01-01'},{source:''},{methodology:''},{startsService:'true'}])assert.throws(()=>validateAudit({...audit,...patch},'2026-11-01'));
});
test('checklist approval, completion, evidence and reopening are distinct and revision-guarded',()=>{
  let w=newWorkItem(proposal);assert.equal(workStatus(w),'Da approvare');
  assert.throws(()=>transitionWork(w,{revision:0,operation:'task',taskId:'title',done:true},now));
  w=transitionWork(w,{revision:0,operation:'approve'},now);assert.equal(workStatus(w),'Da fare');
  assert.throws(()=>transitionWork(w,{revision:0,operation:'complete'},now));
  assert.throws(()=>transitionWork(w,{revision:w.revision,operation:'complete'},now));
  for(const task of w.tasks)w=transitionWork(w,{revision:w.revision,operation:'task',taskId:task.id,done:true},now);
  w=transitionWork(w,{revision:w.revision,operation:'complete'},now);assert.equal(workStatus(w),'Completato');assert.equal(w.completedAt,now);
  assert.throws(()=>transitionWork(w,{revision:w.revision,operation:'task',taskId:'title',done:false},now));
  assert.throws(()=>transitionWork(w,{revision:w.revision,operation:'verify',note:''},now));
  w=transitionWork(w,{revision:w.revision,operation:'verify',note:'Verificato title aggiornato nella pagina pubblicata.'},now);assert.equal(workStatus(w),'Verificato');
  w=transitionWork(w,{revision:w.revision,operation:'reopen'},now);assert.equal(workStatus(w),'Da fare');assert.equal(w.measurement,null);
});
test('technical checklist includes only actual supported issues, not generic checks',()=>{
  const tasks=tasksFor({...proposal,kind:'technical',evidence:{issues:['1 immagini senza alt (-2)','Title fuori range (70 char) (-7)','Title mancante (-15)']}});
  assert.deepEqual(tasks.map(t=>t.id),['alt','title']);
  assert.deepEqual(comparisonWindow(now),{from:'2026-11-02',to:'2026-11-29'});
});
test('operator key cannot be used as cookie, sessions expire and cannot be tampered with',()=>{
  const secret='test-only-secret-for-unit-tests';const time=Date.parse(now);const key=operatorKey(secret),token=operatorToken(secret,time);
  assert.equal(validOperatorKey(key,secret),true);assert.equal(validOperatorKey('é'.repeat(40),secret),false);
  assert.equal(validOperatorToken(token,secret,time),true);
  for(const bad of [key,token+'a',token.replace(/^\d/, '9'),undefined])assert.equal(validOperatorToken(bad,secret,time),false);
  assert.equal(validOperatorToken(token,'wrong',time),false);assert.equal(validOperatorToken(token,secret,time+8*3600000),false);
});
test('GA4 thresholding and sampling are explicit limitations rather than reliable zeroes',()=>{
  assert.deepEqual(reportQuality({}),[]);assert.equal(reportQuality({subjectToThresholding:true}).length,1);
  assert.equal(reportQuality({samplingMetadatas:[{}],dataLossFromOtherRow:true}).length,2);
});
