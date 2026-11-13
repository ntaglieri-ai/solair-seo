import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { searchTotals, analyticsTotals } from '../lib/report-documents/metric-summary.ts';
import { documentFingerprint, documentStatus } from '../lib/report-documents/model.ts';
const compiled=ts.transpileModule(readFileSync(new URL('../lib/report-documents/metrics.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const current={from:'2026-10-15',to:'2026-11-11'},previous={from:'2026-09-17',to:'2026-10-14'};
function harness({gscFail=false,gaFail=false,gaConfigured=true,truncated=false}={}){
 const calls=[];
 const deps={'server-only':{},'../db':{getSql:()=>async()=>[{gsc:'sc-domain:solairgroup.it',ga4:gaConfigured?'1':null}]},
 '../gsc':{queryGscDataset:async(property,period,dimensions,dataState)=>{calls.push({source:'gsc',period,dimensions,dataState});if(gscFail)throw Error('private credentials');return {rows:[{keys:['b'],clicks:1},{keys:['a'],clicks:2}],truncated};}},
 '../ga4':{queryGa4Landing:async(property,period)=>{calls.push({source:'ga4',period});if(gaFail)throw Error('private credentials');return {pages:[],reliable:true,timeZones:['Europe/Rome'],limitations:[]};}}};
 const loaded={exports:{}};vm.runInNewContext(compiled,{module:loaded,exports:loaded.exports,require:k=>deps[k]});return {run:(previousWindow=null)=>loaded.exports.collectReportMetrics('solairgroup.it',current,previousWindow),calls};
}
test('all Google sections use the exact document dates, including scheduled comparison windows',async()=>{
 const h=harness();const r=await h.run(previous);assert.equal(h.calls.length,8);assert.ok(h.calls.filter(c=>c.source==='gsc').every(c=>c.dataState==='all'));
 for(const period of [current,previous])assert.equal(h.calls.filter(c=>JSON.stringify(c.period)===JSON.stringify(period)).length,4);
 assert.equal(r.current.search.queries[0].keys[0],'a');assert.equal(r.previous.period.to,previous.to);
});
test('failures preserve successful sources, never reuse another period or invent zero metrics',async()=>{
 for(const opts of [{gscFail:true},{gaFail:true},{gaConfigured:false}]){
  const h=harness(opts),r=await h.run();assert.equal(r.previous,null);
  assert.equal(r.current.search===null,Boolean(opts.gscFail));assert.equal(r.current.analytics===null,Boolean(opts.gaFail||opts.gaConfigured===false));
  assert.ok(r.current.limitations.length);assert.ok(!r.current.limitations.join().includes('private credentials'));
 }
});
test('truncation is retained and exposed as a source limitation',async()=>{const r=await harness({truncated:true}).run();assert.equal(r.current.search.truncated,true);assert.equal(r.current.limitations.length,1);});
test('GSC totals are derived from daily data, with weighted position and aggregate CTR',()=>{
 const r=searchTotals([{keys:['2026-10-15'],clicks:2,impressions:10,position:2},{keys:['2026-10-16'],clicks:9,impressions:90,position:8}]);
 assert.deepEqual(r,{clicks:11,impressions:100,ctr:.11,position:7.4,days:2});
});
test('GA4 separates form submissions from contact clicks and includes unattributed landing pages',()=>{
 const r=analyticsTotals({pages:[{page:'/',sessions:10,engagedSessions:6,contactEvents:5,formSubmissions:2},{page:'(not set)',sessions:2,engagedSessions:0,contactEvents:1,formSubmissions:0}]});
 assert.deepEqual(r,{sessions:12,engaged:6,contactClicks:4,forms:2,engagementRate:.5});
});
test('different Google measurements cannot reuse an older PDF fingerprint',()=>{
 const a={version:'v4',siteId:'solairgroup.it',report:{id:'1'},metrics:{current:{search:{queries:[]},analytics:null}}};
 const b=structuredClone(a);b.metrics.current.search.queries=[{keys:['solair'],clicks:1}];
 assert.notEqual(documentFingerprint(a),documentFingerprint(b));
 assert.equal(documentStatus({...a,period:null,compare:null}),'partial');
});
