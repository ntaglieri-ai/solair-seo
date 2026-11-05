import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_MODEL,AI_PROTOCOL,completedAiAnswer,failedAiAnswer,aiSample,comparableAiBatch,hasName} from '../lib/ai-checks.ts';
const question='Quali aziende installano impianti fotovoltaici in Italia?';
const when='2026-11-05T08:00:00.000Z';
test('real answer analysis counts a name, including a negative mention, without claiming a recommendation',()=>{
  const result=completedAiAnswer(question,'Non posso raccomandare Solair Group. Puoi confrontare Enpal e Otovo senza attribuire una copertura nazionale non verificata.',['Enpal','Otovo'],when,'stop');
  assert.equal(result.status,'ok');assert.equal(result.mentionsBrand,true);assert.deepEqual(result.mentionedCompetitors,['Enpal','Otovo']);
  assert.equal(hasName('Solairia ed Enpalissimo','Solair'),false);
  assert.equal(completedAiAnswer(question,'È utile confrontare più aziende prima di chiedere un preventivo.',['Enpal'],when,'stop').mentionsBrand,false);
  assert.equal(hasName('A2A è un nome citato.','A2A'),true);
  assert.equal(hasName('Nome (Italia)','Nome (Italia)'),true);
});
test('truncated, blocked, empty and timed out answers are unmeasured, never a negative finding',()=>{
  for(const finish of ['length','content-filter','error'])assert.equal(completedAiAnswer(question,'Solair Group è presente in questo testo che però risulta incompleto.',[],when,finish).mentionsBrand,null);
  assert.equal(completedAiAnswer(question,'',[],when,'stop').status,'error');
  const missing=failedAiAnswer(question,'timeout',when);
  const batch={questions:[question],results:[missing],status:'failed'};
  assert.deepEqual(aiSample(batch),{expected:1,measured:0,mentioned:0});assert.equal(missing.mentionsBrand,null);
});
test('only complete batches using the identical protocol, model and question set can be compared',()=>{
  const complete={model:AI_MODEL,protocol:AI_PROTOCOL,status:'complete',questions:[question],results:[]};
  assert.equal(comparableAiBatch(complete,{...complete}),true);
  for(const patch of [{model:'another-model'},{protocol:'different-prompt'},{status:'partial'},{questions:['Una domanda differente?']}])assert.equal(comparableAiBatch(complete,{...complete,...patch}),false);
});
