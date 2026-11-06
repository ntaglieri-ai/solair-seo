import test from 'node:test';
import assert from 'node:assert/strict';
import { documentFingerprint, documentStatus, documentUrls } from '../lib/report-documents/model.ts';
const answer={complete:true,intent:'non-brand',promptId:'p',mentioned:false,citedSolair:false,competitorsMentioned:[],citations:[]};
const payload=()=>({version:'v1',siteId:'solairgroup.it',client:'Solair',generatedAt:'2026-11-06T10:00:00Z',report:{id:'seo-1',status:'complete',createdAt:'2026-11-06T08:00:00Z',data:{}},geo:{id:'geo-1',status:'done',planned:1,answers:[answer]},geoRefreshFailed:false,sourceRefreshFailed:false});
test('PDF identity is based on frozen sources, not generation time or execution mode',()=>{
 const a=payload(),b={...a,generatedAt:'2026-12-01T12:00:00Z'};assert.equal(documentFingerprint(a),documentFingerprint(b));
 for(const b of [{...a,version:'v2'},{...a,report:{...a.report,id:'seo-2'}},{...a,geo:{...a.geo,id:'geo-2'}},{...a,geoRefreshFailed:true},{...a,sourceRefreshFailed:true}])assert.notEqual(documentFingerprint(a),documentFingerprint(b));
});
test('missing or incomplete evidence remains a partial PDF, never a fabricated complete report',()=>{
 const a=payload();assert.equal(documentStatus(a),'complete');
 for(const b of [{...a,geo:null},{...a,geoRefreshFailed:true},{...a,sourceRefreshFailed:true},{...a,report:{...a.report,status:'blocked'}},{...a,geo:{...a.geo,status:'partial'}},{...a,geo:{...a.geo,planned:2}},{...a,geo:{...a.geo,answers:[{...answer,complete:false}]}}])assert.equal(documentStatus(b),'partial');
});
test('manual and automatic archives use the same persistent document and PDF URLs',()=>{
 assert.deepEqual(documentUrls('document-id'),{id:'document-id',url:'/report/documento/document-id',pdfUrl:'/api/reports/document-id/pdf'});
});
