import test from 'node:test';
import assert from 'node:assert/strict';
import {publicPageReport,comparePublicPage,publicPath} from '../lib/public-report.ts';
import {clientOpportunity} from '../lib/report-language.ts';
const page={url:'https://solairgroup.it/faq',status:200,score:88,title:'FAQ Solair',description:'Risposte sul fotovoltaico',canonical:'https://solairgroup.it/faq',noindex:false,issues:[]};
test('client wording retains query-level observations without inventing missing results',()=>{
  const action={kind:'ctr',query:'impianto solare',evidence:{impressions:1500,clicks:0}};
  const before=JSON.stringify(action);
  const copy=clientOpportunity(action);
  assert.match(copy.observed,/«impianto solare»/);
  assert.match(copy.observed,/1\.?500 volte/);
  assert.match(copy.observed,/0 clic/);
  assert.equal(JSON.stringify(action),before);
  assert.doesNotMatch(clientOpportunity({...action,evidence:{}}).observed,/\d/);
});
test('public report is independent of account data and never exposes a global score',()=>{
  const result=publicPageReport({...page,clicks:123,gsc:{secret:'account'},score:2,issues:['Title fuori range (10 char) (-7)']});
  assert.equal(result.findings.length,0);
  assert.equal(result.content,null);
  for(const field of ['score','clicks','gsc','issues'])assert.equal(field in result,false);
  assert.equal(publicPageReport({...page,description:''}).findings[0].title,'Descrizione della pagina assente');
});
test('failed HTML does not invent missing metadata or successful AI checks',()=>{
  const result=publicPageReport({...page,status:503,score:null,title:'',description:''});
  assert.equal(result.findings.length,1);
  assert.equal(result.readable,false);
  assert.equal(result.noindex,null);
  assert.equal(result.content,null);
});
test('comparison retains unknown values and distinguishes genuine zero rows',()=>{
  const publicPage=publicPageReport(page);
  const evidence={gsc:{current:{pages:[]}},ga4:{current:{reliable:true,pages:[]}}};
  assert.equal(comparePublicPage(publicPage,evidence).gsc,null);
  assert.equal(comparePublicPage(publicPage,evidence).organicSessions,null);
  evidence.gsc.current.pages.push({keys:['https://www.solairgroup.it/faq/?x=y'],clicks:0,impressions:0});
  evidence.ga4.current.pages.push({page:'/faq',sessions:0});
  assert.deepEqual(comparePublicPage(publicPage,evidence).gsc,{clicks:0,impressions:0});
  assert.equal(comparePublicPage(publicPage,evidence).organicSessions,0);
  evidence.ga4.current.reliable=false;
  assert.equal(comparePublicPage(publicPage,evidence).organicSessions,null);
});
test('page correlation excludes other domains and makes no causal claim',()=>{
  assert.equal(publicPath('https://evil.it/faq'),null);
  assert.equal(publicPath('mailto:test@solairgroup.it'),null);
  const evidence={gsc:{current:{pages:[{keys:['https://solairgroup.it/faq'],clicks:10,impressions:100},{keys:['https://evil.it/faq'],clicks:900,impressions:9000}]}},ga4:null};
  const result=comparePublicPage(publicPageReport({...page,description:''}),evidence);
  assert.equal(result.gsc.clicks,10);
  assert.match(result.reading,/non dimostrano/);
});
