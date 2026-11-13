import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as crypto from 'node:crypto';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/report-documents/archive.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
function harness({claimed=true,status='pending',result={status:'saved',path:'Solair/Report-SolairSEO/Report.pdf'},failure=false}={}) {
 const calls={fetch:[],saved:[],retry:0};
 const sql=async(strings,...values)=>{
  const q=strings.join('?');
  if(q.includes('select document_id'))return [{id}];
  if(q.includes('select status'))return [{status,path:status==='saved'?result.path:null}];
  if(q.includes('returning document_id'))return claimed?[{document_id:id}]:[];
  if(q.includes('set status=')){calls.saved.push(values);return [];}
  if(q.includes('next_attempt_at=now()'))calls.retry++;
  return [];
 };
 const deps={'server-only':{},'node:crypto':crypto,'../db':{getSql:()=>sql},'./model':{UUID:/^[a-f0-9-]{36}$/}};
 const loaded={exports:{}};
 vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,require:k=>deps[k],Date,URL,AbortSignal,console:{error(){}},process:{env:{SOLAIR_SEO_SETTINGS_SECRET:'test-secret',CRM_URL:'https://crm.test'}},fetch:async(url,opts)=>{calls.fetch.push({url,opts});if(failure)throw Error('timeout');return {ok:true,json:async()=>result};}});
 return {api:loaded.exports,calls};
}
test('archives with a signed server request containing only the report ID',async()=>{
 const {api,calls}=harness(); const result=await api.archiveReportDocument(id);
 assert.equal(result.status,'saved');assert.equal(result.path,'Solair/Report-SolairSEO/Report.pdf');
 const {url,opts}=calls.fetch[0];assert.equal(url.href,'https://crm.test/api/auth/seo/archive');
 assert.deepEqual(JSON.parse(opts.body),{reportId:id});assert.equal(opts.method,'POST');assert.equal(opts.redirect,'error');
 assert.equal(opts.headers['x-crm-signature'],crypto.createHmac('sha256','test-secret').update(`${opts.headers['x-crm-time']}\nPOST\n/api/auth/seo/archive\n${opts.body}`).digest('hex'));
 assert.equal(calls.saved.length,1);assert.equal(calls.retry,0);
});
test('an active lease or confirmed archive cannot upload twice',async()=>{
 for(const status of ['pending','saved','skipped']){const {api,calls}=harness({claimed:false,status});assert.equal((await api.archiveReportDocument(id)).status,status);assert.equal(calls.fetch.length,0);}
});
test('failures and unconfirmed paths remain pending and release the lease for retry',async()=>{
 for(const options of [{failure:true},{result:{status:'saved'}},{result:{status:'saved',path:''}},{result:{status:'unexpected'}}]){
  const {api,calls}=harness(options);assert.equal((await api.archiveReportDocument(id)).status,'pending');assert.equal(calls.saved.length,0);assert.equal(calls.retry,1);
 }
});
test('disabled archiving is recorded without claiming a file exists',async()=>{
 const {api,calls}=harness({result:{status:'skipped'}});const result=await api.archiveReportDocument(id);assert.equal(result.status,'skipped');assert.equal(result.path,null);assert.equal(calls.saved.length,1);
});
test('scheduled retry uses the same archive-only operation',async()=>{
 const {api,calls}=harness(); const result=await api.retryPendingReportArchives();assert.equal(result[0].status,'saved');assert.equal(calls.fetch.length,1);
 await assert.rejects(api.archiveReportDocument('invalid'),/non valido/);
});
