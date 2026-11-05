import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { comparableAnswers } from '../lib/geo/comparison.ts';

const compiled = ts.transpileModule(readFileSync(new URL('../lib/geo/run-scan.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness({ frequency='weekly', blocked=false, priorReason=null, providerFailure=false }={}) {
  const calls={ ask:0, verify:0, open:0, release:0, updates:[], finishes:[] };
  const settings={siteId:'solairgroup.it',enabled:true,engine:'gemini',frequency,promptSetVersion:'v1',requestReserveMicrousd:250000};
  const rows=blocked||priorReason ? [{id:'r0',promptId:'old',result:{complete:true,citations:[{url:'https://redirect.example/x',verification:'not_verified'}]}}] : [];
  const store={FREQUENCY_DAYS:{weekly:7,biweekly:14,monthly:30},getGeoSettings:async()=>settings,getGeoScans:async()=>[{status:'running',startedAt:new Date(Date.now()-90000000)}],openOrCreateScan:async()=>{calls.open++;return {scan:{id:'s',stopReason:priorReason}}},getCompetitorNames:async()=>[],getGeoRequests:async()=>rows,reserveRequest:async()=>blocked?{status:'blocked',reason:'period_budget'}:{status:'reserved',id:'r1',reserve:250000},finishRequest:async(id,result,reserve,error)=>{calls.finishes.push({result,reserve,error});rows.push({id,promptId:'new',result})},updateScan:async(id,u)=>calls.updates.push(u),saveVerifiedResult:async(id,result)=>{rows.find(r=>r.id===id).result=result}};
  const ask=async()=>{calls.ask++;if(providerFailure)throw Error('sk-secret');return {actualModel:'model'}};
  const deps={'server-only':{},'../engine/store':{acquireLease:async()=>true,releaseLease:async()=>{calls.release++}},'../geo-pilot/adapters/gemini':{askGeminiWithSearch:ask},'../geo-pilot/adapters/openai':{},'../geo-pilot/source-check':{checkSource:async()=>{calls.verify++;return {verification:'reachable',finalUrl:'https://solairgroup.it/'}}},'./answer':{buildGeoAnswer:()=>({complete:true,citations:[]}),errorCode:()=> 'provider_or_timeout',pendingVerification:a=>a.flatMap(x=>x.citations).filter(c=>c.verification==='not_verified').map(c=>c.url),withVerifiedCitations:(answer,verified)=>({...answer,citations:answer.citations.map(c=>({...c,...verified.get(c.url)})),citedSolair:true})},'./prompts':{getPromptSet:()=>({prompts:[{id:'new',text:'Q'}]})},'./store':store};
  const loaded={exports:{}};
  vm.runInNewContext(compiled,{exports:loaded.exports,module:loaded,require:key=>{if(!(key in deps))throw Error(key);return deps[key]},process:{env:{GEO_LEVEL2_ENABLED:'true',GEMINI_API_KEY:'dummy'}},Date,Set,Map,Promise});
  return {run:loaded.exports.runGeoScan,calls,rows};
}
test('daily cron never resumes a manual-only paid scan',async()=>{
  const h=harness({frequency:'manual'});assert.equal((await h.run('solairgroup.it','scheduled')).status,'not_due');assert.equal(h.calls.ask,0);assert.equal(h.calls.open,0);
});
test('budget stop still resolves collected sources and closes a partial scan',async()=>{
  const h=harness({blocked:true});const result=await h.run('solairgroup.it','manual');assert.equal(result.status,'partial');assert.equal(h.calls.ask,0);assert.equal(h.calls.verify,1);assert.equal(h.rows[0].result.citedSolair,true);assert.equal(h.calls.release,1);
});
test('resuming source verification preserves the budget stop and makes no paid request',async()=>{
  const h=harness({priorReason:'scan_budget'});const result=await h.run('solairgroup.it','manual');assert.equal(result.status,'partial');assert.equal(result.stopReason,'scan_budget');assert.equal(h.calls.ask,0);assert.equal(h.calls.verify,1);
});
test('provider failure keeps the reservation uncertain without automatic retry',async()=>{
  const h=harness({providerFailure:true});const result=await h.run('solairgroup.it','manual');assert.equal(result.status,'partial');assert.equal(h.calls.ask,1);assert.equal(h.calls.finishes[0].result,null);assert.equal(h.calls.finishes[0].reserve,250000);assert.equal(h.calls.release,1);
});
test('a persisted scan older than 24h can be resumed without repeating completed prompts',async()=>{
  const h=harness();await h.run('solairgroup.it','scheduled');await h.run('solairgroup.it','scheduled');assert.equal(h.calls.ask,1);
});
const a=(id,over={})=>({promptId:id,question:'Q'+id,intent:'non-brand',engine:'gemini',model:'m',protocol:'v1',complete:true,...over});
test('historical comparison rejects partial samples and changed model, prompt, intent or protocol',()=>{
  const first=[a('1'),a('2')];assert.equal(comparableAnswers(first,[a('2'),a('1')],2),true);
  for(const changed of [{model:'m2'},{protocol:'v2'},{question:'changed'},{intent:'brand'},{engine:'openai'},{complete:false}])assert.equal(comparableAnswers(first,[a('1',changed),a('2')],2),false);
  assert.equal(comparableAnswers(first,[a('1')],2),false);
});
test('scan resumption has no daily expiry and reservations lock both monthly and scan totals',()=>{
  const store=readFileSync(new URL('../lib/geo/store.ts',import.meta.url),'utf8');
  assert.doesNotMatch(store,/interval '24 hours'/);
  assert.match(store,/seo\.geo_budgets where id=\$\{period\.id\} for update/);
  assert.match(store,/seo\.geo_scans where id=\$\{scan\.id\} for update/);
});
