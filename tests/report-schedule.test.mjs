import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { isDue } from '../lib/engine/settings.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/report-documents/schedule.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness({enabled=true,lease=true,last=null,pending=false,fail=false,document={id:'pdf',reused:false}}={}){
 const calls={generated:0,updated:0,released:0};
 const sql=async(strings)=>{
  const q=strings.join('?');
  if(q.includes('select last_generated_at'))return last?[{lastGeneratedAt:last}]:[];
  if(q.includes('select status'))return [{status:pending?'running':'done'}];
  if(q.includes('insert into')){calls.updated++;return [];}
  throw Error(q);
 };
 const deps={'server-only':{},'../db':{getSql:()=>sql},'../engine/collect':{getSites:async()=>[{id:'solairgroup.it'},{id:'another-site'}]},'../engine/store':{acquireLease:async()=>lease,getEngineSettings:async()=>({enabled,analysisDays:7}),releaseLease:async()=>{calls.released++;}},'../engine/settings':{isDue},'./store':{generateReportDocument:async({trigger})=>{assert.equal(trigger,'scheduled');calls.generated++;if(fail)throw Error('render failed');return document;}}};
 const loaded={exports:{}};vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,require:k=>deps[k],Date});return {run:loaded.exports.generateScheduledDocuments,calls};
}
test('automatic PDF respects disabled settings, site lease and configured cadence',async()=>{
 for(const [options,status] of [[{enabled:false},'disabled'],[{lease:false},'already_running'],[{last:new Date()},'not_due']]){
  const h=harness(options);assert.equal((await h.run())[0].status,status);assert.equal(h.calls.generated,0);assert.equal(h.calls.updated,0);
 }
});
test('pending Gemini waits without advancing the PDF schedule or creating paid calls',async()=>{
 const h=harness({pending:true});assert.equal((await h.run())[0].status,'waiting_for_geo');assert.equal(h.calls.updated,0);assert.equal(h.calls.generated,0);assert.equal(h.calls.released,1);
});
test('successful and unchanged PDFs advance cadence, missing evidence does not',async()=>{
 for(const document of [{id:'pdf',reused:false},{id:'pdf',reused:true},null]){
  const h=harness({document});const results=await h.run();assert.equal(results.length,1);assert.equal(h.calls.generated,1);assert.equal(h.calls.updated,document?1:0);assert.equal(h.calls.released,1);
 }
});
test('failed PDF generation releases lease without marking delivery successful',async()=>{
 const h=harness({fail:true});await assert.rejects(h.run(),/render failed/);assert.equal(h.calls.updated,0);assert.equal(h.calls.released,1);
});
