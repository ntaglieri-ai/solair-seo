import test from 'node:test';
import assert from 'node:assert/strict';
import { rankActions } from '../lib/report-presentation.ts';
import { gapSources } from '../lib/geo/summary.ts';
import { googleClickDirection } from '../app/data/home-overview.ts';
test('actions rank content pages first, brand queries next, the jobs page last',()=>{
  const list=[{page:'/lavora-con-noi',id:1},{page:'/',query:'solair group',id:2},{page:'/cer',id:3},{page:'/incentivi',id:4}];
  assert.deepEqual(rankActions(list).map(a=>a.id),[3,4,2,1]);
});
test('gap sources count prompts per verified host and ignore the own domain and unverified redirects',()=>{
  const c=(host,v='reachable')=>({url:'https://vertexaisearch.cloud.google.com/r/'+host,title:host,verification:v,finalUrl:'https://www.'+host+'/p'});
  const a=(id,cits,over={})=>({promptId:id,complete:true,intent:'non-brand',mentioned:false,citedSolair:false,citations:cits,...over});
  const out=gapSources([a('1',[c('a.it'),c('b.it'),c('solairgroup.it')]),a('2',[c('a.it'),c('x.it','unverified')]),a('3',[c('b.it')],{mentioned:true}),a('4',[c('a.it')],{intent:'brand'})]);
  assert.equal(out.gaps,2);
  assert.deepEqual(out.ranked.map(r=>[r.host,r.prompts]),[['a.it',2],['b.it',1]]);
});
test('the home direction uses the same five percent band as the PDF',()=>{
  const row=(cur,prev)=>({lastDate:'2026-11-05',previousComplete:true,current:{days:28,clicks:cur},previous:{days:28,clicks:prev}});
  assert.equal(googleClickDirection(row(96,100)),'flat');
  assert.equal(googleClickDirection(row(94,100)),'down');
  assert.equal(googleClickDirection(row(106,100)),'up');
});
