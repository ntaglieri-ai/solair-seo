import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),Module=require('node:module');
const state={configured:true,enabled:true,lease:true,releases:0,history:[],daily:0,asks:[],writes:[],quota:false};
const original=Module._load,extension=require.extensions['.ts'];
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
async function sql(strings,...values){
  const query=strings.join('?');
  if(query.includes('select id, model'))return state.history;
  if(query.includes('count(*)'))return [{count:state.daily}];
  if(query.includes('select name'))return [{name:'Enpal'}];
  state.writes.push({query,values});
  if(query.includes('insert into seo.ai_check_batches'))return [{id:'batch-id'}];
  return [];
}
sql.json=value=>value;
Module._load=function(id,...rest){
  if(id==='server-only')return {};
  if(id==='./db')return {getSql:()=>sql};
  if(id==='./engine/store')return {getEngineSettings:async()=>({enabled:state.enabled,analysisDays:7}),acquireLease:async()=>state.lease?'lease':null,releaseLease:async()=>{state.releases++}};
  if(id==='./ai-provider')return {aiConfigured:()=>state.configured,askAi:async(question)=>{
    state.asks.push(question);return {question,status:state.quota?'error':'ok',error:state.quota?'quota':null,mentionsBrand:state.quota?null:false,answer:state.quota?'':'Una risposta reale del modello senza Solair.',observedAt:new Date().toISOString(),mentionedCompetitors:[]};
  }};
  return original.call(this,id,...rest);
};
const {collectAiChecks}=require('../lib/ai-collection.ts');
const {AI_MODEL,AI_PROTOCOL}=require('../lib/ai-checks.ts');
Module._load=original;if(extension)require.extensions['.ts']=extension;else delete require.extensions['.ts'];
const reset=()=>Object.assign(state,{configured:true,enabled:true,lease:true,releases:0,history:[],daily:0,asks:[],writes:[],quota:false});
test('AI collector honors missing credentials, disabled scheduling, shared lease and fixed site',async()=>{
  reset();state.configured=false;assert.equal((await collectAiChecks('solairgroup.it','manual')).status,'not_configured');
  reset();state.enabled=false;assert.equal((await collectAiChecks('solairgroup.it','cron')).status,'disabled');assert.equal(state.asks.length,0);
  state.lease=false;assert.equal((await collectAiChecks('solairgroup.it','manual')).status,'already_running');
  await assert.rejects(()=>collectAiChecks('other.it','manual'));assert.equal(state.asks.length,0);
});
test('AI collector persists per-question evidence without writing a SEO report or calling Google metrics',async()=>{
  reset();const result=await collectAiChecks('solairgroup.it','manual');assert.equal(result.status,'complete');assert.equal(result.measured,4);assert.equal(state.asks.length,4);
  assert.equal(state.releases,1);assert.equal(state.writes.filter(w=>w.query.includes('set results=')).length,2);
  assert.ok(state.writes.every(w=>w.query.includes('seo.ai_check_batches')));
  assert.ok(state.asks.every(q=>!/solair/i.test(q)));
});
test('AI collection never counts quota failures as missing brand; remaining requests are skipped',async()=>{
  reset();state.quota=true;const result=await collectAiChecks('solairgroup.it','manual');assert.equal(result.status,'failed');assert.equal(result.measured,0);assert.equal(state.asks.length,2);
  const writes=state.writes.filter(w=>w.query.includes('set results='));assert.equal(writes.at(-1).values[0].length,4);
  assert.ok(writes.at(-1).values[0].every(answer=>answer.mentionsBrand===null));assert.equal(state.releases,1);
});
test('AI scheduler respects cadence; cooldown and daily cap survive separate requests',async()=>{
  reset();state.history=[{status:'complete',model:AI_MODEL,protocol:AI_PROTOCOL,createdAt:new Date(),questions:[]}];
  assert.equal((await collectAiChecks('solairgroup.it','cron')).status,'not_due');assert.equal(state.asks.length,0);
  assert.equal((await collectAiChecks('solairgroup.it','manual')).status,'cooldown');assert.equal(state.asks.length,0);
  reset();state.daily=6;assert.equal((await collectAiChecks('solairgroup.it','manual')).status,'daily_limit');assert.equal(state.asks.length,0);assert.equal(state.releases,1);
});
