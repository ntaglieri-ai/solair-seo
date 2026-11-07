import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),Module=require('node:module');
const {NextRequest,NextResponse}=require('next/server');
const state={machine:false,operator:false,calls:[],result:{status:'complete',measured:4,expected:4},fail:false};
const original=Module._load,extension=require.extensions['.ts'];
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
Module._load=function(id,...rest){
  if(id.endsWith('/lib/crm-auth'))return {canWriteSeo:async()=>state.operator,requireSeoApi:async(req)=>!state.operator?NextResponse.json({error:'CRM'},{status:401}):req.headers.get('origin')!==new URL(req.url).origin?NextResponse.json({error:'Origin'},{status:403}):null};
  if(id.endsWith('/lib/engine/auth'))return {authorizedEngine:()=>state.machine};
  if(id==='../../../lib/operator')return {OPERATOR_COOKIE:'solair_operator',validOperatorToken:()=>state.operator};
  if(id.endsWith('/lib/ai-collection'))return {collectAiChecks:async(...args)=>{state.calls.push(args);if(state.fail)throw Error('secret-provider-message');return state.result;}};
  return original.call(this,id,...rest);
};
const {POST}=require('../app/api/ai-checks/route.ts');
const {GET}=require('../app/api/cron/ai/route.ts');
Module._load=original;if(extension)require.extensions['.ts']=extension;else delete require.extensions['.ts'];
const request=(body='{}',origin='https://solair.example')=>new NextRequest('https://solair.example/api/ai-checks',{method:'POST',headers:{origin,'content-type':'application/json'},body});
const reset=()=>Object.assign(state,{machine:false,operator:false,calls:[],result:{status:'complete',measured:4,expected:4},fail:false});
test('AI collection is authenticated; browser mutations also require matching origin',async()=>{
  reset();assert.equal((await POST(request())).status,401);
  state.operator=true;assert.equal((await POST(request('{}','https://foreign.example'))).status,403);assert.equal(state.calls.length,0);
  const response=await POST(request());assert.equal(response.status,200);assert.deepEqual(state.calls,[['solairgroup.it','manual']]);
  assert.equal(response.headers.get('cache-control'),'no-store');
});
test('AI API accepts no prompts, domains, models or arbitrary body values',async()=>{
  reset();state.operator=true;
  for(const body of ['null','[]','bad','{"question":"invented"}','{"model":"paid-model"}','{"siteId":"other.it"}',' '.repeat(1001)])assert.equal((await POST(request(body))).status,400);
  assert.equal(state.calls.length,0);
});
test('AI collection returns rate and configuration errors without claiming a measurement',async()=>{
  reset();state.operator=true;
  for(const [status,http] of [['cooldown',429],['daily_limit',429],['already_running',409],['not_configured',503]]){
    state.result={status};const r=await POST(request());assert.equal(r.status,http);assert.ok((await r.json()).error);
  }
  state.result={status:'partial',measured:2,expected:4};assert.equal((await (await POST(request())).json()).status,'partial');
});
test('scheduled AI collection needs cron credentials and preserves its own partial status',async()=>{
  reset();const req=new NextRequest('https://solair.example/api/cron/ai');assert.equal((await GET(req)).status,401);
  state.machine=true;assert.equal((await GET(req)).status,200);assert.deepEqual(state.calls,[['solairgroup.it','cron']]);
  state.result={status:'failed'};assert.equal((await GET(req)).status,503);
  state.fail=true;const log=console.error;console.error=()=>{};
  try{const r=await POST(request());assert.equal(r.status,503);assert.doesNotMatch(JSON.stringify(await r.json()),/secret-provider/);}finally{console.error=log;}
});
