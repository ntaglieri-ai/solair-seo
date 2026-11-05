import test from 'node:test';
import assert from 'node:assert/strict';
import {PILOT_PROMPTS,googleCitations,openaiCitations,citesSolair,estimatePilotUsd} from '../lib/geo-pilot/protocol.ts';
import {canReserve,accountedCost} from '../lib/geo-pilot/budget.ts';
import {sourceUrl,publicSourceAddress,checkSource} from '../lib/geo-pilot/source-check.ts';
test('source checks reject private, reserved and non-web targets before network access',async()=>{
  for(const url of ['http://127.0.0.1/','https://user:secret@example.com/','file:///etc/passwd','https://host.local/','https://example.com:444/'])assert.throws(()=>sourceUrl(url));
  for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','::ffff:127.0.0.1','2001:db8::1'])assert.equal(publicSourceAddress(address),false);
  assert.equal(publicSourceAddress('8.8.8.8'),true);
  assert.equal((await checkSource('http://127.0.0.1/')).verification,'blocked');
});
test('pilot reservations leave headroom; uncertain requests retain their full reservation',()=>{
  assert.equal(canReserve(0,250000),true);assert.equal(canReserve(3900000,250000),false);
  assert.equal(canReserve(-1,250000),false);assert.equal(canReserve(0,0),false);
  assert.equal(accountedCost(null,250000),250000);assert.equal(accountedCost(.0123456,250000),12346);
});
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
