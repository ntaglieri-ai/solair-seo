import test from 'node:test';
import assert from 'node:assert/strict';
import { renderReportPdf } from '../lib/report-documents/render.ts';
const totals=(clicks,impressions)=>({clicks,impressions,ctr:.1,position:7});
const base=(over={})=>({version:'solair-report-pdf-v2',siteId:'solairgroup.it',client:'Solair',generatedAt:'2026-11-06T10:00:00Z',
  report:{id:'11111111-2222-3333-4444-555555555555',status:'complete',createdAt:'2026-11-06T08:00:00Z',data:{
    windows:{current:{from:'2026-10-07',to:'2026-11-03'},previous:{from:'2026-09-09',to:'2026-10-06'}},
    summary:{current:totals(255,2307),previous:totals(257,2391)},opportunities:[],limitations:[]}},
  geo:null,geoRefreshFailed:false,sourceRefreshFailed:false,...over});
const pages=buffer=>(buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g)??[]).length;
test('the PDF renders for a measured report without Gemini data and with or without a baseline',async()=>{
  for(const payload of [base(),base({baseline:{from:'2026-08-10',to:'2026-09-06',clicks:121}})]){
    const pdf=await renderReportPdf(payload);
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pages(pdf)>=3);
  }
});
test('a blocked report renders without fabricating figures',async()=>{
  const payload=base();payload.report.status='blocked';payload.report.data={windows:null,summary:null,opportunities:[],limitations:['Nessuna raccolta']};
  assert.equal((await renderReportPdf(payload)).subarray(0,5).toString(),'%PDF-');
});
test('the PDF renders with Gemini answers, sources and typed opportunities',async()=>{
  const cit=host=>({url:'https://vertexaisearch.cloud.google.com/r/'+host,title:host,verification:'reachable',finalUrl:'https://www.'+host+'/p'});
  const answers=['a','b','c'].map((id,i)=>({engine:'gemini',model:'m',protocol:'v1',promptId:id,question:'Domanda '+id,intent:i===2?'brand':'non-brand',collectedAt:'2026-11-05T20:00:00Z',answer:'x',complete:true,mentioned:i===2,citations:[cit('portale.it'),cit(i===2?'solairgroup.it':'altro.it')],citedSolair:i===2,competitorsMentioned:i===0?['Enpal']:[]}));
  const payload=base({geo:{id:'g',status:'done',model:'m',protocol:'v1',planned:3,startedAt:'2026-11-05T20:00:00Z',answers}});
  payload.report.data.opportunities=[{id:'x',title:'Titolo',page:'/',priority:'high',interpretation:'perché',action:'azione',expectedOutcome:'atteso',evidence:{basis:'riscontro',publicSources:['https://solairgroup.it/cer: dettaglio']}}];
  const pdf=await renderReportPdf(payload);assert.ok(pages(pdf)>=4);
});
test('the PDF renders for start-up, monthly and update payloads',async()=>{
  const period={from:'2026-10-07',to:'2026-11-03',days:28,archivedDays:28},compare={from:'2026-09-01',to:'2026-09-30',days:30,archivedDays:30};
  const common={report:base().report};
  for(const extra of [{kind:'startup',period,compare:null,totals:{current:totals(255,2307),previous:null}},
    {kind:'monthly',period,compare,totals:{current:totals(255,2307),previous:totals(257,2391)},baseline:{from:'2026-08-10',to:'2026-09-06',clicks:121,days:28}},
    {kind:'update',period:{...period,days:5,archivedDays:5},compare:null,totals:{current:totals(40,300),previous:null}}]){
    const pdf=await renderReportPdf({...base(),...common,...extra});
    assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.ok(pages(pdf)>=3);
  }
});
