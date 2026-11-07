import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),Module=require('node:module');
const {NextRequest,NextResponse}=require('next/server');
const state={slot:true,calls:[],result:{ok:true,steps:{}},snapshot:{id:'11111111-1111-4111-8111-111111111111'},throw:false,operator:false,geoEnabled:true,geoConfigured:true};
const originalLoad=Module._load,previousExtension=require.extensions['.ts'];
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
Module._load=function(id,...rest){
  if(id.endsWith('/lib/crm-auth'))return {canWriteSeo:async()=>state.operator,requireSeoApi:async()=>state.denied?NextResponse.json({error:'CRM'},{status:state.denied}):null};
  if(id==='../../../lib/operator')return {OPERATOR_COOKIE:'solair_operator',validOperatorToken:()=>state.operator};
  if(id==='../../../lib/geo/store')return {getGeoSettings:async()=>({enabled:state.geoEnabled,engine:'gemini'})};
  if(id==='../../../lib/geo/run-scan')return {geoConfigured:()=>state.geoConfigured};
  if(id==='../../../lib/db')return {getSql:()=>async()=>state.slot?[{mode:'status'}]:[]};
  if(id==='../../../lib/engine/collect')return {getSite:async()=>({id:'solairgroup.it'})};
  if(id==='../../../lib/engine/store')return {getLastSnapshot:async()=>state.snapshot};
  if(id==='../../../lib/engine/run')return {runEngine:async(site,options)=>{state.calls.push({site,options});if(state.throw)throw new Error('private-provider-error');return state.result;}};
  return originalLoad.call(this,id,...rest);
};
const {POST}=require('../app/api/home-run/route.ts');
Module._load=originalLoad;
if(previousExtension)require.extensions['.ts']=previousExtension;else delete require.extensions['.ts'];
function request(body,origin='https://solair.example'){
  return new NextRequest('https://solair.example/api/home-run',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
}
function reset(){state.slot=true;state.calls=[];state.result={ok:true,steps:{}};state.throw=false;state.operator=false;state.geoEnabled=true;state.geoConfigured=true;}
test('home run rejects cross-origin requests and arbitrary sites or operations before running the engine',async()=>{
  reset();assert.equal((await POST(request({mode:'status'},'https://outside.example'))).status,403);
  for(const body of [{mode:'status',siteId:'other.com'},{mode:'unknown'},null,[],{mode:'analysis',force:true}])assert.equal((await POST(request(body))).status,400);
  assert.equal(state.calls.length,0);
});
test('home run always forces the fixed site and preserves partial collection status',async()=>{
  reset();state.result={ok:false,errors:['ga4'],steps:{}};
  const response=await POST(request({mode:'status'})),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.partial,true);assert.equal(data.url,'/current-status');
  assert.deepEqual(state.calls,[{site:{id:'solairgroup.it'},options:{force:true,trigger:'manual',mode:'status'}}]);
});
test('analysis opens the stored report identity and repeated or concurrent requests do not claim success',async()=>{
  reset();const data=await (await POST(request({mode:'analysis'}))).json();assert.equal(data.url,'/analisi?id='+state.snapshot.id);
  state.slot=false;state.calls=[];assert.equal((await POST(request({mode:'status'}))).status,429);assert.equal(state.calls.length,0);
  reset();state.result={ok:true,skipped:'already_running'};assert.equal((await POST(request({mode:'analysis'}))).status,409);
});
test('an engine failure does not redirect to an old report as though the new run succeeded',async()=>{
  reset();state.throw=true;const log=console.error;console.error=()=>{};
  try{const r=await POST(request({mode:'analysis'})),data=await r.json();assert.equal(r.status,503);assert.equal(data.url,undefined);assert.ok(!JSON.stringify(data).includes('private-provider-error'));}finally{console.error=log;}
});

const counts={lease:0,gsc:0,ga4:0,evidence:0,release:0};
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
Module._load=function(id,...rest){
  if(id==='server-only')return {};
  if(id==='../db')return {getSql:()=>async()=>[]};
  if(id==='./store')return {getEngineSettings:async()=>({enabled:false,windowDays:28,lagDays:3}),acquireLease:async()=>{counts.lease++;return 'test';},getEngineInputs:async()=>({evidence:null,technical:null}),getLastSnapshot:async()=>null,releaseLease:async()=>{counts.release++;}};
  if(id==='./collect')return {collectGsc:async()=>{counts.gsc++;return {result:{}};},collectGa4:async()=>{counts.ga4++;return {result:{}};}};
  if(id==='./evidence')return {collectEvidence:async()=>{counts.evidence++;return {result:{sourceErrors:[]}};}};
  if(id==='./read')return {getLatestRuns:async()=>({})};
  if(id==='./crawl')return {crawlSite:()=>{throw new Error('Status must not crawl');}};
  if(id==='../research-store')return {collectMarket:()=>{throw new Error('Status must not scan competitors');}};
  return originalLoad.call(this,id,...rest);
};
const {runEngine}=require('../lib/engine/run.ts');
Module._load=originalLoad;
if(previousExtension)require.extensions['.ts']=previousExtension;else delete require.extensions['.ts'];
test('manual status still works with automation paused, refreshes sources and does not run site analysis',async()=>{
  const site={id:'solairgroup.it',ga4_property:'test'};
  assert.equal((await runEngine(site,{trigger:'cron'})).skipped,'disabled');assert.equal(counts.lease,0);
  const result=await runEngine(site,{trigger:'manual',force:true,mode:'status'});
  assert.equal(result.ok,true);assert.deepEqual(counts,{lease:1,gsc:1,ga4:1,evidence:1,release:1});assert.equal(result.steps.analysis,undefined);
});

test('home offers the paid Gemini continuation only to authenticated operators when the site and provider are enabled',async()=>{
  reset();assert.equal((await (await POST(request({mode:'analysis'}))).json()).geoAvailable,false);
  state.operator=true;assert.equal((await (await POST(request({mode:'analysis'}))).json()).geoAvailable,true);
  state.geoEnabled=false;assert.equal((await (await POST(request({mode:'analysis'}))).json()).geoAvailable,false);
  state.geoEnabled=true;state.geoConfigured=false;assert.equal((await (await POST(request({mode:'analysis'}))).json()).geoAvailable,false);
});

test('CRM denial prevents any collection, including same-origin browser requests',async()=>{
  reset();
  for(const status of [401,403,503]){
    state.denied=status;
    assert.equal((await POST(request({mode:"analysis"}))).status,status);
  }
  assert.equal(state.calls.length,0);state.denied=0;
});
