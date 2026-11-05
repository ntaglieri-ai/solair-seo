import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeScan,suggestOpportunities,citationHost} from '../lib/geo/summary.ts';
import {parseGeoSettings} from '../lib/geo/settings.ts';
const cit=(host,v='reachable')=>({url:'https://vertexaisearch.cloud.google.com/r/'+host,title:host,verification:v,finalUrl:v==='reachable'?'https://www.'+host+'/p':undefined});
const ans=(id,over={})=>({complete:true,intent:'non-brand',promptId:id,question:'Q '+id,mentioned:false,citedSolair:false,competitorsMentioned:[],citations:[],...over});
test('brand questions never count toward spontaneous discovery',()=>{
  const s=summarizeScan([ans('a'),ans('b',{mentioned:true}),ans('c',{intent:'brand',mentioned:true}),ans('d',{complete:false})],10);
  assert.equal(s.nonBrandComplete,2);assert.equal(s.nonBrandMentioned,1);assert.equal(s.brandMentioned,1);assert.equal(s.complete,3);
});
test('competitors are tallied once per prompt, most frequent first',()=>{
  const s=summarizeScan([ans('a',{competitorsMentioned:['X','Y']}),ans('b',{competitorsMentioned:['X']})],2);
  assert.deepEqual(s.competitors,[{name:'X',prompts:2},{name:'Y',prompts:1}]);
});
test('unverified Google redirects are never attributed to a domain',()=>{
  assert.equal(citationHost(cit('example.com','not_verified')),null);
  assert.equal(citationHost(cit('example.com','unreachable')),null);
  assert.equal(citationHost(cit('example.com')),'example.com');
});
test('opportunities are only "da verificare"; repeated source domains need at least two gaps',()=>{
  const list=suggestOpportunities([ans('a',{citations:[cit('portal.it'),cit('solairgroup.it')]}),ans('b',{citations:[cit('portal.it'),cit('once.it')]}),ans('c',{mentioned:true,citations:[cit('portal.it')]})]);
  assert.ok(list.every(o=>o.status==='da_verificare'&&o.checks.length>0));
  const sources=list.filter(o=>o.kind==='source_domain');
  assert.equal(sources.length,1);assert.match(sources[0].title,/portal\.it.*2 risposte/);
  assert.equal(list.filter(o=>o.kind==='prompt_gap').length,2); // c è presente: nessuna lacuna
  assert.ok(!list.some(o=>/solairgroup\.it è citato/.test(o.title)));
});
test('incomplete answers produce no opportunity',()=>{
  assert.deepEqual(suggestOpportunities([ans('a',{complete:false})]),[]);
});
test('settings validation converts USD to microdollars and rejects bad input',()=>{
  assert.deepEqual(parseGeoSettings({enabled:true,frequency:'monthly',monthlyBudgetUsd:3,scanBudgetUsd:1.5}),{enabled:true,frequency:'monthly',monthlyBudgetMicrousd:3_000_000,scanBudgetMicrousd:1_500_000});
  for(const bad of [{enabled:'sì',frequency:'monthly',monthlyBudgetUsd:3,scanBudgetUsd:1},{enabled:true,frequency:'daily',monthlyBudgetUsd:3,scanBudgetUsd:1},
    {enabled:true,frequency:'weekly',monthlyBudgetUsd:3,scanBudgetUsd:4},{enabled:true,frequency:'weekly',monthlyBudgetUsd:-1,scanBudgetUsd:0},
    {enabled:true,frequency:'weekly',monthlyBudgetUsd:1000,scanBudgetUsd:1},{enabled:true,frequency:'weekly',monthlyBudgetUsd:3,scanBudgetUsd:1,extra:1},null,[]])
    assert.throws(()=>parseGeoSettings(bad));
});
test('unresolved redirects never become a documented absence opportunity',()=>{
  for(const state of ['not_verified','unreachable','blocked'])assert.deepEqual(suggestOpportunities([ans('a',{citations:[cit('portal.it',state)]})]),[]);
});
