import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { lastCompleteMonth } from '../lib/report-documents/windows.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/report-documents/schedule.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const NOW=new Date('2026-12-05T06:00:00Z');
function harness({enabled=true,lease=true,startup=true,monthly=false,pending=false,fail=false,document={id:'pdf',reused:false}}={}){
 const calls={generated:0,updated:0,released:0,kind:null};
 const sql=async(strings)=>{
  const q=strings.join('?');
  if(q.includes("kind='startup'"))return startup?[{}]:[];
  if(q.includes("kind='monthly'"))return monthly?[{}]:[];
  if(q.includes('select status'))return [{status:pending?'running':'done'}];
  if(q.includes('insert into')){calls.updated++;return [];}
  throw Error(q);
 };
 const deps={'server-only':{},'../db':{getSql:()=>sql},'../engine/collect':{getSites:async()=>[{id:'solairgroup.it'},{id:'another-site'}]},'../engine/store':{acquireLease:async()=>lease,getEngineSettings:async()=>({enabled}),releaseLease:async()=>{calls.released++;}},'./windows':{lastCompleteMonth},'./store':{generateReportDocument:async({kind,trigger})=>{assert.equal(trigger,'scheduled');calls.kind=kind;calls.generated++;if(fail)throw Error('render failed');return document;}}};
 const loaded={exports:{}};vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,require:k=>deps[k],Date});return {run:(now=NOW)=>loaded.exports.generateScheduledDocuments(now),calls};
}
test('monthly report respects disabled settings, lease, start-up, existing month and day of month',async()=>{
 for(const [options,status,now] of [[{enabled:false},'disabled'],[{lease:false},'already_running'],[{startup:false},'waiting_for_startup'],[{monthly:true},'not_due'],[{},'not_due',new Date('2026-12-02T06:00:00Z')]]){
  const h=harness(options);assert.equal((await h.run(now))[0].status,status);assert.equal(h.calls.generated,0);assert.equal(h.calls.updated,0);
 }
});
test('pending Gemini waits without advancing the schedule or creating paid calls',async()=>{
 const h=harness({pending:true});assert.equal((await h.run())[0].status,'waiting_for_geo');assert.equal(h.calls.updated,0);assert.equal(h.calls.generated,0);assert.equal(h.calls.released,1);
});
test('monthly document is generated as kind monthly; missing evidence does not advance',async()=>{
 for(const document of [{id:'pdf',reused:false},{id:'pdf',reused:true},null]){
  const h=harness({document});const results=await h.run();assert.equal(results.length,1);assert.equal(h.calls.generated,1);assert.equal(h.calls.kind,'monthly');assert.equal(h.calls.updated,document?1:0);assert.equal(h.calls.released,1);
 }
});
test('failed generation releases lease without marking delivery successful',async()=>{
 const h=harness({fail:true});await assert.rejects(h.run(),/render failed/);assert.equal(h.calls.updated,0);assert.equal(h.calls.released,1);
});
