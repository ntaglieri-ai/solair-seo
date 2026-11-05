// Pilota manuale dal Mac, mai richiamato dal cron o da una route pubblica.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
for (const file of ['.env.local','.env.ai.local','.env.openai.local']) process.loadEnvFile(file);
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(readFileSync(file,'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true },
}).outputText, file);
const {PILOT_PROMPTS,PILOT_VERSION,citesSolair,estimatePilotUsd}=require('../lib/geo-pilot/protocol.ts');
const {reservePilotRequest,finishPilotRequest,getPilotRequests}=require('../lib/geo-pilot/store.ts');
const {getSql}=require('../lib/db.ts');
const {hasName}=require('../lib/ai-checks.ts');
const {askGeminiWithSearch}=require('../lib/geo-pilot/adapters/gemini.ts');
const {askOpenaiWithSearch}=require('../lib/geo-pilot/adapters/openai.ts');
const run = process.argv.includes('--run');
const limitIndex=process.argv.indexOf('--limit');
const limit=limitIndex<0?20:Number(process.argv[limitIndex+1]);
if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('Limite pilota non valido.');
if(run&&(!process.env.GEMINI_API_KEY||!process.env.OPENAI_API_KEY))throw Error('Accessi del pilota mancanti.');
// Richiede scelta esplicita ad ogni avvio; non viene salvata negli env di produzione.
if(run)process.env.GEO_PAID_PILOT_ENABLED='true';
const summary = rows => ['gemini','openai'].map(engine => {
  const all=rows.filter(r=>r.engine===engine);
  const measured=all.filter(r=>r.result?.complete);
  const spontaneous=measured.filter(r=>r.result.intent==='non-brand');
  return {engine,attempted:all.length,complete:measured.length,spontaneous:spontaneous.length,
    spontaneousMentions:spontaneous.filter(r=>r.result.mentioned).length,
    spontaneousCitations:spontaneous.filter(r=>r.result.citedSolair).length,
    nativeCitations:measured.reduce((n,r)=>n+r.result.citations.length,0),
    estimatedUsd:all.reduce((n,r)=>n+(r.result?.estimatedUsd??0),0),
    uncertain:all.filter(r=>r.state!=='settled').length};
});
try {
  if(run){
    let made=0;
    for(const prompt of PILOT_PROMPTS){
      for(const engine of ['gemini','openai']){
        if(made>=limit)break;
        const reservation=await reservePilotRequest(prompt.id,engine);
        if(reservation.status==='existing')continue;
        if(reservation.status==='budget_stop'){console.log('STOP: margine di budget insufficiente.');made=limit;break;}
        made++;
        try {
          const answer=await (engine==='gemini'?askGeminiWithSearch:askOpenaiWithSearch)(prompt.text);
          const complete=answer.finishReason==='stop'&&answer.text.trim().length>=30&&answer.searches!==null&&answer.searches>0;
          const result={engine,model:answer.actualModel,protocol:PILOT_VERSION,promptId:prompt.id,question:prompt.text,
            intent:prompt.intent,collectedAt:new Date().toISOString(),answer:answer.text,complete,
            mentioned:complete?(hasName(answer.text,'Solair')||/solairgroup\.it/i.test(answer.text)):null,
            citations:answer.citations,citedSolair:citesSolair(answer.citations),searches:answer.searches,
            inputTokens:answer.inputTokens,outputTokens:answer.outputTokens,
            estimatedUsd:estimatePilotUsd(engine,answer.inputTokens,answer.outputTokens,answer.searches)};
          await finishPilotRequest(reservation.id,result,complete?null:`incomplete_${answer.finishReason}`);
          console.log(JSON.stringify({prompt:prompt.id,engine,complete,finish:answer.finishReason,searches:answer.searches,citations:answer.citations.length,estimatedUsd:result.estimatedUsd}));
        }catch(error){
          // SDK errors may include credentials and requests. Save only a narrow classification.
          const code=typeof error==='object'&&error!==null&&'statusCode' in error?`provider_http_${error.statusCode}`:'provider_or_timeout';
          await finishPilotRequest(reservation.id,null,code);
          console.log(JSON.stringify({prompt:prompt.id,engine,error:code}));
          // Stop at first provider error; never retry a potentially billed request automatically.
          made=limit;break;
        }
      }
      if(made>=limit)break;
    }
  }
  const rows=await getPilotRequests();
  await mkdir('.geo-pilot',{recursive:true,mode:0o700});
  await writeFile('.geo-pilot/results.json',JSON.stringify({protocol:PILOT_VERSION,collectedAt:new Date().toISOString(),summary:summary(rows),rows},null,2),{mode:0o600});
  console.log(JSON.stringify({summary:summary(rows),accountedUsd:rows.reduce((n,r)=>n+r.accountedMicrousd,0)/1e6}));
}finally{await getSql().end();}
