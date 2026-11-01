import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),Module=require('node:module');
const {NextRequest}=require('next/server');
const state={lease:true,recent:false,calls:[],releases:0,fail:false};
const original=Module._load,extension=require.extensions['.ts'];
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
Module._load=function(id,...rest){
  if(id==='../../../lib/db')return {getSql:()=>async()=>state.recent?[{id:'11111111-1111-4111-8111-111111111111'}]:[]};
  if(id==='../../../lib/engine/store')return {acquireLease:async()=>state.lease?'lease':null,releaseLease:async()=>{state.releases++}};
  if(id==='../../../lib/public-collection')return {collectPublicSite:async(...args)=>{state.calls.push(args);if(state.fail)throw Error('hidden error');return {runId:'22222222-2222-4222-8222-222222222222',result:{complete:true}}}};
  return original.call(this,id,...rest);
};
const {POST}=require('../app/api/public-audit/route.ts');
Module._load=original;if(extension)require.extensions['.ts']=extension;else delete require.extensions['.ts'];
const request=(body='{}',origin='https://solair.example')=>new NextRequest('https://solair.example/api/public-audit',{method:'POST',headers:{origin,'content-type':'application/json'},body});
const reset=()=>{Object.assign(state,{lease:true,recent:false,calls:[],releases:0,fail:false})};
test('URL run accepts only the fixed public site and rejects foreign origin or additional parameters',async()=>{
  reset();assert.equal((await POST(request('{}','https://outside.example'))).status,403);
  for(const body of ['{"url":"http://127.0.0.1"}','[]','null','bad'])assert.equal((await POST(request(body))).status,400);
  assert.equal(state.calls.length,0);
  const response=await POST(request());assert.equal(response.status,200);
  assert.deepEqual(state.calls,[[{id:'solairgroup.it',home_url:'https://solairgroup.it/'},20,'manual','public-url']]);
  assert.equal(state.releases,1);
});
test('URL runs share the concurrency lease and reuse recent scans without collecting again',async()=>{
  reset();state.lease=false;assert.equal((await POST(request())).status,409);assert.equal(state.calls.length,0);
  reset();state.recent=true;const result=await (await POST(request())).json();assert.equal(result.reused,true);assert.match(result.url,/audit=1111/);assert.equal(state.calls.length,0);assert.equal(state.releases,1);
});
test('a failed URL scan releases the lease and does not claim a successful new report',async()=>{
  reset();state.fail=true;const log=console.error;console.error=()=>{};
  try{const response=await POST(request()),result=await response.json();assert.equal(response.status,503);assert.equal(result.url,undefined);assert.equal(state.releases,1);assert.doesNotMatch(JSON.stringify(result),/hidden error/);}finally{console.error=log;}
});
