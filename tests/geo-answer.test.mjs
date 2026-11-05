import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGeoAnswer,withVerifiedCitations,pendingVerification,errorCode} from '../lib/geo/answer.ts';
const prompt={id:'national',intent:'non-brand',text:'Domanda?'};
const raw=(over={})=>({text:'Solair Group è citata insieme a Sunrock e altri installatori.',finishReason:'stop',actualModel:'m',citations:[],searches:1,inputTokens:1000,outputTokens:500,...over});
test('mention and competitors are detected deterministically only on complete answers',()=>{
  const a=buildGeoAnswer('gemini',prompt,raw(),'v1',['Sunrock','Altro']);
  assert.equal(a.complete,true);assert.equal(a.mentioned,true);assert.deepEqual(a.competitorsMentioned,['Sunrock']);
  const b=buildGeoAnswer('gemini',prompt,raw({finishReason:'length'}),'v1',['Sunrock']);
  assert.equal(b.complete,false);assert.equal(b.mentioned,null);assert.deepEqual(b.competitorsMentioned,[]);
  assert.equal(buildGeoAnswer('gemini',prompt,raw({searches:0}),'v1',[]).complete,false);
  assert.equal(buildGeoAnswer('gemini',prompt,raw({searches:null}),'v1',[]).complete,false);
});
test('unknown usage keeps the cost unknown, not zero',()=>{
  assert.equal(buildGeoAnswer('gemini',prompt,raw({inputTokens:null}),'v1',[]).estimatedUsd,null);
});
test('Google redirects count as Solair only after verification resolves the real destination',()=>{
  const redirect='https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc';
  const a=buildGeoAnswer('gemini',prompt,raw({citations:[{url:redirect,title:'solairgroup.it',verification:'not_verified'}]}),'v1',[]);
  assert.equal(a.citedSolair,false);assert.deepEqual(pendingVerification([a]),[redirect]);
  const v=withVerifiedCitations(a,new Map([[redirect,{verification:'reachable',finalUrl:'https://www.solairgroup.it/'}]]));
  assert.equal(v.citedSolair,true);assert.deepEqual(pendingVerification([v]),[]);
});
test('provider errors are classified without leaking SDK details',()=>{
  assert.equal(errorCode({statusCode:429,message:'secret key abc'}),'provider_http_429');
  assert.equal(errorCode(new Error('boom sk-123')),'provider_or_timeout');
});
