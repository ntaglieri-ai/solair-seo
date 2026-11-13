import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonData} from '../lib/report-documents/comparison.ts';
const period={from:'2026-11-01',to:'2026-11-03'},compare={from:'2026-10-29',to:'2026-10-31'};
const metrics=()=>({search:{truncated:false,firstIncompleteDate:null},analytics:{reliable:true,pages:[]}});
const payload=()=>({period,compare,totals:{current:{days:3},previous:{days:3}},metrics:{current:metrics(),previous:metrics()}});
test('comparisons remain empty when no previous window or only one or two days are available',()=>{
 for(const p of [{...payload(),compare:null},{...payload(),period:{from:'2026-11-02',to:'2026-11-03'}}]) {
  const r=comparisonData(p);assert.equal(r.searchReady,false);assert.equal(r.analyticsReady,false);assert.match(r.reason,/Non ci sono/);
 }
});
test('equal complete windows enable source-specific comparisons',()=>{
 const p=payload();assert.equal(comparisonData(p).searchReady,true);assert.equal(comparisonData(p).analyticsReady,true);
 p.metrics.current.search.firstIncompleteDate='2026-11-03';assert.equal(comparisonData(p).searchReady,false);assert.equal(comparisonData(p).analyticsReady,true);
 p.metrics.current.analytics.reliable=false;assert.equal(comparisonData(p).analyticsReady,false);
});
test('incomplete coverage does not become a measured decline',()=>{
 const p=payload();p.totals.previous.days=2;assert.equal(comparisonData(p).searchReady,false);
});
