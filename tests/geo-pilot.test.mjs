import test from 'node:test';
import assert from 'node:assert/strict';
import {PILOT_PROMPTS,googleCitations,openaiCitations,citesSolair,estimatePilotUsd} from '../lib/geo-pilot/protocol.ts';
test('the pilot separates eight spontaneous prompts from two explicitly naming Solair',()=>{
  assert.equal(PILOT_PROMPTS.length,10);assert.equal(new Set(PILOT_PROMPTS.map(p=>p.id)).size,10);
  assert.equal(PILOT_PROMPTS.filter(p=>p.intent==='non-brand').length,8);
  assert.ok(PILOT_PROMPTS.filter(p=>p.intent==='non-brand').every(p=>!/solair/i.test(p.text)));
});
test('Google citations include only chunks referenced by native grounding supports',()=>{
  const citations=googleCitations({groundingChunks:[{web:{uri:'https://solairgroup.it/'}},{web:{uri:'https://example.com/'}}],groundingSupports:[{groundingChunkIndices:[1,1]}]});
  assert.equal(citations.length,1);assert.equal(citesSolair(citations),false);assert.equal(citations[0].verification,'not_verified');
  assert.deepEqual(googleCitations(null),[]);
});
test('OpenAI citations require native url annotations; retrieval, unsafe links and lookalike domains do not count',()=>{
  const citations=openaiCitations([{type:'source',url:'https://solairgroup.it/'},{type:'url_citation',url:'javascript:bad'},{type:'url_citation',url:'https://solairgroup.it.evil.example/'},{type:'url_citation',url:'https://example.com/?url=solairgroup.it'}]);
  assert.equal(citations.length,2);assert.equal(citesSolair(citations),false);
  assert.equal(citesSolair(openaiCitations([{type:'url_citation',url:'https://www.solairgroup.it/'}])),true);
});
test('costs remain unknown with missing usage; estimates include both tokens and searches without free allowances',()=>{
  assert.equal(estimatePilotUsd('gemini',1000,1000,2),.0308);
  assert.equal(estimatePilotUsd('openai',1000,1000,1),.01225);
  assert.equal(estimatePilotUsd('openai',null,1000,1),null);
  assert.equal(estimatePilotUsd('gemini',1000,1000,null),null);
});
