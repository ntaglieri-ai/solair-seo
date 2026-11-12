import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isDue } from '../lib/engine/settings.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/report-documents/schedule.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const NOW=new Date('2026-12-05T06:00:00Z');
const daysAgo=(n)=>new Date(NOW.getTime()-n*86400000);
function harness({enabled=true,lease=true,analysisDays=90,startupCreatedAt=daysAgo(200),scheduleLastGeneratedAt=null,pending=false,fail=false,document={id:'pdf',reused:false}}={}){
 const calls={generated:0,updated:0,released:0,kind:null};
 const sql=async(strings)=>{
  const q=strings.join('?');
  if(q.includes("kind='startup'"))return startupCreatedAt?[{createdAt:startupCreatedAt}]:[];
  if(q.includes('report_pdf_schedule')&&q.includes('select'))return scheduleLastGeneratedAt?[{lastGeneratedAt:scheduleLastGeneratedAt}]:[];
  if(q.includes('select status'))return [{status:pending?'running':'done'}];
  if(q.includes('insert into')){calls.updated++;return [];}
  throw Error(q);
 };
 const deps={'server-only':{},'../db':{getSql:()=>sql},'../engine/collect':{getSites:async()=>[{id:'solairgroup.it'},{id:'another-site'}]},'../engine/store':{acquireLease:async()=>lease,getEngineSettings:async()=>({enabled,analysisDays}),releaseLease:async()=>{calls.released++;}},'../engine/settings':{isDue},'./store':{generateReportDocument:async({kind,trigger})=>{assert.equal(trigger,'scheduled');calls.kind=kind;calls.generated++;if(fail)throw Error('render failed');return document;}}};
 const loaded={exports:{}};vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,require:k=>deps[k],Date});return {run:(now=NOW)=>loaded.exports.generateScheduledDocuments(now),calls};
}
test('periodic report respects disabled settings, lease and start-up',async()=>{
 for(const [options,status] of [[{enabled:false},'disabled'],[{lease:false},'already_running'],[{startupCreatedAt:null},'waiting_for_startup']]){
  const h=harness(options);assert.equal((await h.run())[0].status,status);assert.equal(h.calls.generated,0);assert.equal(h.calls.updated,0);
 }
});
test('not due yet: cadence counts from the last periodic report, or from start-up if there is none',async()=>{
 // Start-up 10 days ago, no periodic report yet, cadence 90 days: not due.
 let h=harness({startupCreatedAt:daysAgo(10),scheduleLastGeneratedAt:null,analysisDays:90});
 assert.equal((await h.run())[0].status,'not_due');assert.equal(h.calls.generated,0);
 // A periodic report ran 5 days ago: not due, even though start-up was long ago.
 h=harness({startupCreatedAt:daysAgo(300),scheduleLastGeneratedAt:daysAgo(5),analysisDays:90});
 assert.equal((await h.run())[0].status,'not_due');assert.equal(h.calls.generated,0);
});
test('due: cadence elapsed since start-up (no periodic report yet) generates one',async()=>{
 const h=harness({startupCreatedAt:daysAgo(91),scheduleLastGeneratedAt:null,analysisDays:90});
 const results=await h.run();
 assert.equal(results[0].status,'generated');assert.equal(h.calls.generated,1);assert.equal(h.calls.kind,'monthly');
});
test('due: cadence elapsed since the last periodic report generates another',async()=>{
 const h=harness({startupCreatedAt:daysAgo(400),scheduleLastGeneratedAt:daysAgo(91),analysisDays:90});
 const results=await h.run();
 assert.equal(results[0].status,'generated');assert.equal(h.calls.generated,1);
});
test('pending Gemini waits without advancing the schedule or creating paid calls',async()=>{
 const h=harness({pending:true});assert.equal((await h.run())[0].status,'waiting_for_geo');assert.equal(h.calls.updated,0);assert.equal(h.calls.generated,0);assert.equal(h.calls.released,1);
});
test('periodic document is generated as kind monthly; missing evidence does not advance',async()=>{
 for(const document of [{id:'pdf',reused:false},{id:'pdf',reused:true},null]){
  const h=harness({document});const results=await h.run();assert.equal(results.length,1);assert.equal(h.calls.generated,1);assert.equal(h.calls.kind,'monthly');assert.equal(h.calls.updated,document?1:0);assert.equal(h.calls.released,1);
 }
});
test('failed generation releases lease without marking delivery successful',async()=>{
 const h=harness({fail:true});await assert.rejects(h.run(),/render failed/);assert.equal(h.calls.updated,0);assert.equal(h.calls.released,1);
});
